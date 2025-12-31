-- Keep timeline projection in sync with record updates/deletes

CREATE OR REPLACE FUNCTION core.timeline_delete_for_source()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'core', 'case_mgmt', 'portal', 'inventory', 'public'
AS $$
BEGIN
  DELETE FROM core.timeline_events
  WHERE source_type = TG_ARGV[0]
    AND source_id = old.id::text;
  RETURN old;
END;
$$;

-- Encounters
CREATE OR REPLACE FUNCTION core.timeline_from_encounter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'core', 'case_mgmt', 'portal', 'public'
AS $$
DECLARE
  v_summary text;
BEGIN
  v_summary := COALESCE(new.summary, initcap(replace(new.encounter_type::text, '_', ' ')) || ' encounter');

  UPDATE core.timeline_events
  SET person_id = new.person_id,
      case_id = new.case_id,
      encounter_id = new.id,
      owning_org_id = new.owning_org_id,
      event_category = 'encounter',
      event_at = new.started_at,
      source_type = 'encounter',
      source_id = new.id::text,
      visibility_scope = new.visibility_scope,
      sensitivity_level = new.sensitivity_level,
      summary = v_summary,
      metadata = jsonb_build_object(
        'encounter_type', new.encounter_type,
        'location_context', new.location_context,
        'program_context', new.program_context,
        'notes', new.notes
      ),
      recorded_by_profile_id = new.recorded_by_profile_id,
      created_by = new.created_by
  WHERE source_type = 'encounter'
    AND source_id = new.id::text;

  IF NOT FOUND THEN
    INSERT INTO core.timeline_events (
      person_id,
      case_id,
      encounter_id,
      owning_org_id,
      event_category,
      event_at,
      source_type,
      source_id,
      visibility_scope,
      sensitivity_level,
      summary,
      metadata,
      recorded_by_profile_id,
      created_by
    ) VALUES (
      new.person_id,
      new.case_id,
      new.id,
      new.owning_org_id,
      'encounter',
      new.started_at,
      'encounter',
      new.id::text,
      new.visibility_scope,
      new.sensitivity_level,
      v_summary,
      jsonb_build_object(
        'encounter_type', new.encounter_type,
        'location_context', new.location_context,
        'program_context', new.program_context,
        'notes', new.notes
      ),
      new.recorded_by_profile_id,
      new.created_by
    );
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_encounters_timeline ON case_mgmt.encounters;
CREATE TRIGGER trg_encounters_timeline
  AFTER INSERT OR UPDATE ON case_mgmt.encounters
  FOR EACH ROW
  EXECUTE FUNCTION core.timeline_from_encounter();

DROP TRIGGER IF EXISTS trg_encounters_timeline_delete ON case_mgmt.encounters;
CREATE TRIGGER trg_encounters_timeline_delete
  AFTER DELETE ON case_mgmt.encounters
  FOR EACH ROW
  EXECUTE FUNCTION core.timeline_delete_for_source('encounter');

-- Tasks
CREATE OR REPLACE FUNCTION core.timeline_from_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'core', 'case_mgmt', 'portal', 'public'
AS $$
DECLARE
  v_event_at timestamptz;
BEGIN
  v_event_at := COALESCE(new.due_at, new.recorded_at, now());

  UPDATE core.timeline_events
  SET person_id = new.person_id,
      case_id = new.case_id,
      encounter_id = new.encounter_id,
      owning_org_id = new.owning_org_id,
      event_category = 'task',
      event_at = v_event_at,
      source_type = 'task',
      source_id = new.id::text,
      visibility_scope = new.visibility_scope,
      sensitivity_level = new.sensitivity_level,
      summary = new.title,
      metadata = jsonb_build_object(
        'status', new.status,
        'priority', new.priority,
        'due_at', new.due_at,
        'assigned_to_profile_id', new.assigned_to_profile_id,
        'completed_at', new.completed_at
      ),
      recorded_by_profile_id = new.recorded_by_profile_id,
      created_by = new.created_by
  WHERE source_type = 'task'
    AND source_id = new.id::text;

  IF NOT FOUND THEN
    INSERT INTO core.timeline_events (
      person_id,
      case_id,
      encounter_id,
      owning_org_id,
      event_category,
      event_at,
      source_type,
      source_id,
      visibility_scope,
      sensitivity_level,
      summary,
      metadata,
      recorded_by_profile_id,
      created_by
    ) VALUES (
      new.person_id,
      new.case_id,
      new.encounter_id,
      new.owning_org_id,
      'task',
      v_event_at,
      'task',
      new.id::text,
      new.visibility_scope,
      new.sensitivity_level,
      new.title,
      jsonb_build_object(
        'status', new.status,
        'priority', new.priority,
        'due_at', new.due_at,
        'assigned_to_profile_id', new.assigned_to_profile_id,
        'completed_at', new.completed_at
      ),
      new.recorded_by_profile_id,
      new.created_by
    );
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_timeline ON case_mgmt.tasks;
CREATE TRIGGER trg_tasks_timeline
  AFTER INSERT OR UPDATE ON case_mgmt.tasks
  FOR EACH ROW
  EXECUTE FUNCTION core.timeline_from_task();

DROP TRIGGER IF EXISTS trg_tasks_timeline_delete ON case_mgmt.tasks;
CREATE TRIGGER trg_tasks_timeline_delete
  AFTER DELETE ON case_mgmt.tasks
  FOR EACH ROW
  EXECUTE FUNCTION core.timeline_delete_for_source('task');

-- Medical episodes
CREATE OR REPLACE FUNCTION core.timeline_from_medical_episode()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'core', 'case_mgmt', 'portal', 'public'
AS $$
DECLARE
  v_event_at timestamptz;
  v_summary text;
BEGIN
  v_event_at := COALESCE(new.recorded_at, new.episode_datetime, new.episode_date::timestamptz, now());
  v_summary := COALESCE(new.assessment_summary, new.primary_condition, new.episode_type);

  UPDATE core.timeline_events
  SET person_id = new.person_id,
      case_id = new.case_id,
      encounter_id = new.encounter_id,
      owning_org_id = new.owning_org_id,
      event_category = 'medical',
      event_at = v_event_at,
      source_type = 'medical_episode',
      source_id = new.id::text,
      visibility_scope = new.visibility_scope,
      sensitivity_level = new.sensitivity_level,
      summary = v_summary,
      metadata = jsonb_build_object(
        'episode_type', new.episode_type,
        'follow_up_needed', new.follow_up_needed,
        'follow_up_timeline', new.follow_up_timeline
      ),
      recorded_by_profile_id = new.recorded_by_profile_id,
      created_by = new.created_by
  WHERE source_type = 'medical_episode'
    AND source_id = new.id::text;

  IF NOT FOUND THEN
    INSERT INTO core.timeline_events (
      person_id,
      case_id,
      encounter_id,
      owning_org_id,
      event_category,
      event_at,
      source_type,
      source_id,
      visibility_scope,
      sensitivity_level,
      summary,
      metadata,
      recorded_by_profile_id,
      created_by
    ) VALUES (
      new.person_id,
      new.case_id,
      new.encounter_id,
      new.owning_org_id,
      'medical',
      v_event_at,
      'medical_episode',
      new.id::text,
      new.visibility_scope,
      new.sensitivity_level,
      v_summary,
      jsonb_build_object(
        'episode_type', new.episode_type,
        'follow_up_needed', new.follow_up_needed,
        'follow_up_timeline', new.follow_up_timeline
      ),
      new.recorded_by_profile_id,
      new.created_by
    );
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_medical_episodes_timeline ON core.medical_episodes;
CREATE TRIGGER trg_medical_episodes_timeline
  AFTER INSERT OR UPDATE ON core.medical_episodes
  FOR EACH ROW
  EXECUTE FUNCTION core.timeline_from_medical_episode();

DROP TRIGGER IF EXISTS trg_medical_episodes_timeline_delete ON core.medical_episodes;
CREATE TRIGGER trg_medical_episodes_timeline_delete
  AFTER DELETE ON core.medical_episodes
  FOR EACH ROW
  EXECUTE FUNCTION core.timeline_delete_for_source('medical_episode');

-- Justice episodes
CREATE OR REPLACE FUNCTION core.timeline_from_justice_episode()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'core', 'case_mgmt', 'portal', 'public'
AS $$
DECLARE
  v_event_at timestamptz;
  v_summary text;
BEGIN
  v_event_at := COALESCE((new.event_date::date + COALESCE(new.event_time, '00:00:00')::time)::timestamptz, new.recorded_at, now());
  v_summary := COALESCE(new.charges, initcap(replace(new.episode_type::text, '_', ' ')));

  UPDATE core.timeline_events
  SET person_id = new.person_id,
      case_id = new.case_id,
      encounter_id = new.encounter_id,
      owning_org_id = new.owning_org_id,
      event_category = 'justice',
      event_at = v_event_at,
      source_type = 'justice_episode',
      source_id = new.id::text,
      visibility_scope = new.visibility_scope,
      sensitivity_level = new.sensitivity_level,
      summary = v_summary,
      metadata = jsonb_build_object(
        'episode_type', new.episode_type,
        'court_date', new.court_date
      ),
      recorded_by_profile_id = new.recorded_by_profile_id,
      created_by = new.created_by
  WHERE source_type = 'justice_episode'
    AND source_id = new.id::text;

  IF NOT FOUND THEN
    INSERT INTO core.timeline_events (
      person_id,
      case_id,
      encounter_id,
      owning_org_id,
      event_category,
      event_at,
      source_type,
      source_id,
      visibility_scope,
      sensitivity_level,
      summary,
      metadata,
      recorded_by_profile_id,
      created_by
    ) VALUES (
      new.person_id,
      new.case_id,
      new.encounter_id,
      new.owning_org_id,
      'justice',
      v_event_at,
      'justice_episode',
      new.id::text,
      new.visibility_scope,
      new.sensitivity_level,
      v_summary,
      jsonb_build_object(
        'episode_type', new.episode_type,
        'court_date', new.court_date
      ),
      new.recorded_by_profile_id,
      new.created_by
    );
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_justice_episodes_timeline ON core.justice_episodes;
CREATE TRIGGER trg_justice_episodes_timeline
  AFTER INSERT OR UPDATE ON core.justice_episodes
  FOR EACH ROW
  EXECUTE FUNCTION core.timeline_from_justice_episode();

DROP TRIGGER IF EXISTS trg_justice_episodes_timeline_delete ON core.justice_episodes;
CREATE TRIGGER trg_justice_episodes_timeline_delete
  AFTER DELETE ON core.justice_episodes
  FOR EACH ROW
  EXECUTE FUNCTION core.timeline_delete_for_source('justice_episode');

-- Person relationships
CREATE OR REPLACE FUNCTION core.timeline_from_relationship()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'core', 'case_mgmt', 'portal', 'public'
AS $$
DECLARE
  v_summary text;
BEGIN
  v_summary := COALESCE(new.contact_name, 'Relationship') || ' (' || new.relationship_type || ')';

  UPDATE core.timeline_events
  SET person_id = new.person_id,
      case_id = new.case_id,
      encounter_id = new.encounter_id,
      owning_org_id = new.owning_org_id,
      event_category = 'relationship',
      event_at = new.recorded_at,
      source_type = 'person_relationship',
      source_id = new.id::text,
      visibility_scope = new.visibility_scope,
      sensitivity_level = new.sensitivity_level,
      summary = v_summary,
      metadata = jsonb_build_object(
        'relationship_type', new.relationship_type,
        'is_emergency', new.is_emergency
      ),
      recorded_by_profile_id = new.recorded_by_profile_id,
      created_by = new.created_by
  WHERE source_type = 'person_relationship'
    AND source_id = new.id::text;

  IF NOT FOUND THEN
    INSERT INTO core.timeline_events (
      person_id,
      case_id,
      encounter_id,
      owning_org_id,
      event_category,
      event_at,
      source_type,
      source_id,
      visibility_scope,
      sensitivity_level,
      summary,
      metadata,
      recorded_by_profile_id,
      created_by
    ) VALUES (
      new.person_id,
      new.case_id,
      new.encounter_id,
      new.owning_org_id,
      'relationship',
      new.recorded_at,
      'person_relationship',
      new.id::text,
      new.visibility_scope,
      new.sensitivity_level,
      v_summary,
      jsonb_build_object(
        'relationship_type', new.relationship_type,
        'is_emergency', new.is_emergency
      ),
      new.recorded_by_profile_id,
      new.created_by
    );
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_person_relationships_timeline ON core.person_relationships;
CREATE TRIGGER trg_person_relationships_timeline
  AFTER INSERT OR UPDATE ON core.person_relationships
  FOR EACH ROW
  EXECUTE FUNCTION core.timeline_from_relationship();

DROP TRIGGER IF EXISTS trg_person_relationships_timeline_delete ON core.person_relationships;
CREATE TRIGGER trg_person_relationships_timeline_delete
  AFTER DELETE ON core.person_relationships
  FOR EACH ROW
  EXECUTE FUNCTION core.timeline_delete_for_source('person_relationship');

-- Person characteristics
CREATE OR REPLACE FUNCTION core.timeline_from_characteristic()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'core', 'case_mgmt', 'portal', 'public'
AS $$
DECLARE
  v_summary text;
BEGIN
  v_summary := new.characteristic_type;

  UPDATE core.timeline_events
  SET person_id = new.person_id,
      case_id = new.case_id,
      encounter_id = new.encounter_id,
      owning_org_id = new.owning_org_id,
      event_category = 'characteristic',
      event_at = new.observed_at,
      source_type = 'person_characteristic',
      source_id = new.id::text,
      visibility_scope = new.visibility_scope,
      sensitivity_level = new.sensitivity_level,
      summary = v_summary,
      metadata = jsonb_build_object(
        'value_text', new.value_text,
        'value_number', new.value_number,
        'value_unit', new.value_unit
      ),
      recorded_by_profile_id = new.recorded_by_profile_id,
      created_by = new.created_by
  WHERE source_type = 'person_characteristic'
    AND source_id = new.id::text;

  IF NOT FOUND THEN
    INSERT INTO core.timeline_events (
      person_id,
      case_id,
      encounter_id,
      owning_org_id,
      event_category,
      event_at,
      source_type,
      source_id,
      visibility_scope,
      sensitivity_level,
      summary,
      metadata,
      recorded_by_profile_id,
      created_by
    ) VALUES (
      new.person_id,
      new.case_id,
      new.encounter_id,
      new.owning_org_id,
      'characteristic',
      new.observed_at,
      'person_characteristic',
      new.id::text,
      new.visibility_scope,
      new.sensitivity_level,
      v_summary,
      jsonb_build_object(
        'value_text', new.value_text,
        'value_number', new.value_number,
        'value_unit', new.value_unit
      ),
      new.recorded_by_profile_id,
      new.created_by
    );
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_person_characteristics_timeline ON core.person_characteristics;
CREATE TRIGGER trg_person_characteristics_timeline
  AFTER INSERT OR UPDATE ON core.person_characteristics
  FOR EACH ROW
  EXECUTE FUNCTION core.timeline_from_characteristic();

DROP TRIGGER IF EXISTS trg_person_characteristics_timeline_delete ON core.person_characteristics;
CREATE TRIGGER trg_person_characteristics_timeline_delete
  AFTER DELETE ON core.person_characteristics
  FOR EACH ROW
  EXECUTE FUNCTION core.timeline_delete_for_source('person_characteristic');

-- Inventory distributions
CREATE OR REPLACE FUNCTION core.timeline_from_distribution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'core', 'inventory', 'portal', 'public'
AS $$
BEGIN
  IF new.person_id IS NULL THEN
    DELETE FROM core.timeline_events
    WHERE source_type = 'distribution'
      AND source_id = new.id::text;
    RETURN new;
  END IF;

  UPDATE core.timeline_events
  SET person_id = new.person_id,
      case_id = NULL,
      encounter_id = new.encounter_id,
      owning_org_id = COALESCE(new.provider_org_id, core.get_iharc_org_id()),
      event_category = 'supply',
      event_at = new.created_at,
      source_type = 'distribution',
      source_id = new.id::text,
      visibility_scope = 'internal_to_org',
      sensitivity_level = 'standard',
      summary = 'Supply distribution',
      metadata = jsonb_build_object(
        'location_id', new.location_id,
        'notes', new.notes
      )
  WHERE source_type = 'distribution'
    AND source_id = new.id::text;

  IF NOT FOUND THEN
    INSERT INTO core.timeline_events (
      person_id,
      case_id,
      encounter_id,
      owning_org_id,
      event_category,
      event_at,
      source_type,
      source_id,
      visibility_scope,
      sensitivity_level,
      summary,
      metadata
    ) VALUES (
      new.person_id,
      NULL,
      new.encounter_id,
      COALESCE(new.provider_org_id, core.get_iharc_org_id()),
      'supply',
      new.created_at,
      'distribution',
      new.id::text,
      'internal_to_org',
      'standard',
      'Supply distribution',
      jsonb_build_object(
        'location_id', new.location_id,
        'notes', new.notes
      )
    );
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_inventory_distributions_timeline ON inventory.distributions;
CREATE TRIGGER trg_inventory_distributions_timeline
  AFTER INSERT OR UPDATE ON inventory.distributions
  FOR EACH ROW
  EXECUTE FUNCTION core.timeline_from_distribution();

DROP TRIGGER IF EXISTS trg_inventory_distributions_timeline_delete ON inventory.distributions;
CREATE TRIGGER trg_inventory_distributions_timeline_delete
  AFTER DELETE ON inventory.distributions
  FOR EACH ROW
  EXECUTE FUNCTION core.timeline_delete_for_source('distribution');

-- Appointments
CREATE OR REPLACE FUNCTION core.timeline_from_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'core', 'portal', 'public'
AS $$
DECLARE
  v_person_id bigint;
  v_event_at timestamptz;
BEGIN
  SELECT up.person_id
  INTO v_person_id
  FROM core.user_people up
  WHERE up.profile_id = new.client_profile_id
  ORDER BY up.linked_at DESC
  LIMIT 1;

  IF v_person_id IS NULL THEN
    DELETE FROM core.timeline_events
    WHERE source_type = 'appointment'
      AND source_id = new.id::text;
    RETURN new;
  END IF;

  v_event_at := COALESCE(new.occurs_at, new.created_at, now());

  UPDATE core.timeline_events
  SET person_id = v_person_id,
      case_id = NULL,
      encounter_id = NULL,
      owning_org_id = COALESCE(new.organization_id, core.get_iharc_org_id()),
      event_category = 'appointment',
      event_at = v_event_at,
      source_type = 'appointment',
      source_id = new.id::text,
      visibility_scope = 'shared_via_consent',
      sensitivity_level = 'standard',
      summary = COALESCE(new.title, 'Appointment'),
      metadata = jsonb_build_object(
        'status', new.status,
        'location_type', new.location_type
      ),
      recorded_by_profile_id = new.requester_profile_id
  WHERE source_type = 'appointment'
    AND source_id = new.id::text;

  IF NOT FOUND THEN
    INSERT INTO core.timeline_events (
      person_id,
      case_id,
      encounter_id,
      owning_org_id,
      event_category,
      event_at,
      source_type,
      source_id,
      visibility_scope,
      sensitivity_level,
      summary,
      metadata,
      recorded_by_profile_id
    ) VALUES (
      v_person_id,
      NULL,
      NULL,
      COALESCE(new.organization_id, core.get_iharc_org_id()),
      'appointment',
      v_event_at,
      'appointment',
      new.id::text,
      'shared_via_consent',
      'standard',
      COALESCE(new.title, 'Appointment'),
      jsonb_build_object(
        'status', new.status,
        'location_type', new.location_type
      ),
      new.requester_profile_id
    );
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointments_timeline ON portal.appointments;
CREATE TRIGGER trg_appointments_timeline
  AFTER INSERT OR UPDATE ON portal.appointments
  FOR EACH ROW
  EXECUTE FUNCTION core.timeline_from_appointment();

DROP TRIGGER IF EXISTS trg_appointments_timeline_delete ON portal.appointments;
CREATE TRIGGER trg_appointments_timeline_delete
  AFTER DELETE ON portal.appointments
  FOR EACH ROW
  EXECUTE FUNCTION core.timeline_delete_for_source('appointment');
