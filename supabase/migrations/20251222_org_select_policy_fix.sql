-- Allow IHARC staff to view organizations while still enabling org members to view their own org

drop policy if exists "organizations_select_policy" on core.organizations;

create policy "organizations_select_policy" on core.organizations
  for select
  using (
    core.is_global_admin()
    or is_iharc_user()
    or core.is_org_member(id, auth.uid())
  );
