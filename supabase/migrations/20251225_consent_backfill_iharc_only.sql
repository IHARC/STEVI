-- Backfill active client consents to IHARC-only sharing

do $$
declare
  v_now timestamptz := now();
  v_expiry_days int;
begin
  select setting_value::int
    into v_expiry_days
  from portal.public_settings
  where setting_key = 'consent.expiry_days';

  if v_expiry_days is null or v_expiry_days <= 0 then
    raise exception 'Missing or invalid consent.expiry_days setting.';
  end if;

  create temporary table temp_active_consents on commit drop as
    select id, person_id
    from core.person_consents
    where consent_type = 'data_sharing'
      and status = 'active';

  update core.person_consents
  set status = 'revoked',
      revoked_at = v_now,
      revoked_by = null,
      updated_at = v_now
  where id in (select id from temp_active_consents);

  insert into core.person_consents (
    person_id,
    consent_type,
    scope,
    status,
    captured_method,
    captured_org_id,
    attested_by_staff,
    attested_by_client,
    attested_at,
    policy_version,
    notes,
    created_at,
    updated_at,
    expires_at
  )
  select
    temp_active_consents.person_id,
    'data_sharing',
    'none',
    'active',
    'migration',
    null,
    false,
    false,
    null,
    null,
    'Backfill: set to IHARC-only sharing.',
    v_now,
    v_now,
    v_now + (v_expiry_days || ' days')::interval
  from temp_active_consents;
end $$;
