-- Org-scoped staff time tracking + volunteer roles

-- 1) Role kind enum
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'org_role_kind' and n.nspname = 'core'
  ) then
    create type core.org_role_kind as enum ('staff', 'volunteer');
  end if;
end $$;

-- 2) Add role_kind to templates + org roles
alter table core.role_templates
  add column if not exists role_kind core.org_role_kind not null default 'staff';

alter table core.org_roles
  add column if not exists role_kind core.org_role_kind not null default 'staff';

-- 3) Seed org volunteer template + backfill volunteer kinds
insert into core.role_templates (name, display_name, description, role_kind)
values ('org_volunteer', 'Org Volunteer', 'Organization volunteer role', 'volunteer')
on conflict (name) do nothing;

update core.role_templates
set role_kind = 'volunteer'
where name = 'iharc_volunteer';

-- Propagate template role_kind to org roles
update core.org_roles r
set role_kind = t.role_kind
from core.role_templates t
where r.template_id = t.id;

-- Ensure org volunteer role exists for every organization
insert into core.org_roles (organization_id, name, display_name, description, template_id, role_kind)
select o.id,
  'org_volunteer',
  'Org Volunteer',
  'Organization volunteer role',
  t.id,
  t.role_kind
from core.organizations o
join core.role_templates t on t.name = 'org_volunteer'
where not exists (
  select 1
  from core.org_roles r
  where r.organization_id = o.id
    and r.name = 'org_volunteer'
);

-- 4) Staff time entry schema updates
alter table core.staff_time_entries
  add column if not exists organization_id bigint,
  add column if not exists role_name text,
  add column if not exists role_kind core.org_role_kind,
  add column if not exists hourly_rate_snapshot numeric(12,2),
  add column if not exists cost_amount_snapshot numeric(14,2),
  add column if not exists currency text,
  add column if not exists break_minutes integer,
  add column if not exists total_minutes integer,
  add column if not exists cost_event_id uuid references core.cost_events(id) on delete set null,
  add column if not exists source_type text,
  add column if not exists source_id text,
  add column if not exists metadata jsonb;

alter table core.staff_time_entries
  add constraint staff_time_entries_org_id_fkey
  foreign key (organization_id)
  references core.organizations(id)
  on delete restrict;

alter table core.staff_time_entries
  alter column role_kind set default 'staff',
  alter column currency set default 'CAD',
  alter column break_minutes set default 0,
  alter column total_minutes set default 0;

do $$
declare
  iharc_org_id bigint := core.get_iharc_org_id();
begin
  if iharc_org_id is null then
    raise exception 'IHARC organization not found; cannot backfill staff_time_entries.organization_id';
  end if;

  update core.staff_time_entries
  set organization_id = iharc_org_id
  where organization_id is null;
end $$;

update core.staff_time_entries
set role_name = coalesce(role_name, 'iharc_staff'),
  role_kind = coalesce(role_kind, 'staff'),
  currency = coalesce(currency, 'CAD'),
  break_minutes = coalesce(break_minutes, 0),
  total_minutes = coalesce(total_minutes, 0);

update core.staff_time_entries t
set break_minutes = coalesce((
  select floor(sum(extract(epoch from (b.ended_at - b.started_at))) / 60)
  from core.staff_break_entries b
  where b.time_entry_id = t.id
    and b.ended_at is not null
), 0);

update core.staff_time_entries t
set total_minutes = greatest(
  0,
  floor(extract(epoch from (t.shift_end - t.shift_start)) / 60) - t.break_minutes
)
where t.shift_end is not null;

alter table core.staff_time_entries
  alter column organization_id set not null,
  alter column role_name set not null,
  alter column role_kind set not null,
  alter column currency set not null,
  alter column break_minutes set not null,
  alter column total_minutes set not null;

create index if not exists staff_time_entries_org_idx on core.staff_time_entries (organization_id);
create index if not exists staff_time_entries_org_start_idx on core.staff_time_entries (organization_id, shift_start desc);

-- 5) Optional attribution table for future links (clients/appointments/programs)
create table if not exists core.staff_time_attributions (
  id uuid primary key default gen_random_uuid(),
  time_entry_id uuid not null references core.staff_time_entries(id) on delete cascade,
  organization_id bigint not null references core.organizations(id) on delete restrict,
  source_type text not null,
  source_id text not null,
  weight numeric(5,2) null,
  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid()
);

create index if not exists staff_time_attributions_entry_idx on core.staff_time_attributions (time_entry_id);
create index if not exists staff_time_attributions_org_idx on core.staff_time_attributions (organization_id);
create index if not exists staff_time_attributions_source_idx on core.staff_time_attributions (source_type, source_id);

-- 6) Permissions for time tracking
insert into core.permissions (name, description, domain, category, created_by, updated_by)
values
  ('staff_time.track', 'Track time by clocking in/out', 'staff_time', 'staff_time', null, null),
  ('staff_time.view_self', 'View own timecards', 'staff_time', 'staff_time', null, null),
  ('staff_time.view_all', 'View all org timecards', 'staff_time', 'staff_time', null, null),
  ('staff_time.manage', 'Manage org timecards', 'staff_time', 'staff_time', null, null)
on conflict (name) do nothing;

with permission_map(template_name, permission_name) as (
  values
    ('iharc_staff', 'staff_time.track'),
    ('iharc_staff', 'staff_time.view_self'),
    ('iharc_supervisor', 'staff_time.track'),
    ('iharc_supervisor', 'staff_time.view_self'),
    ('iharc_supervisor', 'staff_time.view_all'),
    ('iharc_supervisor', 'staff_time.manage'),
    ('iharc_volunteer', 'staff_time.track'),
    ('iharc_volunteer', 'staff_time.view_self'),
    ('org_admin', 'staff_time.track'),
    ('org_admin', 'staff_time.view_self'),
    ('org_admin', 'staff_time.view_all'),
    ('org_admin', 'staff_time.manage'),
    ('org_rep', 'staff_time.track'),
    ('org_rep', 'staff_time.view_self'),
    ('org_member', 'staff_time.track'),
    ('org_member', 'staff_time.view_self'),
    ('org_marketing', 'staff_time.track'),
    ('org_marketing', 'staff_time.view_self'),
    ('org_volunteer', 'staff_time.track'),
    ('org_volunteer', 'staff_time.view_self')
)
insert into core.role_template_permissions (template_id, permission_id, created_at, updated_at)
select rt.id, p.id, now(), now()
from permission_map pm
join core.role_templates rt on rt.name = pm.template_name
join core.permissions p on p.name = pm.permission_name
on conflict do nothing;

with permission_map(template_name, permission_name) as (
  values
    ('iharc_staff', 'staff_time.track'),
    ('iharc_staff', 'staff_time.view_self'),
    ('iharc_supervisor', 'staff_time.track'),
    ('iharc_supervisor', 'staff_time.view_self'),
    ('iharc_supervisor', 'staff_time.view_all'),
    ('iharc_supervisor', 'staff_time.manage'),
    ('iharc_volunteer', 'staff_time.track'),
    ('iharc_volunteer', 'staff_time.view_self'),
    ('org_admin', 'staff_time.track'),
    ('org_admin', 'staff_time.view_self'),
    ('org_admin', 'staff_time.view_all'),
    ('org_admin', 'staff_time.manage'),
    ('org_rep', 'staff_time.track'),
    ('org_rep', 'staff_time.view_self'),
    ('org_member', 'staff_time.track'),
    ('org_member', 'staff_time.view_self'),
    ('org_marketing', 'staff_time.track'),
    ('org_marketing', 'staff_time.view_self'),
    ('org_volunteer', 'staff_time.track'),
    ('org_volunteer', 'staff_time.view_self')
)
insert into core.org_role_permissions (org_role_id, permission_id, created_at, updated_at)
select r.id, p.id, now(), now()
from permission_map pm
join core.role_templates rt on rt.name = pm.template_name
join core.org_roles r on r.template_id = rt.id
join core.permissions p on p.name = pm.permission_name
on conflict do nothing;

-- 7) RLS policies (org-scoped)
alter table core.staff_time_entries enable row level security;
alter table core.staff_break_entries enable row level security;
alter table core.staff_time_attributions enable row level security;

drop policy if exists staff_time_entries_select_self on core.staff_time_entries;
drop policy if exists staff_time_entries_insert_self on core.staff_time_entries;
drop policy if exists staff_time_entries_update_self on core.staff_time_entries;
drop policy if exists staff_time_select_policy on core.staff_time_entries;
drop policy if exists staff_time_insert_policy on core.staff_time_entries;
drop policy if exists staff_time_update_policy on core.staff_time_entries;
drop policy if exists staff_time_delete_policy on core.staff_time_entries;

create policy staff_time_entries_select_self on core.staff_time_entries
  for select
  using (
    core.is_global_admin()
    or (
      organization_id = portal.actor_org_id()
      and user_id = auth.uid()
      and (
        core.has_org_permission(organization_id, 'staff_time.view_self', auth.uid())
        or core.has_org_permission(organization_id, 'staff_time.track', auth.uid())
      )
    )
  );

create policy staff_time_entries_select_org on core.staff_time_entries
  for select
  using (
    core.is_global_admin()
    or (
      organization_id = portal.actor_org_id()
      and (
        core.has_org_permission(organization_id, 'staff_time.view_all', auth.uid())
        or core.has_org_permission(organization_id, 'staff_time.manage', auth.uid())
      )
    )
  );

create policy staff_time_entries_insert_self on core.staff_time_entries
  for insert
  with check (
    core.is_global_admin()
    or (
      organization_id = portal.actor_org_id()
      and user_id = auth.uid()
      and core.has_org_permission(organization_id, 'staff_time.track', auth.uid())
    )
  );

create policy staff_time_entries_insert_admin on core.staff_time_entries
  for insert
  with check (
    core.is_global_admin()
    or (
      organization_id = portal.actor_org_id()
      and core.has_org_permission(organization_id, 'staff_time.manage', auth.uid())
    )
  );

create policy staff_time_entries_update_self on core.staff_time_entries
  for update
  using (
    core.is_global_admin()
    or (
      organization_id = portal.actor_org_id()
      and user_id = auth.uid()
      and core.has_org_permission(organization_id, 'staff_time.track', auth.uid())
    )
  )
  with check (
    core.is_global_admin()
    or (
      organization_id = portal.actor_org_id()
      and user_id = auth.uid()
      and core.has_org_permission(organization_id, 'staff_time.track', auth.uid())
    )
  );

create policy staff_time_entries_update_admin on core.staff_time_entries
  for update
  using (
    core.is_global_admin()
    or (
      organization_id = portal.actor_org_id()
      and core.has_org_permission(organization_id, 'staff_time.manage', auth.uid())
    )
  )
  with check (
    core.is_global_admin()
    or (
      organization_id = portal.actor_org_id()
      and core.has_org_permission(organization_id, 'staff_time.manage', auth.uid())
    )
  );

create policy staff_time_entries_delete_admin on core.staff_time_entries
  for delete
  using (
    core.is_global_admin()
    or (
      organization_id = portal.actor_org_id()
      and core.has_org_permission(organization_id, 'staff_time.manage', auth.uid())
    )
  );

drop policy if exists staff_break_entries_select_self on core.staff_break_entries;
drop policy if exists staff_break_entries_insert_self on core.staff_break_entries;
drop policy if exists staff_break_entries_update_self on core.staff_break_entries;
drop policy if exists staff_break_select_policy on core.staff_break_entries;
drop policy if exists staff_break_insert_policy on core.staff_break_entries;
drop policy if exists staff_break_update_policy on core.staff_break_entries;
drop policy if exists staff_break_delete_policy on core.staff_break_entries;

create policy staff_break_entries_select_self on core.staff_break_entries
  for select
  using (
    core.is_global_admin()
    or exists (
      select 1
      from core.staff_time_entries t
      where t.id = staff_break_entries.time_entry_id
        and t.organization_id = portal.actor_org_id()
        and t.user_id = auth.uid()
        and (
          core.has_org_permission(t.organization_id, 'staff_time.view_self', auth.uid())
          or core.has_org_permission(t.organization_id, 'staff_time.track', auth.uid())
        )
    )
  );

create policy staff_break_entries_select_org on core.staff_break_entries
  for select
  using (
    core.is_global_admin()
    or exists (
      select 1
      from core.staff_time_entries t
      where t.id = staff_break_entries.time_entry_id
        and t.organization_id = portal.actor_org_id()
        and (
          core.has_org_permission(t.organization_id, 'staff_time.view_all', auth.uid())
          or core.has_org_permission(t.organization_id, 'staff_time.manage', auth.uid())
        )
    )
  );

create policy staff_break_entries_insert_self on core.staff_break_entries
  for insert
  with check (
    core.is_global_admin()
    or exists (
      select 1
      from core.staff_time_entries t
      where t.id = staff_break_entries.time_entry_id
        and t.organization_id = portal.actor_org_id()
        and t.user_id = auth.uid()
        and core.has_org_permission(t.organization_id, 'staff_time.track', auth.uid())
    )
  );

create policy staff_break_entries_insert_admin on core.staff_break_entries
  for insert
  with check (
    core.is_global_admin()
    or exists (
      select 1
      from core.staff_time_entries t
      where t.id = staff_break_entries.time_entry_id
        and t.organization_id = portal.actor_org_id()
        and core.has_org_permission(t.organization_id, 'staff_time.manage', auth.uid())
    )
  );

create policy staff_break_entries_update_self on core.staff_break_entries
  for update
  using (
    core.is_global_admin()
    or exists (
      select 1
      from core.staff_time_entries t
      where t.id = staff_break_entries.time_entry_id
        and t.organization_id = portal.actor_org_id()
        and t.user_id = auth.uid()
        and core.has_org_permission(t.organization_id, 'staff_time.track', auth.uid())
    )
  )
  with check (
    core.is_global_admin()
    or exists (
      select 1
      from core.staff_time_entries t
      where t.id = staff_break_entries.time_entry_id
        and t.organization_id = portal.actor_org_id()
        and t.user_id = auth.uid()
        and core.has_org_permission(t.organization_id, 'staff_time.track', auth.uid())
    )
  );

create policy staff_break_entries_update_admin on core.staff_break_entries
  for update
  using (
    core.is_global_admin()
    or exists (
      select 1
      from core.staff_time_entries t
      where t.id = staff_break_entries.time_entry_id
        and t.organization_id = portal.actor_org_id()
        and core.has_org_permission(t.organization_id, 'staff_time.manage', auth.uid())
    )
  )
  with check (
    core.is_global_admin()
    or exists (
      select 1
      from core.staff_time_entries t
      where t.id = staff_break_entries.time_entry_id
        and t.organization_id = portal.actor_org_id()
        and core.has_org_permission(t.organization_id, 'staff_time.manage', auth.uid())
    )
  );

create policy staff_break_entries_delete_admin on core.staff_break_entries
  for delete
  using (
    core.is_global_admin()
    or exists (
      select 1
      from core.staff_time_entries t
      where t.id = staff_break_entries.time_entry_id
        and t.organization_id = portal.actor_org_id()
        and core.has_org_permission(t.organization_id, 'staff_time.manage', auth.uid())
    )
  );

drop policy if exists staff_time_attributions_select_policy on core.staff_time_attributions;
drop policy if exists staff_time_attributions_insert_policy on core.staff_time_attributions;
drop policy if exists staff_time_attributions_update_policy on core.staff_time_attributions;
drop policy if exists staff_time_attributions_delete_policy on core.staff_time_attributions;

create policy staff_time_attributions_select_policy on core.staff_time_attributions
  for select
  using (
    core.is_global_admin()
    or exists (
      select 1
      from core.staff_time_entries t
      where t.id = staff_time_attributions.time_entry_id
        and t.organization_id = portal.actor_org_id()
        and (
          (t.user_id = auth.uid() and (
            core.has_org_permission(t.organization_id, 'staff_time.view_self', auth.uid())
            or core.has_org_permission(t.organization_id, 'staff_time.track', auth.uid())
          ))
          or core.has_org_permission(t.organization_id, 'staff_time.view_all', auth.uid())
          or core.has_org_permission(t.organization_id, 'staff_time.manage', auth.uid())
        )
    )
  );

create policy staff_time_attributions_insert_policy on core.staff_time_attributions
  for insert
  with check (
    core.is_global_admin()
    or exists (
      select 1
      from core.staff_time_entries t
      where t.id = staff_time_attributions.time_entry_id
        and t.organization_id = portal.actor_org_id()
        and staff_time_attributions.organization_id = t.organization_id
        and (
          (t.user_id = auth.uid() and core.has_org_permission(t.organization_id, 'staff_time.track', auth.uid()))
          or core.has_org_permission(t.organization_id, 'staff_time.manage', auth.uid())
        )
    )
  );

create policy staff_time_attributions_update_policy on core.staff_time_attributions
  for update
  using (
    core.is_global_admin()
    or exists (
      select 1
      from core.staff_time_entries t
      where t.id = staff_time_attributions.time_entry_id
        and t.organization_id = portal.actor_org_id()
        and staff_time_attributions.organization_id = t.organization_id
        and (
          (t.user_id = auth.uid() and core.has_org_permission(t.organization_id, 'staff_time.track', auth.uid()))
          or core.has_org_permission(t.organization_id, 'staff_time.manage', auth.uid())
        )
    )
  )
  with check (
    core.is_global_admin()
    or exists (
      select 1
      from core.staff_time_entries t
      where t.id = staff_time_attributions.time_entry_id
        and t.organization_id = portal.actor_org_id()
        and staff_time_attributions.organization_id = t.organization_id
        and (
          (t.user_id = auth.uid() and core.has_org_permission(t.organization_id, 'staff_time.track', auth.uid()))
          or core.has_org_permission(t.organization_id, 'staff_time.manage', auth.uid())
        )
    )
  );

create policy staff_time_attributions_delete_policy on core.staff_time_attributions
  for delete
  using (
    core.is_global_admin()
    or exists (
      select 1
      from core.staff_time_entries t
      where t.id = staff_time_attributions.time_entry_id
        and t.organization_id = portal.actor_org_id()
        and core.has_org_permission(t.organization_id, 'staff_time.manage', auth.uid())
    )
  );

-- 8) Update actor org roles RPC to include role_kind
drop function if exists core.get_actor_org_roles(bigint);

create or replace function core.get_actor_org_roles(p_org_id bigint default null)
returns table(role_id uuid, role_name text, role_display_name text, role_kind core.org_role_kind)
language sql
stable
security definer
set search_path to 'core', 'portal', 'public'
as $$
  select r.id, r.name, r.display_name, r.role_kind
  from core.user_org_roles uor
  join core.org_roles r on r.id = uor.org_role_id
  where uor.user_id = auth.uid()
    and uor.organization_id = coalesce(p_org_id, portal.actor_org_id());
$$;
