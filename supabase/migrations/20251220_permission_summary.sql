create or replace function core.get_actor_permissions_summary(p_user uuid default auth.uid())
returns table(permission_name text)
language plpgsql
security definer
set search_path to 'core', 'public'
as $$
begin
  if p_user is null then
    return;
  end if;

  if core.is_global_admin(p_user) then
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
    where uor.user_id = p_user;
end;
$$;
