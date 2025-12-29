-- Add staff_time to cost_source_type_enum for time tracking cost events
do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'cost_source_type_enum'
      and n.nspname = 'core'
      and e.enumlabel = 'staff_time'
  ) then
    alter type core.cost_source_type_enum add value 'staff_time';
  end if;
end $$;
