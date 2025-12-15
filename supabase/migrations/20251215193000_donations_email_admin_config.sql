begin;

create or replace function donations.donations_get_email_config()
returns table(
  email_from text,
  smtp_host text,
  smtp_port int,
  smtp_username text,
  smtp_password text,
  smtp_secure boolean
)
language plpgsql
security definer
set search_path to 'donations', 'portal', 'vault', 'public'
as $$
declare
  v_email_from text;
  v_host text;
  v_port_raw text;
  v_secure_raw text;
  v_username_secret_id uuid;
  v_password_secret_id uuid;
begin
  select setting_value into v_email_from
  from portal.public_settings
  where setting_key = 'donations_email_from';

  select setting_value into v_host
  from portal.public_settings
  where setting_key = 'donations_smtp_host';

  select setting_value into v_port_raw
  from portal.public_settings
  where setting_key = 'donations_smtp_port';

  select setting_value into v_secure_raw
  from portal.public_settings
  where setting_key = 'donations_smtp_secure';

  select setting_value::uuid into v_username_secret_id
  from portal.public_settings
  where setting_key = 'donations_smtp_username_secret_id';

  select setting_value::uuid into v_password_secret_id
  from portal.public_settings
  where setting_key = 'donations_smtp_password_secret_id';

  if v_email_from is null or position('@' in v_email_from) = 0 then
    raise exception 'Donations email sender is not configured';
  end if;

  if v_host is null or length(trim(v_host)) = 0 then
    raise exception 'Donations SMTP host is not configured';
  end if;

  if v_port_raw is null then
    raise exception 'Donations SMTP port is not configured';
  end if;

  smtp_port := nullif(trim(v_port_raw), '')::int;
  if smtp_port is null or smtp_port < 1 or smtp_port > 65535 then
    raise exception 'Donations SMTP port is invalid';
  end if;

  if v_secure_raw is null then
    raise exception 'Donations SMTP secure flag is not configured';
  end if;

  smtp_secure := lower(trim(v_secure_raw)) = 'true';

  if v_username_secret_id is null then
    raise exception 'Donations SMTP username is not configured';
  end if;

  if v_password_secret_id is null then
    raise exception 'Donations SMTP password is not configured';
  end if;

  select decrypted_secret
    into smtp_username
  from vault.decrypted_secrets
  where id = v_username_secret_id;

  select decrypted_secret
    into smtp_password
  from vault.decrypted_secrets
  where id = v_password_secret_id;

  if smtp_username is null or length(trim(smtp_username)) = 0 then
    raise exception 'Donations SMTP username could not be loaded';
  end if;

  if smtp_password is null or length(trim(smtp_password)) = 0 then
    raise exception 'Donations SMTP password could not be loaded';
  end if;

  email_from := trim(v_email_from);
  smtp_host := trim(v_host);
  return next;
end;
$$;

revoke all on function donations.donations_get_email_config() from public;
grant execute on function donations.donations_get_email_config() to service_role;

create or replace function donations.donations_admin_upsert_email_credentials(
  p_actor_profile_id uuid,
  p_email_from text,
  p_smtp_host text,
  p_smtp_port int,
  p_smtp_username text,
  p_smtp_password text,
  p_smtp_secure boolean
)
returns void
language plpgsql
security definer
set search_path to 'donations', 'portal', 'vault', 'public'
as $$
declare
  v_username_secret_id uuid;
  v_password_secret_id uuid;
begin
  if check_iharc_admin_role() is distinct from true then
    raise exception 'IHARC admin access is required';
  end if;

  if p_actor_profile_id is null then
    raise exception 'Missing actor profile id';
  end if;

  p_email_from := trim(coalesce(p_email_from, ''));
  p_smtp_host := trim(coalesce(p_smtp_host, ''));
  p_smtp_username := trim(coalesce(p_smtp_username, ''));
  p_smtp_password := trim(coalesce(p_smtp_password, ''));

  if position('@' in p_email_from) = 0 then
    raise exception 'Email from address must include @';
  end if;

  if length(p_smtp_host) = 0 then
    raise exception 'SMTP host is required';
  end if;

  if p_smtp_port is null or p_smtp_port < 1 or p_smtp_port > 65535 then
    raise exception 'SMTP port must be between 1 and 65535';
  end if;

  if length(p_smtp_username) = 0 then
    raise exception 'SMTP username is required';
  end if;

  if length(p_smtp_password) = 0 then
    raise exception 'SMTP password is required';
  end if;

  select setting_value::uuid
    into v_username_secret_id
  from portal.public_settings
  where setting_key = 'donations_smtp_username_secret_id';

  if v_username_secret_id is null then
    v_username_secret_id := vault.create_secret(
      p_smtp_username,
      'donations_smtp_username',
      'Donations SMTP username',
      null
    );
  else
    perform vault.update_secret(
      v_username_secret_id,
      p_smtp_username,
      'donations_smtp_username',
      'Donations SMTP username',
      null
    );
  end if;

  insert into portal.public_settings(setting_key, setting_value, setting_type, is_public, created_by_profile_id, updated_by_profile_id)
  values ('donations_smtp_username_secret_id', v_username_secret_id::text, 'string', false, p_actor_profile_id, p_actor_profile_id)
  on conflict (setting_key) do update
    set setting_value = excluded.setting_value,
        updated_at = now(),
        updated_by_profile_id = excluded.updated_by_profile_id;

  select setting_value::uuid
    into v_password_secret_id
  from portal.public_settings
  where setting_key = 'donations_smtp_password_secret_id';

  if v_password_secret_id is null then
    v_password_secret_id := vault.create_secret(
      p_smtp_password,
      'donations_smtp_password',
      'Donations SMTP password',
      null
    );
  else
    perform vault.update_secret(
      v_password_secret_id,
      p_smtp_password,
      'donations_smtp_password',
      'Donations SMTP password',
      null
    );
  end if;

  insert into portal.public_settings(setting_key, setting_value, setting_type, is_public, created_by_profile_id, updated_by_profile_id)
  values ('donations_smtp_password_secret_id', v_password_secret_id::text, 'string', false, p_actor_profile_id, p_actor_profile_id)
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
  values ('donations_smtp_host', p_smtp_host, 'string', false, p_actor_profile_id, p_actor_profile_id)
  on conflict (setting_key) do update
    set setting_value = excluded.setting_value,
        updated_at = now(),
        updated_by_profile_id = excluded.updated_by_profile_id;

  insert into portal.public_settings(setting_key, setting_value, setting_type, is_public, created_by_profile_id, updated_by_profile_id)
  values ('donations_smtp_port', p_smtp_port::text, 'string', false, p_actor_profile_id, p_actor_profile_id)
  on conflict (setting_key) do update
    set setting_value = excluded.setting_value,
        updated_at = now(),
        updated_by_profile_id = excluded.updated_by_profile_id;

  insert into portal.public_settings(setting_key, setting_value, setting_type, is_public, created_by_profile_id, updated_by_profile_id)
  values ('donations_smtp_secure', case when p_smtp_secure then 'true' else 'false' end, 'string', false, p_actor_profile_id, p_actor_profile_id)
  on conflict (setting_key) do update
    set setting_value = excluded.setting_value,
        updated_at = now(),
        updated_by_profile_id = excluded.updated_by_profile_id;
end;
$$;

revoke all on function donations.donations_admin_upsert_email_credentials(uuid,text,text,int,text,text,boolean) from public;
grant execute on function donations.donations_admin_upsert_email_credentials(uuid,text,text,int,text,text,boolean) to authenticated;

commit;

