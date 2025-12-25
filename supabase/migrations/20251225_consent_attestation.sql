-- Consent attestation and capture context

alter table core.person_consents
  add column if not exists captured_org_id bigint null references core.organizations(id) on delete set null,
  add column if not exists attested_by_staff boolean not null default false,
  add column if not exists attested_by_client boolean not null default false,
  add column if not exists attested_at timestamptz null;

-- Update effective consent view to expose attestation context
drop view if exists core.v_person_consent_effective;
create view core.v_person_consent_effective
with (security_barrier = true)
as
select distinct on (c.person_id)
  c.id,
  c.person_id,
  c.consent_type,
  c.scope,
  c.status,
  c.captured_by,
  c.captured_method,
  c.captured_org_id,
  c.attested_by_staff,
  c.attested_by_client,
  c.attested_at,
  c.policy_version,
  c.notes,
  c.created_at,
  c.updated_at,
  c.revoked_at,
  c.revoked_by,
  c.expires_at,
  c.restrictions,
  case
    when c.status = 'active' and (c.expires_at is null or c.expires_at <= now()) then 'expired'
    else c.status
  end as effective_status,
  (c.expires_at is not null and c.expires_at <= now()) as is_expired
from core.person_consents c
where c.consent_type = 'data_sharing'
order by c.person_id, c.created_at desc;
