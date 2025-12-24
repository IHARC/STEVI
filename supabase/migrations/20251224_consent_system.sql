-- Consent system (org-level data sharing)

-- 1) Tables
create table if not exists core.person_consents (
  id uuid primary key default gen_random_uuid(),
  person_id bigint not null references core.people(id) on delete cascade,
  consent_type text not null,
  scope text not null,
  status text not null,
  captured_by uuid null references portal.profiles(id) on delete set null,
  captured_method text not null,
  policy_version text null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz null,
  revoked_at timestamptz null,
  revoked_by uuid null references portal.profiles(id) on delete set null,
  expires_at timestamptz null,
  restrictions jsonb null,
  constraint person_consents_type_check check (consent_type in ('data_sharing')),
  constraint person_consents_scope_check check (scope in ('all_orgs', 'selected_orgs', 'none')),
  constraint person_consents_status_check check (status in ('active', 'revoked', 'expired')),
  constraint person_consents_method_check check (captured_method in ('portal', 'staff_assisted', 'verbal', 'documented', 'migration'))
);

create table if not exists core.person_consent_orgs (
  id uuid primary key default gen_random_uuid(),
  consent_id uuid not null references core.person_consents(id) on delete cascade,
  organization_id bigint not null references core.organizations(id) on delete cascade,
  allowed boolean not null,
  set_by uuid null references portal.profiles(id) on delete set null,
  set_at timestamptz not null default now(),
  reason text null,
  constraint person_consent_orgs_unique unique (consent_id, organization_id)
);

create table if not exists core.person_consent_requests (
  id uuid primary key default gen_random_uuid(),
  person_id bigint not null references core.people(id) on delete cascade,
  requesting_org_id bigint not null references core.organizations(id) on delete cascade,
  requested_by_user_id uuid not null,
  requested_by_profile_id uuid null references portal.profiles(id) on delete set null,
  requested_at timestamptz not null default now(),
  purpose text not null,
  requested_scopes text[] not null default array['view', 'update_contact']::text[],
  status text not null,
  decision_at timestamptz null,
  decision_by uuid null references portal.profiles(id) on delete set null,
  decision_reason text null,
  expires_at timestamptz null,
  metadata jsonb null,
  constraint person_consent_requests_status_check check (status in ('pending', 'approved', 'denied', 'expired')),
  constraint person_consent_requests_purpose_check check (char_length(purpose) <= 240)
);

alter table core.person_consents enable row level security;
alter table core.person_consent_orgs enable row level security;
alter table core.person_consent_requests enable row level security;

-- 2) Indexes
create index if not exists person_consents_person_id_idx on core.person_consents(person_id);
create index if not exists person_consents_person_type_idx on core.person_consents(person_id, consent_type);
create index if not exists person_consents_status_idx on core.person_consents(status);
create index if not exists person_consents_expires_idx on core.person_consents(expires_at);
create unique index if not exists person_consents_active_unique on core.person_consents(person_id, consent_type) where status = 'active';

create index if not exists person_consent_orgs_consent_idx on core.person_consent_orgs(consent_id);
create index if not exists person_consent_orgs_org_idx on core.person_consent_orgs(organization_id);
create index if not exists person_consent_orgs_allowed_idx on core.person_consent_orgs(allowed);

create index if not exists person_consent_requests_person_idx on core.person_consent_requests(person_id);
create index if not exists person_consent_requests_org_idx on core.person_consent_requests(requesting_org_id);
create index if not exists person_consent_requests_status_idx on core.person_consent_requests(status);
create index if not exists person_consent_requests_requested_by_idx on core.person_consent_requests(requested_by_user_id);
create unique index if not exists person_consent_requests_pending_unique on core.person_consent_requests(person_id, requesting_org_id) where status = 'pending';

-- 3) Effective consent view
create or replace view core.v_person_consent_effective
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

-- 4) Name-only visibility view
create or replace view core.people_name_only
with (security_barrier = true)
as
select
  p.id,
  p.first_name,
  p.last_name,
  p.person_type,
  date_trunc('month', p.updated_at)::date as last_service_month
from core.people p
where
  p.status <> 'inactive'
  and (
    core.is_global_admin()
    or is_iharc_user()
    or (
      portal.actor_is_approved()
      and portal.actor_org_id() is not null
      and (
        core.has_org_permission(portal.actor_org_id(), 'portal.access_frontline', auth.uid())
        or core.has_org_permission(portal.actor_org_id(), 'portal.access_org', auth.uid())
      )
    )
  );

-- 5) Participating organizations view (minimal fields, authenticated only)
create or replace view core.participating_organizations
with (security_barrier = true)
as
select
  o.id,
  o.name,
  o.organization_type,
  o.partnership_type,
  o.is_active
from core.organizations o
where
  auth.uid() is not null
  and (o.is_active is null or o.is_active = true);

-- 6) Consent request status view (minimal fields for orgs)
create or replace view core.person_consent_requests_status
with (security_barrier = true)
as
select
  r.id,
  r.person_id,
  r.requesting_org_id,
  r.requested_by_user_id,
  r.requested_at,
  r.status,
  r.decision_at,
  r.expires_at
from core.person_consent_requests r
where
  portal.actor_is_approved()
  and portal.actor_org_id() is not null
  and r.requesting_org_id = portal.actor_org_id()
  and r.requested_by_user_id = auth.uid();

-- 7) Consent evaluation functions
create or replace function core.fn_person_consent_allows_org(p_person_id bigint, p_org_id bigint)
returns boolean
language plpgsql
stable
security definer
set search_path to 'core', 'portal', 'public'
as $$
declare
  consent_record record;
  is_blocked boolean;
  is_allowed boolean;
begin
  if p_person_id is null or p_org_id is null then
    return false;
  end if;

  select c.id, c.scope, c.status, c.expires_at
    into consent_record
  from core.person_consents c
  where c.person_id = p_person_id
    and c.consent_type = 'data_sharing'
  order by c.created_at desc
  limit 1;

  if consent_record.id is null then
    return false;
  end if;

  if consent_record.status <> 'active' then
    return false;
  end if;

  if consent_record.expires_at is null or consent_record.expires_at <= now() then
    return false;
  end if;

  if consent_record.scope = 'none' then
    return false;
  end if;

  if consent_record.scope = 'all_orgs' then
    select exists (
      select 1
      from core.person_consent_orgs o
      where o.consent_id = consent_record.id
        and o.organization_id = p_org_id
        and o.allowed = false
    ) into is_blocked;

    return not coalesce(is_blocked, false);
  end if;

  if consent_record.scope = 'selected_orgs' then
    select exists (
      select 1
      from core.person_consent_orgs o
      where o.consent_id = consent_record.id
        and o.organization_id = p_org_id
        and o.allowed = true
    ) into is_allowed;

    return coalesce(is_allowed, false);
  end if;

  return false;
end;
$$;

-- 8) Consent request RPC
create or replace function core.request_person_consent(
  p_person_id bigint,
  p_org_id bigint,
  p_purpose text,
  p_requested_scopes text[] default array['view', 'update_contact']::text[],
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'core', 'portal', 'public'
as $$
declare
  v_profile_id uuid;
  v_purpose text;
  v_scopes text[];
  v_request_id uuid;
begin
  if p_person_id is null or p_org_id is null then
    raise exception 'Person and organization are required.';
  end if;

  if not portal.actor_is_approved() then
    raise exception 'Profile approval required.';
  end if;

  if portal.actor_org_id() is null or portal.actor_org_id() <> p_org_id then
    raise exception 'Requesting org does not match acting org.';
  end if;

  if not core.has_org_permission(p_org_id, 'portal.access_org', auth.uid())
    and not core.has_org_permission(p_org_id, 'portal.access_frontline', auth.uid()) then
    raise exception 'Insufficient permissions to request consent.';
  end if;

  if core.fn_person_consent_allows_org(p_person_id, p_org_id) then
    raise exception 'Consent already active for this organization.';
  end if;

  if exists (
    select 1
    from core.person_consent_requests r
    where r.person_id = p_person_id
      and r.requesting_org_id = p_org_id
      and r.status = 'pending'
  ) then
    raise exception 'A pending consent request already exists.';
  end if;

  v_purpose := nullif(trim(p_purpose), '');
  if v_purpose is null then
    raise exception 'Purpose is required.';
  end if;

  if char_length(v_purpose) > 240 then
    raise exception 'Purpose must be 240 characters or fewer.';
  end if;

  v_scopes := p_requested_scopes;
  if v_scopes is null or array_length(v_scopes, 1) is null then
    v_scopes := array['view', 'update_contact'];
  end if;

  select portal.current_profile_id() into v_profile_id;
  if v_profile_id is null then
    raise exception 'Profile required to request consent.';
  end if;

  insert into core.person_consent_requests (
    person_id,
    requesting_org_id,
    requested_by_user_id,
    requested_by_profile_id,
    purpose,
    requested_scopes,
    status,
    metadata
  )
  values (
    p_person_id,
    p_org_id,
    auth.uid(),
    v_profile_id,
    v_purpose,
    v_scopes,
    'pending',
    case when p_note is null then null else jsonb_build_object('note', p_note) end
  )
  returning id into v_request_id;

  return v_request_id;
end;
$$;

-- 9) Minimal consent contact logging RPC
create or replace function core.log_consent_contact(
  p_person_id bigint,
  p_org_id bigint,
  p_summary text
)
returns void
language plpgsql
security definer
set search_path to 'core', 'portal', 'public'
as $$
declare
  v_profile_id uuid;
  v_display_name text;
  v_title text;
  v_summary text;
  v_today text;
  v_time text;
begin
  if p_person_id is null or p_org_id is null then
    raise exception 'Person and organization are required.';
  end if;

  if not portal.actor_is_approved() then
    raise exception 'Profile approval required.';
  end if;

  if portal.actor_org_id() is null or portal.actor_org_id() <> p_org_id then
    raise exception 'Contact org does not match acting org.';
  end if;

  select portal.current_profile_id() into v_profile_id;
  if v_profile_id is null then
    raise exception 'Profile required to log consent contact.';
  end if;

  select display_name into v_display_name
  from portal.profiles
  where id = v_profile_id;

  if v_display_name is null then
    raise exception 'Profile display name required.';
  end if;

  v_summary := nullif(trim(p_summary), '');
  if v_summary is null then
    raise exception 'Summary is required.';
  end if;

  if char_length(v_summary) > 240 then
    raise exception 'Summary must be 240 characters or fewer.';
  end if;

  v_title := 'Consent contact logged';
  v_today := to_char(now(), 'YYYY-MM-DD');
  v_time := to_char(now(), 'HH24:MI:SS');

  insert into core.people_activities (
    person_id,
    activity_type,
    activity_date,
    activity_time,
    title,
    description,
    staff_member,
    metadata,
    created_by,
    provider_profile_id,
    provider_org_id
  )
  values (
    p_person_id,
    'consent_contact',
    v_today,
    v_time,
    v_title,
    v_summary,
    v_display_name,
    jsonb_build_object('client_visible', false, 'consent_contact', true),
    auth.uid(),
    v_profile_id,
    p_org_id
  );
end;
$$;

-- 10) Public settings key for consent expiry
insert into portal.public_settings (setting_key, setting_value, setting_type, is_public, created_at, updated_at)
values ('consent.expiry_days', '90', 'number', true, now(), now())
on conflict (setting_key)
  do update set setting_value = excluded.setting_value,
                setting_type = excluded.setting_type,
                is_public = excluded.is_public,
                updated_at = now();

-- 11) Backfill legacy consent flag
with expiry_days as (
  select coalesce((select setting_value::int from portal.public_settings where setting_key = 'consent.expiry_days'), 90) as days
),
legacy as (
  select
    id as person_id,
    data_sharing_consent,
    coalesce(updated_at, created_at, now()) as consented_at
  from core.people
  where data_sharing_consent is not null
)
insert into core.person_consents (
  person_id,
  consent_type,
  scope,
  status,
  captured_method,
  created_at,
  updated_at,
  expires_at
)
select
  legacy.person_id,
  'data_sharing',
  case when legacy.data_sharing_consent then 'all_orgs' else 'none' end,
  'active',
  'migration',
  legacy.consented_at,
  now(),
  now() + (expiry_days.days || ' days')::interval
from legacy, expiry_days
where not exists (
  select 1
  from core.person_consents c
  where c.person_id = legacy.person_id
    and c.consent_type = 'data_sharing'
    and c.status = 'active'
);

-- 12) RLS policies for consent tables

-- person_consents
 drop policy if exists "person_consents_select" on core.person_consents;
 drop policy if exists "person_consents_insert" on core.person_consents;
 drop policy if exists "person_consents_update" on core.person_consents;
 drop policy if exists "person_consents_delete" on core.person_consents;

create policy "person_consents_select" on core.person_consents
  for select
  using (
    auth.role() = 'service_role'
    or core.is_global_admin()
    or is_iharc_user()
    or (portal.actor_is_approved() and core.has_org_permission(portal.actor_org_id(), 'portal.manage_consents', auth.uid()))
    or exists (
      select 1
      from core.user_people up
      where up.person_id = person_consents.person_id
        and up.user_id = auth.uid()
    )
  );

create policy "person_consents_insert" on core.person_consents
  for insert
  with check (
    auth.role() = 'service_role'
    or core.is_global_admin()
    or is_iharc_user()
    or (portal.actor_is_approved() and core.has_org_permission(portal.actor_org_id(), 'portal.manage_consents', auth.uid()))
    or exists (
      select 1
      from core.user_people up
      where up.person_id = person_consents.person_id
        and up.user_id = auth.uid()
    )
  );

create policy "person_consents_update" on core.person_consents
  for update
  using (
    auth.role() = 'service_role'
    or core.is_global_admin()
    or is_iharc_user()
    or (portal.actor_is_approved() and core.has_org_permission(portal.actor_org_id(), 'portal.manage_consents', auth.uid()))
    or exists (
      select 1
      from core.user_people up
      where up.person_id = person_consents.person_id
        and up.user_id = auth.uid()
    )
  )
  with check (
    auth.role() = 'service_role'
    or core.is_global_admin()
    or is_iharc_user()
    or (portal.actor_is_approved() and core.has_org_permission(portal.actor_org_id(), 'portal.manage_consents', auth.uid()))
    or exists (
      select 1
      from core.user_people up
      where up.person_id = person_consents.person_id
        and up.user_id = auth.uid()
    )
  );

create policy "person_consents_delete" on core.person_consents
  for delete
  using (
    core.is_global_admin()
  );

-- person_consent_orgs
 drop policy if exists "person_consent_orgs_select" on core.person_consent_orgs;
 drop policy if exists "person_consent_orgs_insert" on core.person_consent_orgs;
 drop policy if exists "person_consent_orgs_update" on core.person_consent_orgs;
 drop policy if exists "person_consent_orgs_delete" on core.person_consent_orgs;

create policy "person_consent_orgs_select" on core.person_consent_orgs
  for select
  using (
    auth.role() = 'service_role'
    or core.is_global_admin()
    or is_iharc_user()
    or (portal.actor_is_approved() and core.has_org_permission(portal.actor_org_id(), 'portal.manage_consents', auth.uid()))
    or exists (
      select 1
      from core.person_consents c
      join core.user_people up on up.person_id = c.person_id
      where c.id = person_consent_orgs.consent_id
        and up.user_id = auth.uid()
    )
  );

create policy "person_consent_orgs_insert" on core.person_consent_orgs
  for insert
  with check (
    auth.role() = 'service_role'
    or core.is_global_admin()
    or is_iharc_user()
    or (portal.actor_is_approved() and core.has_org_permission(portal.actor_org_id(), 'portal.manage_consents', auth.uid()))
    or exists (
      select 1
      from core.person_consents c
      join core.user_people up on up.person_id = c.person_id
      where c.id = person_consent_orgs.consent_id
        and up.user_id = auth.uid()
    )
  );

create policy "person_consent_orgs_update" on core.person_consent_orgs
  for update
  using (
    auth.role() = 'service_role'
    or core.is_global_admin()
    or is_iharc_user()
    or (portal.actor_is_approved() and core.has_org_permission(portal.actor_org_id(), 'portal.manage_consents', auth.uid()))
    or exists (
      select 1
      from core.person_consents c
      join core.user_people up on up.person_id = c.person_id
      where c.id = person_consent_orgs.consent_id
        and up.user_id = auth.uid()
    )
  )
  with check (
    auth.role() = 'service_role'
    or core.is_global_admin()
    or is_iharc_user()
    or (portal.actor_is_approved() and core.has_org_permission(portal.actor_org_id(), 'portal.manage_consents', auth.uid()))
    or exists (
      select 1
      from core.person_consents c
      join core.user_people up on up.person_id = c.person_id
      where c.id = person_consent_orgs.consent_id
        and up.user_id = auth.uid()
    )
  );

create policy "person_consent_orgs_delete" on core.person_consent_orgs
  for delete
  using (
    core.is_global_admin()
  );

-- person_consent_requests
 drop policy if exists "person_consent_requests_select" on core.person_consent_requests;
 drop policy if exists "person_consent_requests_insert" on core.person_consent_requests;
 drop policy if exists "person_consent_requests_update" on core.person_consent_requests;
 drop policy if exists "person_consent_requests_delete" on core.person_consent_requests;

create policy "person_consent_requests_select" on core.person_consent_requests
  for select
  using (
    auth.role() = 'service_role'
    or core.is_global_admin()
    or is_iharc_user()
    or (portal.actor_is_approved() and core.has_org_permission(portal.actor_org_id(), 'portal.manage_consents', auth.uid()))
  );

create policy "person_consent_requests_insert" on core.person_consent_requests
  for insert
  with check (
    auth.role() = 'service_role'
    or core.is_global_admin()
    or is_iharc_user()
    or (portal.actor_is_approved() and core.has_org_permission(portal.actor_org_id(), 'portal.manage_consents', auth.uid()))
  );

create policy "person_consent_requests_update" on core.person_consent_requests
  for update
  using (
    auth.role() = 'service_role'
    or core.is_global_admin()
    or is_iharc_user()
    or (portal.actor_is_approved() and core.has_org_permission(portal.actor_org_id(), 'portal.manage_consents', auth.uid()))
  )
  with check (
    auth.role() = 'service_role'
    or core.is_global_admin()
    or is_iharc_user()
    or (portal.actor_is_approved() and core.has_org_permission(portal.actor_org_id(), 'portal.manage_consents', auth.uid()))
  );

create policy "person_consent_requests_delete" on core.person_consent_requests
  for delete
  using (
    core.is_global_admin()
  );

-- 13) Allow public select for public_settings (is_public=true)
 drop policy if exists "public_settings_select_public" on portal.public_settings;
create policy "public_settings_select_public" on portal.public_settings
  for select
  using (is_public = true);

-- 14) Update people policies to enforce consent for org grants
 drop policy if exists "people_select_policy" on core.people;
 drop policy if exists "people_update_policy" on core.people;

create policy "people_select_policy" on core.people
  for select
  using (
    core.is_global_admin()
    or is_iharc_user()
    or (created_by = auth.uid())
    or exists (
      select 1
      from core.user_people up
      where up.person_id = people.id
        and up.user_id = auth.uid()
    )
    or exists (
      select 1
      from core.person_access_grants g
      where g.person_id = people.id
        and (
          g.grantee_user_id = auth.uid()
          or (g.grantee_org_id is not null and core.is_org_member(g.grantee_org_id, auth.uid()))
        )
        and g.scope = any (array['view', 'update_contact', 'timeline_client', 'timeline_full'])
        and (g.expires_at is null or g.expires_at > now())
        and (
          (g.grantee_user_id = auth.uid() and portal.actor_org_id() is null)
          or core.fn_person_consent_allows_org(people.id, portal.actor_org_id())
        )
    )
  );

create policy "people_update_policy" on core.people
  for update
  using (
    core.is_global_admin()
    or is_iharc_user()
    or (created_by = auth.uid())
    or exists (
      select 1
      from core.user_people up
      where up.person_id = people.id
        and up.user_id = auth.uid()
    )
    or exists (
      select 1
      from core.person_access_grants g
      where g.person_id = people.id
        and (
          g.grantee_user_id = auth.uid()
          or (g.grantee_org_id is not null and core.is_org_member(g.grantee_org_id, auth.uid()))
        )
        and g.scope = any (array['update_contact', 'manage_consents'])
        and (g.expires_at is null or g.expires_at > now())
        and (
          (g.grantee_user_id = auth.uid() and portal.actor_org_id() is null)
          or core.fn_person_consent_allows_org(people.id, portal.actor_org_id())
        )
    )
  )
  with check (
    core.is_global_admin()
    or is_iharc_user()
    or (created_by = auth.uid())
    or exists (
      select 1
      from core.user_people up
      where up.person_id = people.id
        and up.user_id = auth.uid()
    )
    or exists (
      select 1
      from core.person_access_grants g
      where g.person_id = people.id
        and (
          g.grantee_user_id = auth.uid()
          or (g.grantee_org_id is not null and core.is_org_member(g.grantee_org_id, auth.uid()))
        )
        and g.scope = any (array['update_contact', 'manage_consents'])
        and (g.expires_at is null or g.expires_at > now())
        and (
          (g.grantee_user_id = auth.uid() and portal.actor_org_id() is null)
          or core.fn_person_consent_allows_org(people.id, portal.actor_org_id())
        )
    )
  );

-- 15) Update activities select policy to respect consent
 drop policy if exists "people_activities_select_policy" on core.people_activities;

create policy "people_activities_select_policy" on core.people_activities
  for select
  using (
    core.is_global_admin()
    or is_iharc_user()
    or exists (
      select 1
      from core.people p
      where p.id = people_activities.person_id
        and (
          p.created_by = auth.uid()
          or exists (
            select 1
            from core.user_people up
            where up.person_id = p.id
              and up.user_id = auth.uid()
          )
          or exists (
            select 1
            from core.person_access_grants g
            where g.person_id = p.id
              and (
                g.grantee_user_id = auth.uid()
                or (g.grantee_org_id is not null and core.is_org_member(g.grantee_org_id, auth.uid()))
              )
              and (
                (g.scope = 'timeline_client' and coalesce((people_activities.metadata ->> 'client_visible')::boolean, false) = true)
                or g.scope = any (array['timeline_full', 'write_notes'])
              )
              and (g.expires_at is null or g.expires_at > now())
              and (
                (g.grantee_user_id = auth.uid() and portal.actor_org_id() is null)
                or core.fn_person_consent_allows_org(p.id, portal.actor_org_id())
              )
          )
        )
    )
  );

-- 16) Reseed people name-only search helper index
create index if not exists people_name_only_name_idx on core.people (first_name, last_name);
