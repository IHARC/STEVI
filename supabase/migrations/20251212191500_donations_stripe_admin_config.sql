begin;

create or replace function donations.donations_get_stripe_config()
returns table(
  stripe_mode text,
  stripe_secret_key text,
  stripe_webhook_secret text
)
language plpgsql
security definer
set search_path to 'donations', 'portal', 'vault', 'public'
as $$
declare
  v_mode text;
  v_secret_setting_key text;
  v_webhook_setting_key text;
  v_secret_id uuid;
  v_webhook_id uuid;
begin
  select setting_value
    into v_mode
  from portal.public_settings
  where setting_key = 'stripe_donations_mode';

  if v_mode is null then
    raise exception 'Stripe donations mode is not configured';
  end if;

  v_mode := lower(trim(v_mode));
  if v_mode not in ('test', 'live') then
    raise exception 'Stripe donations mode must be test or live';
  end if;

  v_secret_setting_key := case when v_mode = 'test'
    then 'stripe_donations_test_secret_key_id'
    else 'stripe_donations_live_secret_key_id'
  end;

  v_webhook_setting_key := case when v_mode = 'test'
    then 'stripe_donations_test_webhook_secret_id'
    else 'stripe_donations_live_webhook_secret_id'
  end;

  select setting_value::uuid
    into v_secret_id
  from portal.public_settings
  where setting_key = v_secret_setting_key;

  select setting_value::uuid
    into v_webhook_id
  from portal.public_settings
  where setting_key = v_webhook_setting_key;

  if v_secret_id is null then
    raise exception 'Stripe secret key is not configured for % mode', v_mode;
  end if;

  if v_webhook_id is null then
    raise exception 'Stripe webhook secret is not configured for % mode', v_mode;
  end if;

  select decrypted_secret
    into stripe_secret_key
  from vault.decrypted_secrets
  where id = v_secret_id;

  select decrypted_secret
    into stripe_webhook_secret
  from vault.decrypted_secrets
  where id = v_webhook_id;

  if stripe_secret_key is null then
    raise exception 'Stripe secret key could not be loaded for % mode', v_mode;
  end if;

  if stripe_webhook_secret is null then
    raise exception 'Stripe webhook secret could not be loaded for % mode', v_mode;
  end if;

  stripe_mode := v_mode;
  return next;
end;
$$;

revoke all on function donations.donations_get_stripe_config() from public;
grant execute on function donations.donations_get_stripe_config() to service_role;

create or replace function donations.donations_admin_upsert_stripe_credentials(
  p_actor_profile_id uuid,
  p_mode text,
  p_stripe_secret_key text,
  p_stripe_webhook_secret text
)
returns void
language plpgsql
security definer
set search_path to 'donations', 'portal', 'vault', 'public'
as $$
declare
  v_mode text;
  v_secret_setting_key text;
  v_webhook_setting_key text;
  v_secret_id uuid;
  v_webhook_id uuid;
  v_secret_name text;
  v_webhook_name text;
begin
  if check_iharc_admin_role() is distinct from true then
    raise exception 'IHARC admin access is required';
  end if;

  if p_actor_profile_id is null then
    raise exception 'Missing actor profile id';
  end if;

  v_mode := lower(trim(coalesce(p_mode, '')));
  if v_mode not in ('test', 'live') then
    raise exception 'Mode must be test or live';
  end if;

  p_stripe_secret_key := trim(coalesce(p_stripe_secret_key, ''));
  p_stripe_webhook_secret := trim(coalesce(p_stripe_webhook_secret, ''));

  if v_mode = 'test' and p_stripe_secret_key not like 'sk_test_%' then
    raise exception 'Stripe secret key must be a test key (sk_test_...)';
  end if;

  if v_mode = 'live' and p_stripe_secret_key not like 'sk_live_%' then
    raise exception 'Stripe secret key must be a live key (sk_live_...)';
  end if;

  if p_stripe_webhook_secret not like 'whsec_%' then
    raise exception 'Stripe webhook secret must start with whsec_';
  end if;

  v_secret_setting_key := case when v_mode = 'test'
    then 'stripe_donations_test_secret_key_id'
    else 'stripe_donations_live_secret_key_id'
  end;

  v_webhook_setting_key := case when v_mode = 'test'
    then 'stripe_donations_test_webhook_secret_id'
    else 'stripe_donations_live_webhook_secret_id'
  end;

  v_secret_name := format('stripe_donations_secret_key_%s', v_mode);
  v_webhook_name := format('stripe_donations_webhook_secret_%s', v_mode);

  select setting_value::uuid
    into v_secret_id
  from portal.public_settings
  where setting_key = v_secret_setting_key;

  if v_secret_id is null then
    v_secret_id := vault.create_secret(
      p_stripe_secret_key,
      v_secret_name,
      format('Stripe donations secret key (%s)', v_mode),
      null
    );
  else
    perform vault.update_secret(
      v_secret_id,
      p_stripe_secret_key,
      v_secret_name,
      format('Stripe donations secret key (%s)', v_mode),
      null
    );
  end if;

  insert into portal.public_settings(setting_key, setting_value, setting_type, is_public, created_by_profile_id, updated_by_profile_id)
  values (v_secret_setting_key, v_secret_id::text, 'string', false, p_actor_profile_id, p_actor_profile_id)
  on conflict (setting_key) do update
    set setting_value = excluded.setting_value,
        updated_at = now(),
        updated_by_profile_id = excluded.updated_by_profile_id;

  select setting_value::uuid
    into v_webhook_id
  from portal.public_settings
  where setting_key = v_webhook_setting_key;

  if v_webhook_id is null then
    v_webhook_id := vault.create_secret(
      p_stripe_webhook_secret,
      v_webhook_name,
      format('Stripe donations webhook secret (%s)', v_mode),
      null
    );
  else
    perform vault.update_secret(
      v_webhook_id,
      p_stripe_webhook_secret,
      v_webhook_name,
      format('Stripe donations webhook secret (%s)', v_mode),
      null
    );
  end if;

  insert into portal.public_settings(setting_key, setting_value, setting_type, is_public, created_by_profile_id, updated_by_profile_id)
  values (v_webhook_setting_key, v_webhook_id::text, 'string', false, p_actor_profile_id, p_actor_profile_id)
  on conflict (setting_key) do update
    set setting_value = excluded.setting_value,
        updated_at = now(),
        updated_by_profile_id = excluded.updated_by_profile_id;
end;
$$;

revoke all on function donations.donations_admin_upsert_stripe_credentials(uuid,text,text,text) from public;
grant execute on function donations.donations_admin_upsert_stripe_credentials(uuid,text,text,text) to authenticated;

create or replace function donations.donations_admin_set_stripe_mode(
  p_actor_profile_id uuid,
  p_mode text
)
returns void
language plpgsql
security definer
set search_path to 'donations', 'portal', 'vault', 'public'
as $$
declare
  v_mode text;
  v_secret_setting_key text;
  v_webhook_setting_key text;
  v_secret_id uuid;
  v_webhook_id uuid;
begin
  if check_iharc_admin_role() is distinct from true then
    raise exception 'IHARC admin access is required';
  end if;

  if p_actor_profile_id is null then
    raise exception 'Missing actor profile id';
  end if;

  v_mode := lower(trim(coalesce(p_mode, '')));
  if v_mode not in ('test', 'live') then
    raise exception 'Mode must be test or live';
  end if;

  v_secret_setting_key := case when v_mode = 'test'
    then 'stripe_donations_test_secret_key_id'
    else 'stripe_donations_live_secret_key_id'
  end;

  v_webhook_setting_key := case when v_mode = 'test'
    then 'stripe_donations_test_webhook_secret_id'
    else 'stripe_donations_live_webhook_secret_id'
  end;

  select setting_value::uuid
    into v_secret_id
  from portal.public_settings
  where setting_key = v_secret_setting_key;

  select setting_value::uuid
    into v_webhook_id
  from portal.public_settings
  where setting_key = v_webhook_setting_key;

  if v_secret_id is null then
    raise exception 'Stripe secret key must be configured for % mode before switching', v_mode;
  end if;

  if v_webhook_id is null then
    raise exception 'Stripe webhook secret must be configured for % mode before switching', v_mode;
  end if;

  insert into portal.public_settings(setting_key, setting_value, setting_type, is_public, created_by_profile_id, updated_by_profile_id)
  values ('stripe_donations_mode', v_mode, 'string', false, p_actor_profile_id, p_actor_profile_id)
  on conflict (setting_key) do update
    set setting_value = excluded.setting_value,
        updated_at = now(),
        updated_by_profile_id = excluded.updated_by_profile_id;
end;
$$;

revoke all on function donations.donations_admin_set_stripe_mode(uuid,text) from public;
grant execute on function donations.donations_admin_set_stripe_mode(uuid,text) to authenticated;

commit;

