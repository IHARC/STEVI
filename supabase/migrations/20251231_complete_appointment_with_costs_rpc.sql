create or replace function portal.complete_appointment_with_costs(
  p_appointment_id uuid,
  p_outcome_notes text,
  p_person_id bigint,
  p_cost_category_id uuid,
  p_cost_amount numeric,
  p_currency text,
  p_quantity numeric,
  p_unit_cost numeric,
  p_uom text,
  p_metadata jsonb,
  p_created_by uuid
)
returns table (appointment_id uuid, cost_event_id uuid)
language plpgsql
set search_path = portal, core, public
as $$
declare
  v_org_id bigint;
  v_occurred_at timestamptz;
begin
  if p_person_id is null then
    raise exception 'Unable to resolve the client record for cost tracking.';
  end if;

  update portal.appointments
  set status = 'completed',
      outcome_notes = p_outcome_notes,
      updated_at = now()
  where id = p_appointment_id
  returning organization_id, occurs_at into v_org_id, v_occurred_at;

  if not found then
    raise exception 'Appointment not found or unavailable.';
  end if;

  if v_org_id is null then
    raise exception 'Appointments must be tied to an organization to record costs.';
  end if;

  if v_occurred_at is null then
    raise exception 'Appointments must have a scheduled time to record costs.';
  end if;

  insert into core.cost_events (
    person_id,
    organization_id,
    source_type,
    source_id,
    occurred_at,
    cost_amount,
    currency,
    quantity,
    unit_cost,
    uom,
    cost_category_id,
    metadata,
    created_by
  ) values (
    p_person_id,
    v_org_id,
    'appointment',
    p_appointment_id::text,
    v_occurred_at,
    p_cost_amount,
    coalesce(p_currency, 'CAD'),
    p_quantity,
    p_unit_cost,
    p_uom,
    p_cost_category_id,
    coalesce(p_metadata, '{}'::jsonb),
    p_created_by
  )
  returning id into cost_event_id;

  appointment_id := p_appointment_id;
  return next;
end;
$$;
