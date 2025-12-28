-- Costing ledger and reporting (STEVI)

create schema if not exists analytics;

-- Enums
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'core'
      AND t.typname = 'cost_source_type_enum'
  ) THEN
    CREATE TYPE core.cost_source_type_enum AS ENUM (
      'activity',
      'distribution',
      'inventory_tx',
      'appointment',
      'manual',
      'external'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'core'
      AND t.typname = 'cost_entry_type_enum'
  ) THEN
    CREATE TYPE core.cost_entry_type_enum AS ENUM (
      'direct',
      'replacement_value',
      'overhead'
    );
  END IF;
END $$;

-- Core tables
create table if not exists core.cost_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz null,
  created_by uuid null,
  updated_by uuid null
);

create table if not exists core.cost_events (
  id uuid primary key default gen_random_uuid(),
  person_id bigint null references core.people(id) on delete set null,
  organization_id bigint not null references core.organizations(id) on delete restrict,
  source_type core.cost_source_type_enum not null,
  source_id text null,
  occurred_at timestamptz not null,
  cost_amount numeric(14,2) not null,
  currency text not null default 'CAD',
  quantity numeric(12,3) null,
  unit_cost numeric(12,4) null,
  uom text null,
  cost_category_id uuid null references core.cost_categories(id) on delete set null,
  entry_type core.cost_entry_type_enum not null default 'direct',
  metadata jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz null,
  created_by uuid null,
  updated_by uuid null
);

create index if not exists cost_events_person_id_idx on core.cost_events (person_id);
create index if not exists cost_events_org_id_idx on core.cost_events (organization_id);
create index if not exists cost_events_occurred_at_idx on core.cost_events (occurred_at);
create index if not exists cost_events_category_idx on core.cost_events (cost_category_id);
create index if not exists cost_events_source_idx on core.cost_events (source_type, source_id);

create table if not exists core.cost_dimensions (
  id uuid primary key default gen_random_uuid(),
  dimension_type text not null,
  name text not null,
  description text null,
  created_at timestamptz not null default now()
);

create unique index if not exists cost_dimensions_unique on core.cost_dimensions (dimension_type, name);

create table if not exists core.cost_event_dimensions (
  cost_event_id uuid not null references core.cost_events(id) on delete cascade,
  dimension_id uuid not null references core.cost_dimensions(id) on delete cascade,
  primary key (cost_event_id, dimension_id)
);

create table if not exists core.staff_rates (
  id uuid primary key default gen_random_uuid(),
  org_id bigint not null references core.organizations(id) on delete cascade,
  role_name text not null,
  hourly_rate numeric(12,2) not null,
  effective_from date not null default current_date,
  effective_to date null,
  created_at timestamptz not null default now()
);

create index if not exists staff_rates_org_role_idx on core.staff_rates (org_id, role_name, effective_from);

create table if not exists core.service_catalog (
  id uuid primary key default gen_random_uuid(),
  service_code text not null unique,
  label text not null,
  unit_cost numeric(12,2) not null,
  unit_type text not null,
  default_category_id uuid null references core.cost_categories(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Inventory provenance updates for cost org attribution
alter table inventory.distributions
  add column if not exists provider_org_id bigint references core.organizations(id) on delete set null;

create index if not exists distributions_provider_org_idx on inventory.distributions (provider_org_id);

-- Permissions
insert into core.permissions (name, description, domain, category, created_by, updated_by)
values
  ('cost.view', 'View cost events and summaries', 'cost', 'cost', null, null),
  ('cost.manage', 'Manage cost events, rates, and services', 'cost', 'cost', null, null),
  ('cost.report', 'Access cost reporting dashboards', 'cost', 'cost', null, null),
  ('cost.admin', 'Administer cost categories and dimensions', 'cost', 'cost', null, null)
on conflict (name) do nothing;

with permission_map(template_name, permission_name) as (
  values
    ('iharc_staff', 'cost.view'),
    ('iharc_staff', 'cost.manage'),
    ('iharc_staff', 'cost.report'),
    ('iharc_supervisor', 'cost.view'),
    ('iharc_supervisor', 'cost.manage'),
    ('iharc_supervisor', 'cost.report'),
    ('iharc_supervisor', 'cost.admin'),
    ('org_admin', 'cost.view'),
    ('org_admin', 'cost.manage'),
    ('org_admin', 'cost.report'),
    ('org_rep', 'cost.view'),
    ('org_rep', 'cost.manage')
)
insert into core.role_template_permissions (template_id, permission_id, created_at, updated_at)
select rt.id, p.id, now(), now()
from permission_map pm
join core.role_templates rt on rt.name = pm.template_name
join core.permissions p on p.name = pm.permission_name
on conflict do nothing;

with permission_map(template_name, permission_name) as (
  values
    ('iharc_staff', 'cost.view'),
    ('iharc_staff', 'cost.manage'),
    ('iharc_staff', 'cost.report'),
    ('iharc_supervisor', 'cost.view'),
    ('iharc_supervisor', 'cost.manage'),
    ('iharc_supervisor', 'cost.report'),
    ('iharc_supervisor', 'cost.admin'),
    ('org_admin', 'cost.view'),
    ('org_admin', 'cost.manage'),
    ('org_admin', 'cost.report'),
    ('org_rep', 'cost.view'),
    ('org_rep', 'cost.manage')
)
insert into core.org_role_permissions (org_role_id, permission_id, created_at, updated_at)
select r.id, p.id, now(), now()
from permission_map pm
join core.role_templates rt on rt.name = pm.template_name
join core.org_roles r on r.template_id = rt.id
join core.permissions p on p.name = pm.permission_name
on conflict do nothing;

-- Seed cost categories
insert into core.cost_categories (name, description)
values
  ('supplies', 'Direct cost of distributed supplies'),
  ('staff_time', 'Staff time and labor costs'),
  ('services', 'Service catalog unit costs'),
  ('appointments', 'Appointment delivery costs'),
  ('referrals', 'Referral coordination costs'),
  ('overhead', 'Overhead or administrative allocation')
on conflict (name) do nothing;

-- RLS policies
alter table core.cost_events enable row level security;

create policy cost_events_select_policy on core.cost_events
  for select
  using (
    core.is_global_admin()
    or is_iharc_user()
    or (
      organization_id = portal.actor_org_id()
      and (
        public.has_permission_single('cost.view')
        or public.has_permission_single('cost.report')
      )
    )
    or (
      person_id is not null and
      exists (
        select 1
        from core.person_access_grants g
        where g.person_id = cost_events.person_id
          and (
            g.grantee_user_id = auth.uid()
            or (g.grantee_org_id is not null and core.is_org_member(g.grantee_org_id, auth.uid()))
          )
          and (g.expires_at is null or g.expires_at > now())
          and (
            (g.grantee_user_id = auth.uid() and portal.actor_org_id() is null)
            or core.fn_person_consent_allows_org(cost_events.person_id, portal.actor_org_id())
          )
      )
    )
  );

create policy cost_events_insert_policy on core.cost_events
  for insert
  with check (
    core.is_global_admin()
    or is_iharc_user()
    or (
      organization_id = portal.actor_org_id()
      and public.has_permission_single('cost.manage')
    )
  );

create policy cost_events_update_policy on core.cost_events
  for update
  using (
    core.is_global_admin()
    or is_iharc_user()
    or (
      organization_id = portal.actor_org_id()
      and public.has_permission_single('cost.manage')
    )
  );

alter table core.cost_categories enable row level security;

create policy cost_categories_select_policy on core.cost_categories
  for select
  using (
    core.is_global_admin()
    or is_iharc_user()
    or public.has_permission_single('cost.view')
    or public.has_permission_single('cost.report')
  );

create policy cost_categories_manage_policy on core.cost_categories
  for insert
  with check (
    core.is_global_admin()
    or public.has_permission_single('cost.admin')
  );

create policy cost_categories_update_policy on core.cost_categories
  for update
  using (
    core.is_global_admin()
    or public.has_permission_single('cost.admin')
  );

alter table core.cost_dimensions enable row level security;

create policy cost_dimensions_select_policy on core.cost_dimensions
  for select
  using (
    core.is_global_admin()
    or is_iharc_user()
    or public.has_permission_single('cost.view')
    or public.has_permission_single('cost.report')
  );

create policy cost_dimensions_manage_policy on core.cost_dimensions
  for insert
  with check (
    core.is_global_admin()
    or public.has_permission_single('cost.admin')
  );

create policy cost_dimensions_update_policy on core.cost_dimensions
  for update
  using (
    core.is_global_admin()
    or public.has_permission_single('cost.admin')
  );

alter table core.cost_event_dimensions enable row level security;

create policy cost_event_dimensions_select_policy on core.cost_event_dimensions
  for select
  using (
    exists (
      select 1
      from core.cost_events ce
      where ce.id = cost_event_dimensions.cost_event_id
        and (
          core.is_global_admin()
          or is_iharc_user()
          or (
            ce.organization_id = portal.actor_org_id()
            and (
              public.has_permission_single('cost.view')
              or public.has_permission_single('cost.report')
            )
          )
          or (
            ce.person_id is not null and
            exists (
              select 1
              from core.person_access_grants g
              where g.person_id = ce.person_id
                and (
                  g.grantee_user_id = auth.uid()
                  or (g.grantee_org_id is not null and core.is_org_member(g.grantee_org_id, auth.uid()))
                )
                and (g.expires_at is null or g.expires_at > now())
                and (
                  (g.grantee_user_id = auth.uid() and portal.actor_org_id() is null)
                  or core.fn_person_consent_allows_org(ce.person_id, portal.actor_org_id())
                )
            )
          )
        )
    )
  );

create policy cost_event_dimensions_manage_policy on core.cost_event_dimensions
  for insert
  with check (
    exists (
      select 1
      from core.cost_events ce
      where ce.id = cost_event_dimensions.cost_event_id
        and (
          core.is_global_admin()
          or is_iharc_user()
          or (
            ce.organization_id = portal.actor_org_id()
            and public.has_permission_single('cost.manage')
          )
        )
    )
  );

alter table core.staff_rates enable row level security;

create policy staff_rates_select_policy on core.staff_rates
  for select
  using (
    core.is_global_admin()
    or is_iharc_user()
    or (
      org_id = portal.actor_org_id()
      and (
        public.has_permission_single('cost.view')
        or public.has_permission_single('cost.report')
      )
    )
  );

create policy staff_rates_manage_policy on core.staff_rates
  for insert
  with check (
    core.is_global_admin()
    or (
      org_id = portal.actor_org_id()
      and public.has_permission_single('cost.manage')
    )
  );

create policy staff_rates_update_policy on core.staff_rates
  for update
  using (
    core.is_global_admin()
    or (
      org_id = portal.actor_org_id()
      and public.has_permission_single('cost.manage')
    )
  );

alter table core.service_catalog enable row level security;

create policy service_catalog_select_policy on core.service_catalog
  for select
  using (
    core.is_global_admin()
    or is_iharc_user()
    or (
      public.has_permission_single('cost.view')
      or public.has_permission_single('cost.report')
    )
  );

create policy service_catalog_manage_policy on core.service_catalog
  for insert
  with check (
    core.is_global_admin()
    or public.has_permission_single('cost.manage')
  );

create policy service_catalog_update_policy on core.service_catalog
  for update
  using (
    core.is_global_admin()
    or public.has_permission_single('cost.manage')
  );

-- Inventory distribution -> cost event trigger
create or replace function core.fn_create_cost_event_from_distribution()
returns trigger
language plpgsql
security definer
set search_path = core, inventory, donations, public
as $$
declare
  v_person_id bigint;
  v_org_id bigint;
  v_occurred_at timestamptz;
  v_unit_cost numeric;
  v_uom text;
  v_category_id uuid;
  v_currency text;
  v_created_by uuid;
begin
  select
    d.person_id,
    coalesce(d.provider_org_id, it.provider_organization_id),
    d.created_at,
    i.unit_type,
    coalesce(new.unit_cost, i.cost_per_unit, (ci.unit_cost_cents::numeric / 100.0)),
    coalesce(ci.currency, 'CAD'),
    coalesce(new.created_by, d.created_by, it.created_by)
  into v_person_id, v_org_id, v_occurred_at, v_uom, v_unit_cost, v_currency, v_created_by
  from inventory.distributions d
  join core.items i on i.id = new.item_id
  left join donations.catalog_items ci on ci.inventory_item_id = i.id and ci.is_active = true
  left join inventory.inventory_transactions it on it.ref_id = new.distribution_id
  where d.id = new.distribution_id
  limit 1;

  if v_org_id is null then
    raise exception 'Provider organization is required for distribution cost events.';
  end if;

  if v_unit_cost is null then
    raise exception 'Unit cost is required for distribution cost events.';
  end if;

  select id into v_category_id
  from core.cost_categories
  where name = 'supplies'
  limit 1;

  if v_category_id is null then
    raise exception 'Cost category "supplies" is missing.';
  end if;

  insert into core.cost_events (
    person_id,
    organization_id,
    source_type,
    source_id,
    occurred_at,
    cost_amount,
    currency,
    quantity,
    unit_cost,
    uom,
    cost_category_id,
    metadata,
    created_by
  )
  values (
    v_person_id,
    v_org_id,
    'distribution',
    new.id::text,
    coalesce(v_occurred_at, now()),
    (new.qty::numeric * v_unit_cost)::numeric(14,2),
    v_currency,
    new.qty,
    v_unit_cost,
    v_uom,
    v_category_id,
    jsonb_build_object(
      'distribution_id', new.distribution_id,
      'distribution_item_id', new.id,
      'item_id', new.item_id
    ),
    v_created_by
  );

  return new;
end;
$$;

drop trigger if exists distribution_item_cost_event on inventory.distribution_items;

create trigger distribution_item_cost_event
after insert on inventory.distribution_items
for each row execute function core.fn_create_cost_event_from_distribution();

-- Update inventory distribution functions to capture org + unit cost
create or replace function inventory.distribute_items(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = inventory, core, donations, portal, public
as $function$
declare
  dist_id uuid := gen_random_uuid();
  _location uuid := (p_payload->>'location_id')::uuid;
  _client text := p_payload->>'client_id';
  _notes text := p_payload->>'notes';
  _provider_org_id bigint := null;
  _item jsonb;
  _item_id uuid;
  _qty integer;
  _batch uuid;
  _available integer;
  _unit_cost numeric;
begin
  if not is_iharc_user() then
    raise exception 'Access denied: insufficient permissions for inventory.distribute';
  end if;

  _provider_org_id := nullif(p_payload->>'provider_org_id', '')::bigint;
  if _provider_org_id is null then
    raise exception 'Provider organization is required for distributions.';
  end if;

  insert into inventory.distributions(id, client_id, location_id, notes, provider_org_id, created_by)
  values (dist_id, _client, _location, _notes, _provider_org_id, auth.uid());

  for _item in select * from jsonb_array_elements(p_payload->'items') loop
    _item_id := (_item->>'item_id')::uuid;
    _qty := coalesce((_item->>'qty')::integer, 0);
    _batch := nullif(_item->>'batch_id', '')::uuid;
    _unit_cost := nullif(_item->>'unit_cost', '')::numeric;

    if _qty <= 0 then
      continue;
    end if;

    select coalesce(sum(qty), 0) into _available
    from inventory.inventory_transactions
    where item_id = _item_id
      and location_id = _location
      and (_batch is null or batch_id = _batch);

    if _available < _qty then
      raise exception 'Insufficient stock for item %: available %, requested %', _item_id, _available, _qty;
    end if;

    insert into inventory.distribution_items(distribution_id, item_id, batch_id, qty, unit_cost, created_by)
    values (dist_id, _item_id, _batch, _qty, _unit_cost, auth.uid());

    insert into inventory.inventory_transactions(
      item_id, location_id, batch_id, qty, unit_cost, reason_code, ref_type, ref_id, notes, provider_organization_id, created_by
    ) values (
      _item_id, _location, _batch, -_qty, _unit_cost, 'distribution', 'distribution', dist_id, _notes, _provider_org_id, auth.uid()
    );
  end loop;

  return dist_id;
end;
$function$;

create or replace function inventory.process_field_handout(
  p_external_id text,
  p_location_code text,
  p_staff_member text,
  p_items jsonb,
  p_client_identifier text default null,
  p_notes text default null,
  p_handout_timestamp timestamp with time zone default now(),
  p_person_id integer default null,
  p_provider_org_id bigint default null,
  p_gps_latitude numeric default null,
  p_gps_longitude numeric default null,
  p_gps_accuracy numeric default null,
  p_gps_timestamp timestamp with time zone default null
)
returns uuid
language plpgsql
as $function$
declare
  v_location_id uuid;
  v_distribution_id uuid;
  v_item record;
  v_current_stock integer;
  v_final_person_id integer;
  v_unit_cost numeric;
begin
  if not is_iharc_user() then
    raise exception 'Access denied: insufficient permissions for inventory.distribute';
  end if;

  if p_provider_org_id is null then
    raise exception 'Provider organization is required for field handouts.';
  end if;

  select id into v_location_id
  from inventory.locations
  where code = p_location_code and active = true;

  if v_location_id is null then
    raise exception 'Location with code % not found or inactive', p_location_code;
  end if;

  if exists (
    select 1
    from inventory.external_transactions
    where external_system = 'field_app'
      and external_transaction_id = p_external_id
  ) then
    raise exception 'Transaction % already processed', p_external_id;
  end if;

  v_final_person_id := p_person_id;

  if v_final_person_id is null and p_client_identifier ~ '^person_[0-9]+$' then
    v_final_person_id := cast(replace(p_client_identifier, 'person_', '') as integer);
  elsif v_final_person_id is null and p_client_identifier ~ '^[0-9]+$' then
    v_final_person_id := cast(p_client_identifier as integer);
  end if;

  if v_final_person_id is not null then
    if not exists (select 1 from core.people where id = v_final_person_id) then
      raise exception 'Person with ID % not found', v_final_person_id;
    end if;
  end if;

  insert into inventory.distributions (
    client_id,
    person_id,
    location_id,
    notes,
    created_at,
    provider_org_id,
    created_by,
    gps_latitude,
    gps_longitude,
    gps_accuracy,
    gps_timestamp
  )
  values (
    p_client_identifier,
    v_final_person_id,
    v_location_id,
    coalesce(p_notes, 'Field handout by ' || p_staff_member),
    p_handout_timestamp,
    p_provider_org_id,
    auth.uid(),
    p_gps_latitude,
    p_gps_longitude,
    p_gps_accuracy,
    p_gps_timestamp
  )
  returning id into v_distribution_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    if not exists (
      select 1 from core.items
      where id = (v_item.value->>'item_id')::uuid
        and active = true
    ) then
      raise exception 'Item % not found or inactive', v_item.value->>'item_id';
    end if;

    select coalesce(sum(qty), 0) into v_current_stock
    from inventory.inventory_transactions
    where item_id = (v_item.value->>'item_id')::uuid
      and location_id = v_location_id
      and (v_item.value->>'batch_id' is null or batch_id = (v_item.value->>'batch_id')::uuid);

    if v_current_stock < (v_item.value->>'qty')::integer then
      raise exception 'Insufficient stock for item %. Available: %, Requested: %',
        v_item.value->>'item_id', v_current_stock, v_item.value->>'qty';
    end if;

    v_unit_cost := nullif(v_item.value->>'unit_cost', '')::numeric;

    insert into inventory.distribution_items (
      distribution_id,
      item_id,
      batch_id,
      qty,
      unit_cost,
      created_by
    ) values (
      v_distribution_id,
      (v_item.value->>'item_id')::uuid,
      case when v_item.value->>'batch_id' != '' then (v_item.value->>'batch_id')::uuid else null end,
      (v_item.value->>'qty')::integer,
      v_unit_cost,
      auth.uid()
    );

    insert into inventory.inventory_transactions (
      item_id,
      location_id,
      batch_id,
      qty,
      unit_cost,
      reason_code,
      ref_type,
      ref_id,
      notes,
      created_at,
      provider_organization_id,
      created_by
    ) values (
      (v_item.value->>'item_id')::uuid,
      v_location_id,
      case when v_item.value->>'batch_id' != '' then (v_item.value->>'batch_id')::uuid else null end,
      -((v_item.value->>'qty')::integer),
      v_unit_cost,
      'DISTRIBUTION',
      'distribution',
      v_distribution_id,
      'Field handout: ' || coalesce(p_client_identifier, 'Anonymous'),
      p_handout_timestamp,
      p_provider_org_id,
      auth.uid()
    );
  end loop;

  insert into inventory.external_transactions (
    external_system,
    external_transaction_id,
    sync_status,
    transaction_data,
    processed_at
  ) values (
    'field_app',
    p_external_id,
    'synced',
    jsonb_build_object(
      'client_id', p_client_identifier,
      'person_id', v_final_person_id,
      'location_code', p_location_code,
      'staff_member', p_staff_member,
      'provider_org_id', p_provider_org_id,
      'items', p_items,
      'handout_timestamp', p_handout_timestamp,
      'gps_coordinates', case
        when p_gps_latitude is not null and p_gps_longitude is not null then
          jsonb_build_object(
            'latitude', p_gps_latitude,
            'longitude', p_gps_longitude,
            'accuracy', p_gps_accuracy,
            'timestamp', p_gps_timestamp
          )
        else null
      end
    ),
    now()
  );

  return v_distribution_id;
end;
$function$;

create or replace function inventory.process_bulk_field_handouts(p_handouts jsonb)
returns table(external_id text, success boolean, distribution_id uuid, error_message text)
language plpgsql
as $function$
declare
  v_handout record;
  v_distribution_id uuid;
  v_error_message text;
begin
  if not inventory.has_permission('inventory.distribute') then
    raise exception 'Access denied: insufficient permissions for distribution';
  end if;

  for v_handout in select * from jsonb_array_elements(p_handouts) loop
    begin
      select inventory.process_field_handout(
        v_handout.value->>'external_id',
        v_handout.value->>'location_code',
        v_handout.value->>'staff_member',
        v_handout.value->'items',
        v_handout.value->>'client_identifier',
        v_handout.value->>'notes',
        coalesce((v_handout.value->>'handout_timestamp')::timestamptz, now()),
        (v_handout.value->>'person_id')::integer,
        (v_handout.value->>'provider_org_id')::bigint,
        (v_handout.value->>'gps_latitude')::numeric,
        (v_handout.value->>'gps_longitude')::numeric,
        (v_handout.value->>'gps_accuracy')::numeric,
        (v_handout.value->>'gps_timestamp')::timestamptz
      ) into v_distribution_id;

      external_id := v_handout.value->>'external_id';
      success := true;
      distribution_id := v_distribution_id;
      error_message := null;
      return next;

    exception when others then
      v_error_message := sqlerrm;

      insert into inventory.external_transactions (
        external_system,
        external_transaction_id,
        sync_status,
        transaction_data,
        error_message
      ) values (
        'field_app',
        v_handout.value->>'external_id',
        'failed',
        v_handout.value,
        v_error_message
      ) on conflict (external_system, external_transaction_id) do update set
        sync_status = 'failed',
        error_message = v_error_message;

      external_id := v_handout.value->>'external_id';
      success := false;
      distribution_id := null;
      error_message := v_error_message;
      return next;
    end;
  end loop;
end;
$function$;

-- Reporting views
create materialized view if not exists analytics.cost_event_daily as
select
  date_trunc('day', occurred_at)::date as day,
  organization_id,
  person_id,
  cost_category_id,
  sum(cost_amount) as total_cost,
  count(*) as event_count
from core.cost_events
group by 1,2,3,4;

create index if not exists cost_event_daily_idx on analytics.cost_event_daily (day, organization_id, person_id);

create materialized view if not exists analytics.person_cost_rollups as
select
  person_id,
  organization_id,
  sum(cost_amount) as total_cost,
  sum(case when occurred_at >= now() - interval '30 days' then cost_amount else 0 end) as cost_30d,
  sum(case when occurred_at >= now() - interval '90 days' then cost_amount else 0 end) as cost_90d,
  sum(case when occurred_at >= now() - interval '365 days' then cost_amount else 0 end) as cost_365d
from core.cost_events
where person_id is not null
group by 1,2;

create index if not exists person_cost_rollups_idx on analytics.person_cost_rollups (person_id, organization_id);

create materialized view if not exists analytics.org_cost_rollups as
select
  organization_id,
  cost_category_id,
  sum(cost_amount) as total_cost,
  sum(case when occurred_at >= now() - interval '30 days' then cost_amount else 0 end) as cost_30d,
  sum(case when occurred_at >= now() - interval '365 days' then cost_amount else 0 end) as cost_365d
from core.cost_events
group by 1,2;

create index if not exists org_cost_rollups_idx on analytics.org_cost_rollups (organization_id, cost_category_id);

-- Secure views to enforce access rules over materialized rollups
create or replace view analytics.cost_event_daily_secure
with (security_barrier = true) as
select *
from analytics.cost_event_daily
where
  core.is_global_admin()
  or is_iharc_user()
  or (
    organization_id = portal.actor_org_id()
    and (
      public.has_permission_single('cost.view')
      or public.has_permission_single('cost.report')
    )
  )
  or (
    person_id is not null and
    exists (
      select 1
      from core.person_access_grants g
      where g.person_id = analytics.cost_event_daily.person_id
        and (
          g.grantee_user_id = auth.uid()
          or (g.grantee_org_id is not null and core.is_org_member(g.grantee_org_id, auth.uid()))
        )
        and (g.expires_at is null or g.expires_at > now())
        and (
          (g.grantee_user_id = auth.uid() and portal.actor_org_id() is null)
          or core.fn_person_consent_allows_org(analytics.cost_event_daily.person_id, portal.actor_org_id())
        )
    )
  );

create or replace view analytics.person_cost_rollups_secure
with (security_barrier = true) as
select *
from analytics.person_cost_rollups
where
  core.is_global_admin()
  or is_iharc_user()
  or (
    organization_id = portal.actor_org_id()
    and (
      public.has_permission_single('cost.view')
      or public.has_permission_single('cost.report')
    )
  )
  or (
    person_id is not null and
    exists (
      select 1
      from core.person_access_grants g
      where g.person_id = analytics.person_cost_rollups.person_id
        and (
          g.grantee_user_id = auth.uid()
          or (g.grantee_org_id is not null and core.is_org_member(g.grantee_org_id, auth.uid()))
        )
        and (g.expires_at is null or g.expires_at > now())
        and (
          (g.grantee_user_id = auth.uid() and portal.actor_org_id() is null)
          or core.fn_person_consent_allows_org(analytics.person_cost_rollups.person_id, portal.actor_org_id())
        )
    )
  );

create or replace view analytics.org_cost_rollups_secure
with (security_barrier = true) as
select *
from analytics.org_cost_rollups
where
  core.is_global_admin()
  or is_iharc_user()
  or (
    organization_id = portal.actor_org_id()
    and public.has_permission_single('cost.report')
  );

-- Refresh helper
create or replace function analytics.refresh_cost_rollups()
returns void
language plpgsql
security definer
set search_path = analytics, public, core
as $$
begin
  if not (core.is_global_admin() or public.has_permission_single('cost.report')) then
    raise exception 'Access denied: cost.report required.';
  end if;

  refresh materialized view analytics.cost_event_daily;
  refresh materialized view analytics.person_cost_rollups;
  refresh materialized view analytics.org_cost_rollups;
end;
$$;

-- Grants for analytics schema (secure views only)
grant usage on schema analytics to authenticated;

revoke all on analytics.cost_event_daily from authenticated, anon;
revoke all on analytics.person_cost_rollups from authenticated, anon;
revoke all on analytics.org_cost_rollups from authenticated, anon;

grant select on analytics.cost_event_daily_secure to authenticated;
grant select on analytics.person_cost_rollups_secure to authenticated;
grant select on analytics.org_cost_rollups_secure to authenticated;

-- Nightly refresh (pg_cron)
DO $$
DECLARE
  v_job_id integer;
BEGIN
  select jobid into v_job_id from cron.job where jobname = 'refresh_cost_rollups_nightly';
  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  perform cron.schedule(
    'refresh_cost_rollups_nightly',
    '0 3 * * *',
    $cron$select analytics.refresh_cost_rollups();$cron$
  );
END $$;
