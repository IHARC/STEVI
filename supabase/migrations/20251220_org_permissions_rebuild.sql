-- Rebuild roles/permissions to org-scoped RBAC with global IHARC admin

-- 1) Ensure new permissions exist
insert into core.permissions (name, description, domain, category, created_by, updated_by)
values
  ('portal.access_frontline', 'Access frontline operations', 'portal', 'portal', null, null),
  ('portal.access_org', 'Access organization operations', 'portal', 'portal', null, null),
  ('portal.manage_website', 'Manage website content', 'portal', 'portal', null, null),
  ('portal.manage_consents', 'Manage consent workflows', 'portal', 'portal', null, null)
on conflict (name) do nothing;

-- 2) New tables
create table if not exists core.global_roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_name text not null,
  description text,
  is_system_role boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid,
  updated_by uuid
);

create table if not exists core.user_global_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references core.global_roles(id) on delete cascade,
  granted_by uuid,
  granted_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid,
  updated_by uuid,
  unique(user_id, role_id)
);

create table if not exists core.role_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid,
  updated_by uuid
);

create table if not exists core.role_template_permissions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references core.role_templates(id) on delete cascade,
  permission_id uuid not null references core.permissions(id) on delete cascade,
  granted_by uuid,
  granted_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid,
  updated_by uuid,
  unique(template_id, permission_id)
);

create table if not exists core.org_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id bigint not null references core.organizations(id) on delete cascade,
  name text not null,
  display_name text not null,
  description text,
  template_id uuid references core.role_templates(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid,
  updated_by uuid,
  unique(organization_id, name)
);

create table if not exists core.org_role_permissions (
  id uuid primary key default gen_random_uuid(),
  org_role_id uuid not null references core.org_roles(id) on delete cascade,
  permission_id uuid not null references core.permissions(id) on delete cascade,
  granted_by uuid,
  granted_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid,
  updated_by uuid,
  unique(org_role_id, permission_id)
);

create table if not exists core.user_org_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id bigint not null references core.organizations(id) on delete cascade,
  org_role_id uuid not null references core.org_roles(id) on delete cascade,
  granted_by uuid,
  granted_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid,
  updated_by uuid,
  unique(user_id, organization_id, org_role_id)
);

create index if not exists user_org_roles_user_org_idx on core.user_org_roles(user_id, organization_id);
create index if not exists user_org_roles_org_idx on core.user_org_roles(organization_id);
create index if not exists org_roles_org_idx on core.org_roles(organization_id);

-- 3) New helper functions
create or replace function core.get_iharc_org_id()
returns bigint
language sql
stable
security definer
set search_path to 'core', 'public'
as $$
  select id
  from core.organizations
  where lower(name) = 'iharc'
    and is_active = true
  order by id asc
  limit 1;
$$;

create or replace function core.is_global_admin(p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path to 'core', 'public'
as $$
  select exists (
    select 1
    from core.user_global_roles ugr
    join core.global_roles gr on gr.id = ugr.role_id
    where ugr.user_id = coalesce(p_user, auth.uid())
      and gr.name = 'iharc_admin'
  );
$$;

create or replace function core.is_org_member(p_org_id bigint, p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path to 'core', 'public'
as $$
  select exists (
    select 1
    from core.user_org_roles uor
    where uor.user_id = coalesce(p_user, auth.uid())
      and uor.organization_id = p_org_id
  );
$$;

create or replace function core.has_org_permission(p_org_id bigint, permission_name text, p_user uuid default auth.uid())
returns boolean
language plpgsql
security definer
set search_path to 'core', 'public'
as $$
begin
  if p_user is null then
    return false;
  end if;

  if core.is_global_admin(p_user) then
    return true;
  end if;

  if p_org_id is null then
    return false;
  end if;

  return exists (
    select 1
    from core.user_org_roles uor
    join core.org_role_permissions rp on rp.org_role_id = uor.org_role_id
    join core.permissions p on p.id = rp.permission_id
    where uor.user_id = p_user
      and uor.organization_id = p_org_id
      and p.name = permission_name
  );
end;
$$;

create or replace function core.get_actor_global_roles(p_user uuid default auth.uid())
returns table(role_name text)
language sql
stable
security definer
set search_path to 'core', 'public'
as $$
  select gr.name
  from core.user_global_roles ugr
  join core.global_roles gr on gr.id = ugr.role_id
  where ugr.user_id = coalesce(p_user, auth.uid());
$$;

create or replace function core.get_actor_org_roles(p_org_id bigint default null)
returns table(role_id uuid, role_name text, role_display_name text)
language sql
stable
security definer
set search_path to 'core', 'portal', 'public'
as $$
  select r.id, r.name, r.display_name
  from core.user_org_roles uor
  join core.org_roles r on r.id = uor.org_role_id
  where uor.user_id = auth.uid()
    and uor.organization_id = coalesce(p_org_id, portal.actor_org_id());
$$;

create or replace function core.get_actor_org_permissions(p_org_id bigint default null)
returns table(permission_name text)
language plpgsql
security definer
set search_path to 'core', 'portal', 'public'
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  if core.is_global_admin(auth.uid()) then
    return query
      select name
      from core.permissions
      order by name;
    return;
  end if;

  return query
    select distinct p.name
    from core.user_org_roles uor
    join core.org_role_permissions rp on rp.org_role_id = uor.org_role_id
    join core.permissions p on p.id = rp.permission_id
    where uor.user_id = auth.uid()
      and uor.organization_id = coalesce(p_org_id, portal.actor_org_id());
end;
$$;

-- 4) Update public helper functions to new RBAC
create or replace function public.check_iharc_admin_role()
returns boolean
language sql
stable
security definer
set search_path to 'core', 'public'
as $$
  select core.is_global_admin(auth.uid());
$$;

create or replace function public.check_iharc_role()
returns boolean
language sql
stable
security definer
set search_path to 'core', 'public'
as $$
  select case
    when core.get_iharc_org_id() is null then false
    else core.is_org_member(core.get_iharc_org_id(), auth.uid())
  end;
$$;

create or replace function public.is_iharc_user()
returns boolean
language sql
stable
security definer
set search_path to 'core', 'public'
as $$
  select case
    when core.get_iharc_org_id() is null then false
    else core.is_org_member(core.get_iharc_org_id(), auth.uid())
  end;
$$;

create or replace function public.has_permission_single(permission_name text)
returns boolean
language plpgsql
security definer
set search_path to 'core', 'public'
as $$
declare
  iharc_org_id bigint := core.get_iharc_org_id();
begin
  if iharc_org_id is null then
    return false;
  end if;

  return core.has_org_permission(iharc_org_id, permission_name, auth.uid());
end;
$$;

-- 5) RLS for new tables
alter table core.global_roles enable row level security;
alter table core.user_global_roles enable row level security;
alter table core.role_templates enable row level security;
alter table core.role_template_permissions enable row level security;
alter table core.org_roles enable row level security;
alter table core.org_role_permissions enable row level security;
alter table core.user_org_roles enable row level security;

-- Global roles
create policy "global_roles_select_admin" on core.global_roles
  for select
  using (core.is_global_admin());
create policy "global_roles_manage_admin" on core.global_roles
  for all
  using (core.is_global_admin())
  with check (core.is_global_admin());

create policy "user_global_roles_select_self" on core.user_global_roles
  for select
  using (core.is_global_admin() or user_id = auth.uid());
create policy "user_global_roles_manage_admin" on core.user_global_roles
  for all
  using (core.is_global_admin())
  with check (core.is_global_admin());

-- Role templates
create policy "role_templates_select_admin" on core.role_templates
  for select
  using (core.is_global_admin());
create policy "role_templates_manage_admin" on core.role_templates
  for all
  using (core.is_global_admin())
  with check (core.is_global_admin());

create policy "role_template_permissions_select_admin" on core.role_template_permissions
  for select
  using (core.is_global_admin());
create policy "role_template_permissions_manage_admin" on core.role_template_permissions
  for all
  using (core.is_global_admin())
  with check (core.is_global_admin());

-- Org roles
create policy "org_roles_select_members" on core.org_roles
  for select
  using (core.is_global_admin() or core.is_org_member(organization_id, auth.uid()));
create policy "org_roles_manage_admin" on core.org_roles
  for all
  using (core.is_global_admin())
  with check (core.is_global_admin());

create policy "org_role_permissions_select_members" on core.org_role_permissions
  for select
  using (core.is_global_admin() or exists (
    select 1 from core.org_roles r
    where r.id = org_role_id and core.is_org_member(r.organization_id, auth.uid())
  ));
create policy "org_role_permissions_manage_admin" on core.org_role_permissions
  for all
  using (core.is_global_admin())
  with check (core.is_global_admin());

-- User org roles
create policy "user_org_roles_select_members" on core.user_org_roles
  for select
  using (
    core.is_global_admin()
    or user_id = auth.uid()
    or core.has_org_permission(organization_id, 'portal.manage_org_users', auth.uid())
  );
create policy "user_org_roles_manage_org_admin" on core.user_org_roles
  for all
  using (
    core.is_global_admin()
    or core.has_org_permission(organization_id, 'portal.manage_org_users', auth.uid())
  )
  with check (
    core.is_global_admin()
    or core.has_org_permission(organization_id, 'portal.manage_org_users', auth.uid())
  );

-- 6) Seed global role + templates (derived from legacy roles where possible)
insert into core.global_roles (name, display_name, description, is_system_role)
values ('iharc_admin', 'IHARC Admin', 'Global administrator for STEVI', true)
on conflict (name) do nothing;

insert into core.role_templates (name, display_name, description)
values
  ('org_admin', 'Org Admin', 'Default organization administrator role'),
  ('org_rep', 'Org Representative', 'Organization representative role'),
  ('org_member', 'Org Member', 'Default organization member role'),
  ('org_marketing', 'Org Marketing', 'Organization marketing role'),
  ('iharc_staff', 'IHARC Staff', 'IHARC staff role'),
  ('iharc_supervisor', 'IHARC Supervisor', 'IHARC supervisor role'),
  ('iharc_volunteer', 'IHARC Volunteer', 'IHARC volunteer role')
on conflict (name) do nothing;

-- Map legacy role permissions onto templates when available
insert into core.role_template_permissions (template_id, permission_id)
select t.id, rp.permission_id
from core.role_templates t
join core.roles r on r.name = 'portal_org_admin'
join core.role_permissions rp on rp.role_id = r.id
where t.name = 'org_admin'
on conflict do nothing;

insert into core.role_template_permissions (template_id, permission_id)
select t.id, rp.permission_id
from core.role_templates t
join core.roles r on r.name = 'portal_org_rep'
join core.role_permissions rp on rp.role_id = r.id
where t.name = 'org_rep'
on conflict do nothing;

insert into core.role_template_permissions (template_id, permission_id)
select t.id, rp.permission_id
from core.role_templates t
join core.roles r on r.name = 'portal_user'
join core.role_permissions rp on rp.role_id = r.id
where t.name = 'org_member'
on conflict do nothing;

insert into core.role_template_permissions (template_id, permission_id)
select t.id, rp.permission_id
from core.role_templates t
join core.roles r on r.name = 'iharc_staff'
join core.role_permissions rp on rp.role_id = r.id
where t.name = 'iharc_staff'
on conflict do nothing;

insert into core.role_template_permissions (template_id, permission_id)
select t.id, rp.permission_id
from core.role_templates t
join core.roles r on r.name = 'iharc_supervisor'
join core.role_permissions rp on rp.role_id = r.id
where t.name = 'iharc_supervisor'
on conflict do nothing;

insert into core.role_template_permissions (template_id, permission_id)
select t.id, rp.permission_id
from core.role_templates t
join core.roles r on r.name = 'iharc_volunteer'
join core.role_permissions rp on rp.role_id = r.id
where t.name = 'iharc_volunteer'
on conflict do nothing;

-- Ensure baseline portal access permissions exist on org templates
insert into core.role_template_permissions (template_id, permission_id)
select t.id, p.id
from core.role_templates t
join core.permissions p on p.name = 'portal.access_org'
where t.name in ('org_admin', 'org_rep', 'org_member', 'org_marketing')
on conflict do nothing;

insert into core.role_template_permissions (template_id, permission_id)
select t.id, p.id
from core.role_templates t
join core.permissions p on p.name = 'portal.access_frontline'
where t.name in ('org_admin', 'org_rep', 'iharc_staff', 'iharc_supervisor')
on conflict do nothing;

insert into core.role_template_permissions (template_id, permission_id)
select t.id, p.id
from core.role_templates t
join core.permissions p on p.name = 'portal.manage_org_users'
where t.name in ('org_admin')
on conflict do nothing;

insert into core.role_template_permissions (template_id, permission_id)
select t.id, p.id
from core.role_templates t
join core.permissions p on p.name = 'portal.manage_org_invites'
where t.name in ('org_admin', 'org_rep')
on conflict do nothing;

insert into core.role_template_permissions (template_id, permission_id)
select t.id, p.id
from core.role_templates t
join core.permissions p on p.name = 'portal.manage_website'
where t.name in ('org_admin', 'org_marketing')
on conflict do nothing;

insert into core.role_template_permissions (template_id, permission_id)
select t.id, p.id
from core.role_templates t
join core.permissions p on p.name = 'portal.manage_footer'
where t.name in ('org_admin', 'org_marketing')
on conflict do nothing;

insert into core.role_template_permissions (template_id, permission_id)
select t.id, p.id
from core.role_templates t
join core.permissions p on p.name = 'portal.manage_resources'
where t.name in ('org_admin', 'org_marketing')
on conflict do nothing;

insert into core.role_template_permissions (template_id, permission_id)
select t.id, p.id
from core.role_templates t
join core.permissions p on p.name = 'portal.manage_policies'
where t.name in ('org_admin', 'org_marketing')
on conflict do nothing;

insert into core.role_template_permissions (template_id, permission_id)
select t.id, p.id
from core.role_templates t
join core.permissions p on p.name = 'portal.manage_consents'
where t.name in ('org_admin', 'iharc_staff', 'iharc_supervisor')
on conflict do nothing;

insert into core.role_template_permissions (template_id, permission_id)
select t.id, p.id
from core.role_templates t
join core.permissions p on p.name = 'portal.view_metrics'
where t.name in ('org_admin')
on conflict do nothing;

insert into core.role_template_permissions (template_id, permission_id)
select t.id, p.id
from core.role_templates t
join core.permissions p on p.name = 'portal.manage_notifications'
where t.name in ('org_admin')
on conflict do nothing;

insert into core.role_template_permissions (template_id, permission_id)
select t.id, p.id
from core.role_templates t
join core.permissions p on p.name = 'inventory.read'
where t.name in ('iharc_staff', 'iharc_supervisor', 'iharc_admin')
on conflict do nothing;

insert into core.role_template_permissions (template_id, permission_id)
select t.id, p.id
from core.role_templates t
join core.permissions p on p.name = 'inventory.admin'
where t.name in ('iharc_supervisor')
on conflict do nothing;

-- 7) Create org roles for all active organizations (base templates)
insert into core.org_roles (organization_id, name, display_name, description, template_id)
select o.id, t.name, t.display_name, t.description, t.id
from core.organizations o
join core.role_templates t on t.name in ('org_admin', 'org_rep', 'org_member', 'org_marketing')
where o.is_active = true
on conflict (organization_id, name) do nothing;

-- IHARC-specific roles in IHARC org
insert into core.org_roles (organization_id, name, display_name, description, template_id)
select iharc_org.id, t.name, t.display_name, t.description, t.id
from (select core.get_iharc_org_id() as id) iharc_org
join core.role_templates t on t.name in ('iharc_staff', 'iharc_supervisor', 'iharc_volunteer')
where iharc_org.id is not null
on conflict (organization_id, name) do nothing;

-- 8) Apply template permissions to org roles
insert into core.org_role_permissions (org_role_id, permission_id)
select r.id, tp.permission_id
from core.org_roles r
join core.role_template_permissions tp on tp.template_id = r.template_id
on conflict do nothing;

-- 9) Migrate legacy assignments
-- Global admins (iharc_admin + legacy portal_admin)
insert into core.user_global_roles (user_id, role_id, granted_by)
select ur.user_id, gr.id, ur.granted_by
from core.user_roles ur
join core.roles r on r.id = ur.role_id
join core.global_roles gr on gr.name = 'iharc_admin'
where r.name in ('iharc_admin', 'portal_admin')
on conflict do nothing;

-- Org-scoped roles for partner orgs based on profile organization_id
insert into core.user_org_roles (user_id, organization_id, org_role_id, granted_by)
select ur.user_id, p.organization_id, rnew.id, ur.granted_by
from core.user_roles ur
join core.roles r on r.id = ur.role_id
join portal.profiles p on p.user_id = ur.user_id
join core.org_roles rnew on rnew.organization_id = p.organization_id and rnew.name = 'org_admin'
where r.name = 'portal_org_admin'
  and p.organization_id is not null
on conflict do nothing;

insert into core.user_org_roles (user_id, organization_id, org_role_id, granted_by)
select ur.user_id, p.organization_id, rnew.id, ur.granted_by
from core.user_roles ur
join core.roles r on r.id = ur.role_id
join portal.profiles p on p.user_id = ur.user_id
join core.org_roles rnew on rnew.organization_id = p.organization_id and rnew.name = 'org_rep'
where r.name = 'portal_org_rep'
  and p.organization_id is not null
on conflict do nothing;

insert into core.user_org_roles (user_id, organization_id, org_role_id, granted_by)
select ur.user_id, p.organization_id, rnew.id, ur.granted_by
from core.user_roles ur
join core.roles r on r.id = ur.role_id
join portal.profiles p on p.user_id = ur.user_id
join core.org_roles rnew on rnew.organization_id = p.organization_id and rnew.name = 'org_member'
where r.name = 'portal_user'
  and p.organization_id is not null
on conflict do nothing;

-- IHARC org roles mapped from legacy iharc roles
insert into core.user_org_roles (user_id, organization_id, org_role_id, granted_by)
select ur.user_id, iharc_org.id, rnew.id, ur.granted_by
from (select core.get_iharc_org_id() as id) iharc_org
join core.org_roles rnew on rnew.organization_id = iharc_org.id and rnew.name = 'iharc_staff'
join core.user_roles ur on true
join core.roles r on r.id = ur.role_id
where r.name = 'iharc_staff'
  and iharc_org.id is not null
on conflict do nothing;

insert into core.user_org_roles (user_id, organization_id, org_role_id, granted_by)
select ur.user_id, iharc_org.id, rnew.id, ur.granted_by
from (select core.get_iharc_org_id() as id) iharc_org
join core.org_roles rnew on rnew.organization_id = iharc_org.id and rnew.name = 'iharc_supervisor'
join core.user_roles ur on true
join core.roles r on r.id = ur.role_id
where r.name = 'iharc_supervisor'
  and iharc_org.id is not null
on conflict do nothing;

insert into core.user_org_roles (user_id, organization_id, org_role_id, granted_by)
select ur.user_id, iharc_org.id, rnew.id, ur.granted_by
from (select core.get_iharc_org_id() as id) iharc_org
join core.org_roles rnew on rnew.organization_id = iharc_org.id and rnew.name = 'iharc_volunteer'
join core.user_roles ur on true
join core.roles r on r.id = ur.role_id
where r.name = 'iharc_volunteer'
  and iharc_org.id is not null
on conflict do nothing;

-- 10) Update portal policies to new permission checks
-- Appointments
DROP POLICY IF EXISTS "appointments_delete_admin" ON portal.appointments;
CREATE POLICY "appointments_delete_admin" ON portal.appointments
  FOR DELETE
  USING (core.is_global_admin());

DROP POLICY IF EXISTS "appointments_insert_privileged" ON portal.appointments;
CREATE POLICY "appointments_insert_privileged" ON portal.appointments
  FOR INSERT
  WITH CHECK (
    core.is_global_admin()
    OR (
      organization_id IS NOT NULL
      AND organization_id = portal.actor_org_id()
      AND (
        core.has_org_permission(portal.actor_org_id(), 'portal.access_frontline', auth.uid())
        OR core.has_org_permission(portal.actor_org_id(), 'portal.access_org', auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "appointments_select_participants" ON portal.appointments;
CREATE POLICY "appointments_select_participants" ON portal.appointments
  FOR SELECT
  USING (
    portal.current_profile_id() IS NOT NULL
    AND (
      client_profile_id = portal.current_profile_id()
      OR requester_profile_id = portal.current_profile_id()
      OR staff_profile_id = portal.current_profile_id()
      OR (
        organization_id IS NOT NULL
        AND organization_id = portal.actor_org_id()
        AND (
          core.has_org_permission(portal.actor_org_id(), 'portal.access_frontline', auth.uid())
          OR core.has_org_permission(portal.actor_org_id(), 'portal.access_org', auth.uid())
        )
      )
      OR core.is_global_admin()
    )
  );

DROP POLICY IF EXISTS "appointments_update_privileged" ON portal.appointments;
CREATE POLICY "appointments_update_privileged" ON portal.appointments
  FOR UPDATE
  USING (
    staff_profile_id = portal.current_profile_id()
    OR core.is_global_admin()
    OR (
      organization_id IS NOT NULL
      AND organization_id = portal.actor_org_id()
      AND (
        core.has_org_permission(portal.actor_org_id(), 'portal.access_frontline', auth.uid())
        OR core.has_org_permission(portal.actor_org_id(), 'portal.access_org', auth.uid())
      )
    )
  )
  WITH CHECK (
    staff_profile_id = portal.current_profile_id()
    OR core.is_global_admin()
    OR (
      organization_id IS NOT NULL
      AND organization_id = portal.actor_org_id()
      AND (
        core.has_org_permission(portal.actor_org_id(), 'portal.access_frontline', auth.uid())
        OR core.has_org_permission(portal.actor_org_id(), 'portal.access_org', auth.uid())
      )
    )
  );

-- Audit log
DROP POLICY IF EXISTS "audit_log_admin_insert" ON portal.audit_log;
CREATE POLICY "audit_log_admin_insert" ON portal.audit_log
  FOR INSERT
  WITH CHECK (portal.actor_is_approved() AND core.is_global_admin());

DROP POLICY IF EXISTS "audit_log_admin_select" ON portal.audit_log;
CREATE POLICY "audit_log_admin_select" ON portal.audit_log
  FOR SELECT
  USING (portal.actor_is_approved() AND core.is_global_admin());

-- Notifications + relays
DROP POLICY IF EXISTS "relays_manage_admins" ON portal.notification_relays;
CREATE POLICY "relays_manage_admins" ON portal.notification_relays
  FOR ALL
  USING (core.is_global_admin())
  WITH CHECK (core.is_global_admin());

DROP POLICY IF EXISTS "relays_select_admins" ON portal.notification_relays;
CREATE POLICY "relays_select_admins" ON portal.notification_relays
  FOR SELECT
  USING (core.is_global_admin());

DROP POLICY IF EXISTS "notifications_admin_all" ON portal.notifications;
CREATE POLICY "notifications_admin_all" ON portal.notifications
  FOR ALL
  USING (portal.actor_is_approved() AND core.is_global_admin())
  WITH CHECK (portal.actor_is_approved() AND core.is_global_admin());

-- Profiles
DROP POLICY IF EXISTS "profiles_select_admin" ON portal.profiles;
CREATE POLICY "profiles_select_admin" ON portal.profiles
  FOR SELECT
  USING (portal.actor_is_approved() AND core.is_global_admin());

DROP POLICY IF EXISTS "profiles_select_org" ON portal.profiles;
CREATE POLICY "profiles_select_org" ON portal.profiles
  FOR SELECT
  USING (
    portal.actor_is_approved()
    AND organization_id = portal.actor_org_id()
    AND (
      core.has_org_permission(portal.actor_org_id(), 'portal.manage_org_users', auth.uid())
      OR core.has_org_permission(portal.actor_org_id(), 'portal.manage_org_invites', auth.uid())
    )
  );

DROP POLICY IF EXISTS "profiles_insert" ON portal.profiles;
CREATE POLICY "profiles_insert" ON portal.profiles
  FOR INSERT
  WITH CHECK (
    (auth.role() = 'service_role')
    OR (user_id = auth.uid())
    OR (
      portal.actor_is_approved()
      AND organization_id = portal.actor_org_id()
      AND core.has_org_permission(portal.actor_org_id(), 'portal.manage_org_users', auth.uid())
    )
  );

DROP POLICY IF EXISTS "profiles_update" ON portal.profiles;
CREATE POLICY "profiles_update" ON portal.profiles
  FOR UPDATE
  USING (
    (auth.role() = 'service_role')
    OR (portal.actor_is_approved() AND user_id = auth.uid())
    OR (portal.actor_is_approved() AND core.is_global_admin())
    OR (
      portal.actor_is_approved()
      AND organization_id = portal.actor_org_id()
      AND core.has_org_permission(portal.actor_org_id(), 'portal.manage_org_users', auth.uid())
    )
  )
  WITH CHECK (
    (auth.role() = 'service_role')
    OR (portal.actor_is_approved() AND user_id = auth.uid())
    OR (portal.actor_is_approved() AND core.is_global_admin())
    OR (
      portal.actor_is_approved()
      AND organization_id = portal.actor_org_id()
      AND core.has_org_permission(portal.actor_org_id(), 'portal.manage_org_users', auth.uid())
    )
  );

DROP POLICY IF EXISTS "profiles_delete" ON portal.profiles;
CREATE POLICY "profiles_delete" ON portal.profiles
  FOR DELETE
  USING (
    (portal.actor_is_approved() AND core.is_global_admin())
    OR (
      portal.actor_is_approved()
      AND organization_id = portal.actor_org_id()
      AND core.has_org_permission(portal.actor_org_id(), 'portal.manage_org_users', auth.uid())
    )
  );

-- Public settings + resources
DROP POLICY IF EXISTS "Portal admins manage settings" ON portal.public_settings;
CREATE POLICY "IHARC admins manage settings" ON portal.public_settings
  FOR ALL
  USING (core.is_global_admin())
  WITH CHECK (core.is_global_admin());

DROP POLICY IF EXISTS "resource_pages_admin_all" ON portal.resource_pages;
CREATE POLICY "resource_pages_admin_all" ON portal.resource_pages
  FOR ALL
  USING (portal.actor_is_approved() AND core.is_global_admin())
  WITH CHECK (portal.actor_is_approved() AND core.is_global_admin());

DROP POLICY IF EXISTS "resource_pages_admin_select" ON portal.resource_pages;
CREATE POLICY "resource_pages_admin_select" ON portal.resource_pages
  FOR SELECT
  USING (portal.actor_is_approved() AND core.is_global_admin());

-- Storage: app-branding bucket policies
DROP POLICY IF EXISTS "app_branding_insert" ON storage.objects;
CREATE POLICY "app_branding_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'app-branding'
    AND owner = auth.uid()
    AND POSITION('..' IN name) = 0
    AND (
      name LIKE 'hero/%'
      OR name LIKE 'logo-light/%'
      OR name LIKE 'logo-dark/%'
      OR name LIKE 'favicon/%'
    )
    AND (
      auth.role() = 'service_role'
      OR core.is_global_admin()
    )
  );

DROP POLICY IF EXISTS "app_branding_update" ON storage.objects;
CREATE POLICY "app_branding_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'app-branding'
    AND owner = auth.uid()
    AND (
      auth.role() = 'service_role'
      OR core.is_global_admin()
    )
  )
  WITH CHECK (
    bucket_id = 'app-branding'
    AND owner = auth.uid()
    AND POSITION('..' IN name) = 0
    AND (
      name LIKE 'hero/%'
      OR name LIKE 'logo-light/%'
      OR name LIKE 'logo-dark/%'
      OR name LIKE 'favicon/%'
    )
  );

DROP POLICY IF EXISTS "app_branding_delete" ON storage.objects;
CREATE POLICY "app_branding_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'app-branding'
    AND owner = auth.uid()
    AND (
      auth.role() = 'service_role'
      OR core.is_global_admin()
    )
  );

-- Core permissions policies
DROP POLICY IF EXISTS "permissions_admin_all" ON core.permissions;
CREATE POLICY "permissions_admin_all" ON core.permissions
  FOR ALL
  USING (portal.actor_is_approved() AND core.is_global_admin())
  WITH CHECK (portal.actor_is_approved() AND core.is_global_admin());

DROP POLICY IF EXISTS "permissions_admin_select" ON core.permissions;
CREATE POLICY "permissions_admin_select" ON core.permissions
  FOR SELECT
  USING (portal.actor_is_approved() AND core.is_global_admin());

-- 11) Drop legacy structures + functions (no back-compat)
DROP TABLE IF EXISTS core.role_permissions CASCADE;
DROP TABLE IF EXISTS core.user_roles CASCADE;
DROP TABLE IF EXISTS core.roles CASCADE;

DROP FUNCTION IF EXISTS core.refresh_user_permissions(uuid);
DROP FUNCTION IF EXISTS core.get_user_roles(uuid);
DROP FUNCTION IF EXISTS core.get_user_permissions(uuid);
DROP FUNCTION IF EXISTS core.has_permission(text);
DROP FUNCTION IF EXISTS core.is_user_in_roles(text[], uuid);
DROP FUNCTION IF EXISTS portal.set_profile_role(uuid, text, boolean);
