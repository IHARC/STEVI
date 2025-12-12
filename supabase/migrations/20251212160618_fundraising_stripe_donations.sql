begin;

create type donations.donation_subscription_status as enum (
  'active',
  'canceled',
  'past_due',
  'unpaid',
  'incomplete',
  'incomplete_expired',
  'trialing'
);

create type donations.stripe_webhook_event_status as enum (
  'succeeded',
  'failed'
);

create table donations.donors (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  address jsonb,
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint donors_email_format check (position('@' in email) > 1),
  constraint donors_email_lowercase check (email = lower(email))
);

create unique index donors_email_unique on donations.donors(email);
create unique index donors_stripe_customer_id_unique on donations.donors(stripe_customer_id)
  where stripe_customer_id is not null;

create table donations.donation_subscriptions (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid not null references donations.donors(id) on delete restrict,
  status donations.donation_subscription_status not null default 'incomplete',
  currency text not null default 'CAD',
  amount_cents integer not null check (amount_cents > 0),
  stripe_subscription_id text not null,
  stripe_price_id text not null,
  started_at timestamptz,
  canceled_at timestamptz,
  last_invoice_status text,
  last_payment_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index donation_subscriptions_stripe_subscription_id_unique on donations.donation_subscriptions(stripe_subscription_id);

create table donations.donation_intent_items (
  id uuid primary key default gen_random_uuid(),
  donation_intent_id uuid not null references donations.donation_intents(id) on delete cascade,
  catalog_item_id uuid not null references donations.catalog_items(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_amount_cents integer not null check (unit_amount_cents >= 0),
  line_amount_cents integer not null check (line_amount_cents >= 0),
  created_at timestamptz not null default now()
);

create index donation_intent_items_intent_id_idx on donations.donation_intent_items(donation_intent_id);

create table donations.stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null,
  type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  status donations.stripe_webhook_event_status,
  error text
);

create unique index stripe_webhook_events_stripe_event_id_unique on donations.stripe_webhook_events(stripe_event_id);

create table donations.stripe_amount_prices (
  currency text not null,
  interval text not null,
  amount_cents integer not null check (amount_cents > 0),
  stripe_price_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (currency, interval, amount_cents),
  constraint stripe_amount_prices_interval_check check (interval in ('month'))
);

create unique index stripe_amount_prices_stripe_price_id_unique on donations.stripe_amount_prices(stripe_price_id);

create table donations.stripe_products (
  key text primary key,
  stripe_product_id text not null unique,
  created_at timestamptz not null default now()
);

create table donations.donor_manage_tokens (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid not null references donations.donors(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz
);

create index donor_manage_tokens_donor_id_idx on donations.donor_manage_tokens(donor_id);

create table donations.rate_limit_logs (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  identifier text not null,
  created_at timestamptz not null default now()
);

create index rate_limit_logs_lookup_idx on donations.rate_limit_logs(event, identifier, created_at desc);

create or replace function donations.donations_check_rate_limit(
  p_event text,
  p_identifier text,
  p_limit integer,
  p_window_ms integer default 300000,
  p_cooldown_ms integer default null
)
returns table(allowed boolean, retry_in_ms integer)
language plpgsql
security definer
set search_path to 'donations', 'public'
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_window_start timestamptz := v_now - make_interval(secs => (p_window_ms / 1000.0));
  v_total integer := 0;
  v_oldest timestamptz;
  v_latest timestamptz;
  v_retry_ms integer := 0;
  v_allowed boolean := true;
  v_remaining numeric := 0;
begin
  if p_event is null or length(p_event) < 1 then
    raise exception 'Invalid event';
  end if;

  if p_identifier is null or length(p_identifier) < 8 then
    raise exception 'Invalid identifier';
  end if;

  if p_limit is null or p_limit < 1 then
    raise exception 'Invalid rate limit';
  end if;

  if p_window_ms is null or p_window_ms < 1000 then
    raise exception 'Invalid window';
  end if;

  select count(*), min(created_at), max(created_at)
    into v_total, v_oldest, v_latest
  from donations.rate_limit_logs
  where event = p_event
    and identifier = p_identifier
    and created_at >= v_window_start;

  if v_total >= p_limit then
    v_allowed := false;
    if v_oldest is not null then
      v_remaining := p_window_ms - ((extract(epoch from (v_now - v_oldest))) * 1000.0);
      if v_remaining > 0 then
        v_retry_ms := greatest(v_retry_ms, ceil(v_remaining)::integer);
      end if;
    end if;
  end if;

  if p_cooldown_ms is not null and p_cooldown_ms > 0 and v_latest is not null then
    v_remaining := p_cooldown_ms - ((extract(epoch from (v_now - v_latest))) * 1000.0);
    if v_remaining > 0 then
      v_allowed := false;
      v_retry_ms := greatest(v_retry_ms, ceil(v_remaining)::integer);
    end if;
  end if;

  if v_allowed then
    insert into donations.rate_limit_logs(event, identifier, created_at)
    values (p_event, p_identifier, v_now);
  end if;

  if v_retry_ms < 0 then
    v_retry_ms := 0;
  end if;

  return query select v_allowed, v_retry_ms;
end;
$$;

revoke all on function donations.donations_check_rate_limit(text,text,integer,integer,integer) from public;
grant execute on function donations.donations_check_rate_limit(text,text,integer,integer,integer) to service_role;

alter table donations.catalog_items
  add column stripe_product_id text;

alter table donations.donation_intents
  drop column items,
  drop column donor_email;

alter table donations.donation_intents
  add column donor_id uuid references donations.donors(id),
  add column custom_amount_cents integer not null default 0;

alter table donations.donation_intents
  add constraint donation_intents_amount_check check (total_amount_cents >= 0 and custom_amount_cents >= 0);

create unique index donation_intents_stripe_session_id_unique on donations.donation_intents(stripe_session_id)
  where stripe_session_id is not null;

alter table donations.donation_payments
  alter column donation_intent_id drop not null;

alter table donations.donation_payments
  add column donation_subscription_id uuid references donations.donation_subscriptions(id),
  add column provider_invoice_id text,
  add column provider_charge_id text;

alter table donations.donation_payments
  add constraint donation_payments_parent_check check (num_nonnulls(donation_intent_id, donation_subscription_id) = 1);

create unique index donation_payments_provider_payment_id_unique on donations.donation_payments(provider_payment_id)
  where provider_payment_id is not null;
create unique index donation_payments_provider_invoice_id_unique on donations.donation_payments(provider_invoice_id)
  where provider_invoice_id is not null;
create unique index donation_payments_provider_charge_id_unique on donations.donation_payments(provider_charge_id)
  where provider_charge_id is not null;

alter table donations.donors enable row level security;
create policy donors_admin_read on donations.donors
  for select
  to authenticated
  using (check_iharc_admin_role());
create policy donors_service_role on donations.donors
  for all
  to service_role
  using (true)
  with check (true);

alter table donations.donation_subscriptions enable row level security;
create policy donation_subscriptions_admin_read on donations.donation_subscriptions
  for select
  to authenticated
  using (check_iharc_admin_role());
create policy donation_subscriptions_service_role on donations.donation_subscriptions
  for all
  to service_role
  using (true)
  with check (true);

alter table donations.donation_intent_items enable row level security;
create policy donation_intent_items_admin_read on donations.donation_intent_items
  for select
  to authenticated
  using (check_iharc_admin_role());
create policy donation_intent_items_service_role on donations.donation_intent_items
  for all
  to service_role
  using (true)
  with check (true);

alter table donations.stripe_webhook_events enable row level security;
create policy stripe_webhook_events_admin_read on donations.stripe_webhook_events
  for select
  to authenticated
  using (check_iharc_admin_role());
create policy stripe_webhook_events_service_role on donations.stripe_webhook_events
  for all
  to service_role
  using (true)
  with check (true);

alter table donations.stripe_amount_prices enable row level security;
create policy stripe_amount_prices_admin_read on donations.stripe_amount_prices
  for select
  to authenticated
  using (check_iharc_admin_role());
create policy stripe_amount_prices_service_role on donations.stripe_amount_prices
  for all
  to service_role
  using (true)
  with check (true);

alter table donations.stripe_products enable row level security;
create policy stripe_products_admin_read on donations.stripe_products
  for select
  to authenticated
  using (check_iharc_admin_role());
create policy stripe_products_service_role on donations.stripe_products
  for all
  to service_role
  using (true)
  with check (true);

alter table donations.donor_manage_tokens enable row level security;
create policy donor_manage_tokens_service_role on donations.donor_manage_tokens
  for all
  to service_role
  using (true)
  with check (true);

alter table donations.rate_limit_logs enable row level security;
create policy rate_limit_logs_service_role on donations.rate_limit_logs
  for all
  to service_role
  using (true)
  with check (true);

commit;
