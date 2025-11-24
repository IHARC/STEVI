-- Staff workspace RPCs
-- Grants are intentionally narrow; RLS on underlying tables must still be enforced.

create or replace function justice.staff_caseload(staff_uuid uuid)
returns table (
  id uuid,
  client_name text,
  status text,
  next_step text,
  next_at timestamptz
)
language sql
security definer
as $$
  select
    c.id,
    coalesce(p.display_name, 'Client') as client_name,
    coalesce(c.status, 'active') as status,
    c.next_step,
    c.next_at
  from justice.cases c
  join portal.profiles p on p.id = c.client_profile_id
  join core.user_roles ur on ur.user_id = c.assigned_user_id
  where c.assigned_user_id = staff_uuid;
$$;

revoke all on function justice.staff_caseload(uuid) from public;
grant execute on function justice.staff_caseload(uuid) to authenticated;

comment on function justice.staff_caseload is 'Returns caseload items scoped to the requesting staff user';

create or replace function justice.staff_shifts_today(staff_uuid uuid)
returns table (
  id uuid,
  title text,
  location text,
  starts_at text,
  ends_at text
)
language sql
security definer
as $$
  select
    s.id,
    s.title,
    s.location,
    to_char(s.starts_at, 'HH24:MI') as starts_at,
    to_char(s.ends_at, 'HH24:MI') as ends_at
  from justice.shifts s
  where s.staff_user_id = staff_uuid
    and s.starts_at::date = current_date
  order by s.starts_at asc;
$$;

revoke all on function justice.staff_shifts_today(uuid) from public;
grant execute on function justice.staff_shifts_today(uuid) to authenticated;

comment on function justice.staff_shifts_today is 'Returns today''s shift blocks for the staff user';

create or replace function justice.staff_outreach_logs(staff_uuid uuid, limit_rows int default 20)
returns table (
  id uuid,
  title text,
  summary text,
  location text,
  occurred_at timestamptz
)
language sql
security definer
as $$
  select
    l.id,
    l.title,
    l.summary,
    l.location,
    l.occurred_at
  from justice.outreach_logs l
  where l.created_by = staff_uuid
  order by l.occurred_at desc
  limit coalesce(limit_rows, 20);
$$;

revoke all on function justice.staff_outreach_logs(uuid, int) from public;
grant execute on function justice.staff_outreach_logs(uuid, int) to authenticated;

comment on function justice.staff_outreach_logs is 'Returns recent outreach logs created by the staff user';
