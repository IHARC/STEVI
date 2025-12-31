-- Client record foundation RLS verification
-- Ensure policies exist for all new tables before shipping.

select schemaname, tablename, policyname, permissive, roles, cmd
from pg_policies
where schemaname in ('core', 'case_mgmt')
  and tablename in (
    'encounters',
    'tasks',
    'timeline_events',
    'medical_episodes',
    'justice_episodes',
    'person_relationships',
    'person_characteristics'
  )
order by schemaname, tablename, policyname;

-- Confirm RLS is enabled on the new tables
select n.nspname as schema_name, c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('core', 'case_mgmt')
  and c.relname in (
    'encounters',
    'tasks',
    'timeline_events',
    'medical_episodes',
    'justice_episodes',
    'person_relationships',
    'person_characteristics'
  )
order by n.nspname, c.relname;
