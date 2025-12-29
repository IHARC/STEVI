-- Allow staff time tracking to write cost events scoped to the actor
drop policy if exists cost_events_insert_staff_time on core.cost_events;

create policy cost_events_insert_staff_time on core.cost_events
  for insert
  with check (
    organization_id = portal.actor_org_id()
    and source_type = 'staff_time'
    and core.has_org_permission(organization_id, 'staff_time.track', auth.uid())
    and (metadata->>'user_id')::uuid = auth.uid()
  );
