begin;

drop function if exists donations.donations_get_email_config();
drop function if exists donations.donations_admin_upsert_email_credentials(uuid,text,text,int,text,text,boolean);

create or replace function donations.donations_get_email_config()
returns table(
  email_from text,
  provider text,
  sendgrid_api_key text
)
language plpgsql
security definer
set search_path to 'donations', 'portal', 'vault', 'public'
as $$
declare
  v_email_from text;
  v_provider text;
  v_api_key_id uuid;
begin
  select setting_value into v_email_from
  from portal.public_settings
  where setting_key = 'donations_email_from';

  select setting_value into v_provider
  from portal.public_settings
  where setting_key = 'donations_email_provider';

  select setting_value::uuid into v_api_key_id
  from portal.public_settings
  where setting_key = 'donations_sendgrid_api_key_secret_id';

  if v_email_from is null or position('@' in v_email_from) = 0 then
    raise exception 'Donations email sender is not configured';
  end if;

  v_provider := lower(trim(coalesce(v_provider, 'sendgrid')));
  if v_provider <> 'sendgrid' then
    raise exception 'Unsupported donations email provider: %', v_provider;
  end if;

  if v_api_key_id is null then
    raise exception 'SendGrid API key is not configured';
  end if;

  select decrypted_secret
    into sendgrid_api_key
  from vault.decrypted_secrets
  where id = v_api_key_id;

  if sendgrid_api_key is null or length(trim(sendgrid_api_key)) = 0 then
    raise exception 'SendGrid API key could not be loaded';
  end if;

  email_from := trim(v_email_from);
  provider := v_provider;
  return next;
end;
$$;

revoke all on function donations.donations_get_email_config() from public;
grant execute on function donations.donations_get_email_config() to service_role;

create or replace function donations.donations_admin_upsert_email_credentials(
  p_actor_profile_id uuid,
  p_email_from text,
  p_sendgrid_api_key text
)
returns void
language plpgsql
security definer
set search_path to 'donations', 'portal', 'vault', 'public'
as $$
declare
  v_api_key_id uuid;
begin
  if check_iharc_admin_role() is distinct from true then
    raise exception 'IHARC admin access is required';
  end if;

  if p_actor_profile_id is null then
    raise exception 'Missing actor profile id';
  end if;

  p_email_from := trim(coalesce(p_email_from, ''));
  p_sendgrid_api_key := trim(coalesce(p_sendgrid_api_key, ''));

  if position('@' in p_email_from) = 0 then
    raise exception 'Email from address must include @';
  end if;

  if length(p_sendgrid_api_key) = 0 then
    raise exception 'SendGrid API key is required';
  end if;

  select setting_value::uuid
    into v_api_key_id
  from portal.public_settings
  where setting_key = 'donations_sendgrid_api_key_secret_id';

  if v_api_key_id is null then
    v_api_key_id := vault.create_secret(
      p_sendgrid_api_key,
      'donations_sendgrid_api_key',
      'Donations SendGrid API key',
      null
    );
  else
    perform vault.update_secret(
      v_api_key_id,
      p_sendgrid_api_key,
      'donations_sendgrid_api_key',
      'Donations SendGrid API key',
      null
    );
  end if;

  insert into portal.public_settings(setting_key, setting_value, setting_type, is_public, created_by_profile_id, updated_by_profile_id)
  values ('donations_sendgrid_api_key_secret_id', v_api_key_id::text, 'string', false, p_actor_profile_id, p_actor_profile_id)
  on conflict (setting_key) do update
    set setting_value = excluded.setting_value,
        updated_at = now(),
        updated_by_profile_id = excluded.updated_by_profile_id;

  insert into portal.public_settings(setting_key, setting_value, setting_type, is_public, created_by_profile_id, updated_by_profile_id)
  values ('donations_email_from', p_email_from, 'string', false, p_actor_profile_id, p_actor_profile_id)
  on conflict (setting_key) do update
    set setting_value = excluded.setting_value,
        updated_at = now(),
        updated_by_profile_id = excluded.updated_by_profile_id;

  insert into portal.public_settings(setting_key, setting_value, setting_type, is_public, created_by_profile_id, updated_by_profile_id)
  values ('donations_email_provider', 'sendgrid', 'string', false, p_actor_profile_id, p_actor_profile_id)
  on conflict (setting_key) do update
    set setting_value = excluded.setting_value,
        updated_at = now(),
        updated_by_profile_id = excluded.updated_by_profile_id;
end;
$$;

revoke all on function donations.donations_admin_upsert_email_credentials(uuid,text,text) from public;
grant execute on function donations.donations_admin_upsert_email_credentials(uuid,text,text) to authenticated;

commit;

