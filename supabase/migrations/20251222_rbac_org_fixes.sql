-- RBAC + org tenancy fixes

-- 1) Helper for IHARC-scoped permissions
create or replace function core.has_iharc_permission(permission_name text, p_user uuid default auth.uid())
returns boolean
language plpgsql
stable
security definer
set search_path to 'core', 'public'
as $$
declare
  iharc_org_id bigint := core.get_iharc_org_id();
begin
  if iharc_org_id is null then
    return false;
  end if;

  return core.has_org_permission(iharc_org_id, permission_name, p_user);
end;
$$;

-- 2) Enforce org_role_id matches organization_id on user_org_roles
create or replace function core.ensure_org_role_matches_org()
returns trigger
language plpgsql
security definer
set search_path to 'core', 'public'
as $$
declare
  role_org_id bigint;
begin
  select organization_id into role_org_id
  from core.org_roles
  where id = new.org_role_id;

  if role_org_id is null then
    raise exception 'Organization role not found.';
  end if;

  if role_org_id <> new.organization_id then
    raise exception 'Organization role does not belong to this organization.';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_user_org_role_matches_org on core.user_org_roles;
create trigger ensure_user_org_role_matches_org
before insert or update on core.user_org_roles
for each row
execute function core.ensure_org_role_matches_org();

-- 3) Indexes for org grants
create index if not exists person_access_grants_person_user_idx on core.person_access_grants(person_id, grantee_user_id);
create index if not exists person_access_grants_person_org_idx on core.person_access_grants(person_id, grantee_org_id);
create index if not exists person_access_grants_grantee_user_idx on core.person_access_grants(grantee_user_id);
create index if not exists person_access_grants_grantee_org_idx on core.person_access_grants(grantee_org_id);
create index if not exists person_access_grants_scope_idx on core.person_access_grants(scope);
create index if not exists person_access_grants_expires_at_idx on core.person_access_grants(expires_at);

-- 4) Core organizations policies (org-scoped)
drop policy if exists "organizations_select_policy" on core.organizations;
drop policy if exists "organizations_update_policy" on core.organizations;
drop policy if exists "organizations_insert_policy" on core.organizations;

create policy "organizations_select_policy" on core.organizations
  for select
  using (
    core.is_global_admin()
    or core.is_org_member(id, auth.uid())
  );

create policy "organizations_update_policy" on core.organizations
  for update
  using (
    core.is_global_admin()
    or core.has_org_permission(id, 'portal.manage_org_users', auth.uid())
  )
  with check (
    core.is_global_admin()
    or core.has_org_permission(id, 'portal.manage_org_users', auth.uid())
  );

create policy "organizations_insert_policy" on core.organizations
  for insert
  with check (
    core.is_global_admin()
  );

-- 5) Core people policies (org grants)
drop policy if exists "people_select_policy" on core.people;
drop policy if exists "people_update_policy" on core.people;
drop policy if exists "people_insert_policy" on core.people;
drop policy if exists "people_delete_policy" on core.people;

create policy "people_select_policy" on core.people
  for select
  using (
    core.is_global_admin()
    or is_iharc_user()
    or (created_by = auth.uid())
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
    )
  );

create policy "people_insert_policy" on core.people
  for insert
  with check (
    core.is_global_admin()
    or is_iharc_user()
  );

create policy "people_update_policy" on core.people
  for update
  using (
    core.is_global_admin()
    or is_iharc_user()
    or (created_by = auth.uid())
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
    )
  )
  with check (
    core.is_global_admin()
    or is_iharc_user()
    or (created_by = auth.uid())
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
    )
  );

create policy "people_delete_policy" on core.people
  for delete
  using (
    core.is_global_admin()
    or (has_permission_single('people.delete') or check_iharc_admin_role())
  );

-- 6) People activities policies (org grants)
drop policy if exists "people_activities_select_policy" on core.people_activities;
drop policy if exists "people_activities_insert_policy" on core.people_activities;
drop policy if exists "people_activities_update_policy" on core.people_activities;
drop policy if exists "people_activities_delete_policy" on core.people_activities;

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
          )
        )
    )
  );

create policy "people_activities_insert_policy" on core.people_activities
  for insert
  with check (
    core.is_global_admin()
    or is_iharc_user()
  );

create policy "people_activities_update_policy" on core.people_activities
  for update
  using (
    core.is_global_admin()
    or is_iharc_user()
  )
  with check (
    core.is_global_admin()
    or is_iharc_user()
  );

create policy "people_activities_delete_policy" on core.people_activities
  for delete
  using (
    core.is_global_admin()
    or (has_permission_single('people_activities.delete') or check_iharc_admin_role())
  );

-- 7) Person access grants policies
drop policy if exists "person_access_grants_select" on core.person_access_grants;
drop policy if exists "person_access_grants_insert" on core.person_access_grants;
drop policy if exists "person_access_grants_update" on core.person_access_grants;
drop policy if exists "person_access_grants_delete" on core.person_access_grants;

create policy "person_access_grants_select" on core.person_access_grants
  for select
  using (
    auth.role() = 'service_role'
    or core.is_global_admin()
    or (portal.actor_is_approved() and core.has_org_permission(portal.actor_org_id(), 'portal.manage_consents', auth.uid()))
    or grantee_user_id = auth.uid()
  );

create policy "person_access_grants_insert" on core.person_access_grants
  for insert
  with check (
    auth.role() = 'service_role'
    or core.is_global_admin()
    or (portal.actor_is_approved() and core.has_org_permission(portal.actor_org_id(), 'portal.manage_consents', auth.uid()))
  );

create policy "person_access_grants_update" on core.person_access_grants
  for update
  using (
    auth.role() = 'service_role'
    or core.is_global_admin()
    or (portal.actor_is_approved() and core.has_org_permission(portal.actor_org_id(), 'portal.manage_consents', auth.uid()))
  )
  with check (
    auth.role() = 'service_role'
    or core.is_global_admin()
    or (portal.actor_is_approved() and core.has_org_permission(portal.actor_org_id(), 'portal.manage_consents', auth.uid()))
  );

create policy "person_access_grants_delete" on core.person_access_grants
  for delete
  using (
    auth.role() = 'service_role'
    or core.is_global_admin()
    or (portal.actor_is_approved() and core.has_org_permission(portal.actor_org_id(), 'portal.manage_consents', auth.uid()))
  );

-- 8) Portal admin content policies to allow IHARC-permissioned staff
drop policy if exists "resource_pages_admin_all" on portal.resource_pages;
drop policy if exists "resource_pages_admin_select" on portal.resource_pages;
drop policy if exists "policies_admin_all" on portal.policies;
drop policy if exists "notifications_admin_all" on portal.notifications;
drop policy if exists "IHARC admins manage settings" on portal.public_settings;

create policy "resource_pages_admin_all" on portal.resource_pages
  for all
  using (
    portal.actor_is_approved()
    and (core.is_global_admin() or core.has_iharc_permission('portal.manage_resources', auth.uid()))
  )
  with check (
    portal.actor_is_approved()
    and (core.is_global_admin() or core.has_iharc_permission('portal.manage_resources', auth.uid()))
  );

create policy "resource_pages_admin_select" on portal.resource_pages
  for select
  using (
    portal.actor_is_approved()
    and (core.is_global_admin() or core.has_iharc_permission('portal.manage_resources', auth.uid()))
  );

create policy "policies_admin_all" on portal.policies
  for all
  using (
    portal.actor_is_approved()
    and (core.is_global_admin() or core.has_iharc_permission('portal.manage_policies', auth.uid()))
  )
  with check (
    portal.actor_is_approved()
    and (core.is_global_admin() or core.has_iharc_permission('portal.manage_policies', auth.uid()))
  );

create policy "notifications_admin_all" on portal.notifications
  for all
  using (
    portal.actor_is_approved()
    and (core.is_global_admin() or core.has_iharc_permission('portal.manage_notifications', auth.uid()))
  )
  with check (
    portal.actor_is_approved()
    and (core.is_global_admin() or core.has_iharc_permission('portal.manage_notifications', auth.uid()))
  );

create policy "IHARC admins manage settings" on portal.public_settings
  for all
  using (
    core.is_global_admin()
    or core.has_iharc_permission('portal.manage_website', auth.uid())
    or core.has_iharc_permission('portal.manage_footer', auth.uid())
  )
  with check (
    core.is_global_admin()
    or core.has_iharc_permission('portal.manage_website', auth.uid())
    or core.has_iharc_permission('portal.manage_footer', auth.uid())
  );

-- 9) Clean org templates that should not manage global content by default
delete from core.role_template_permissions rtp
using core.role_templates t, core.permissions p
where rtp.template_id = t.id
  and rtp.permission_id = p.id
  and t.name in ('org_admin', 'org_marketing')
  and p.name in (
    'portal.manage_website',
    'portal.manage_footer',
    'portal.manage_resources',
    'portal.manage_policies',
    'portal.manage_notifications'
  );

delete from core.org_role_permissions orp
using core.org_roles r, core.permissions p
where orp.org_role_id = r.id
  and orp.permission_id = p.id
  and p.name in (
    'portal.manage_website',
    'portal.manage_footer',
    'portal.manage_resources',
    'portal.manage_policies',
    'portal.manage_notifications'
  )
  and (core.get_iharc_org_id() is null or r.organization_id <> core.get_iharc_org_id());
