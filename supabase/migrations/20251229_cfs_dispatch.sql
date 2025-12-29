-- CFS dispatch system core updates

-- 1) Enums
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'cfs_access_level_enum' AND n.nspname = 'core'
  ) THEN
    CREATE TYPE core.cfs_access_level_enum AS ENUM ('view', 'collaborate', 'dispatch');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'cfs_public_status_enum' AND n.nspname = 'core'
  ) THEN
    CREATE TYPE core.cfs_public_status_enum AS ENUM ('received', 'triaged', 'dispatched', 'in_progress', 'resolved');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'cfs_public_category_enum' AND n.nspname = 'core'
  ) THEN
    CREATE TYPE core.cfs_public_category_enum AS ENUM ('cleanup', 'outreach', 'welfare_check', 'supply_distribution', 'other');
  END IF;
END $$;

-- 2) Core column additions
ALTER TABLE case_mgmt.calls_for_service
  ADD COLUMN IF NOT EXISTS owning_organization_id bigint,
  ADD COLUMN IF NOT EXISTS public_tracking_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE case_mgmt.calls_for_service
  ADD CONSTRAINT calls_for_service_owning_org_fkey
  FOREIGN KEY (owning_organization_id)
  REFERENCES core.organizations(id)
  ON DELETE RESTRICT;

ALTER TABLE case_mgmt.calls_for_service
  ADD CONSTRAINT calls_for_service_public_tracking_check
  CHECK (public_tracking_enabled = false OR public_tracking_id IS NOT NULL);

ALTER TABLE case_mgmt.cfs_timeline
  ADD COLUMN IF NOT EXISTS organization_id bigint;

ALTER TABLE case_mgmt.cfs_timeline
  ADD CONSTRAINT cfs_timeline_org_fkey
  FOREIGN KEY (organization_id)
  REFERENCES core.organizations(id)
  ON DELETE RESTRICT;

ALTER TABLE case_mgmt.incidents
  ADD COLUMN IF NOT EXISTS owning_organization_id bigint;

ALTER TABLE case_mgmt.incidents
  ADD CONSTRAINT incidents_owning_org_fkey
  FOREIGN KEY (owning_organization_id)
  REFERENCES core.organizations(id)
  ON DELETE RESTRICT;

DO $$
DECLARE
  iharc_org_id bigint := core.get_iharc_org_id();
BEGIN
  IF iharc_org_id IS NULL THEN
    RAISE EXCEPTION 'IHARC organization not found; cannot backfill CFS ownership.';
  END IF;

  UPDATE case_mgmt.calls_for_service
  SET owning_organization_id = COALESCE(owning_organization_id, reporting_organization_id, iharc_org_id)
  WHERE owning_organization_id IS NULL;

  UPDATE case_mgmt.cfs_timeline t
  SET organization_id = c.owning_organization_id
  FROM case_mgmt.calls_for_service c
  WHERE t.organization_id IS NULL
    AND t.incident_report_id = c.id;

  UPDATE case_mgmt.incidents i
  SET owning_organization_id = COALESCE(
    i.owning_organization_id,
    (SELECT c.owning_organization_id FROM case_mgmt.calls_for_service c WHERE c.id = i.incident_report_id),
    iharc_org_id
  )
  WHERE i.owning_organization_id IS NULL;
END $$;

ALTER TABLE case_mgmt.calls_for_service
  ALTER COLUMN owning_organization_id SET NOT NULL;

ALTER TABLE case_mgmt.cfs_timeline
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE case_mgmt.incidents
  ALTER COLUMN owning_organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS calls_for_service_owner_idx ON case_mgmt.calls_for_service (owning_organization_id);
CREATE INDEX IF NOT EXISTS cfs_timeline_org_idx ON case_mgmt.cfs_timeline (organization_id);
CREATE INDEX IF NOT EXISTS incidents_owner_idx ON case_mgmt.incidents (owning_organization_id);

-- 3) Collaboration access table
CREATE TABLE IF NOT EXISTS case_mgmt.cfs_org_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cfs_id bigint NOT NULL REFERENCES case_mgmt.calls_for_service(id) ON DELETE CASCADE,
  organization_id bigint NOT NULL REFERENCES core.organizations(id) ON DELETE RESTRICT,
  access_level core.cfs_access_level_enum NOT NULL DEFAULT 'view',
  reason text NULL,
  granted_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz NULL,
  revoked_by uuid NULL REFERENCES auth.users(id),
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cfs_org_access_active_unique
  ON case_mgmt.cfs_org_access (cfs_id, organization_id)
  WHERE is_active;

CREATE INDEX IF NOT EXISTS cfs_org_access_org_idx ON case_mgmt.cfs_org_access (organization_id);
CREATE INDEX IF NOT EXISTS cfs_org_access_cfs_idx ON case_mgmt.cfs_org_access (cfs_id);

-- 4) Attachments
CREATE TABLE IF NOT EXISTS case_mgmt.cfs_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cfs_id bigint NOT NULL REFERENCES case_mgmt.calls_for_service(id) ON DELETE CASCADE,
  organization_id bigint NOT NULL REFERENCES core.organizations(id) ON DELETE RESTRICT,
  uploaded_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  file_name text NOT NULL,
  file_type text NULL,
  file_size integer NULL,
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  metadata jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cfs_attachments_cfs_idx ON case_mgmt.cfs_attachments (cfs_id);
CREATE INDEX IF NOT EXISTS cfs_attachments_org_idx ON case_mgmt.cfs_attachments (organization_id);

-- 5) Public tracking table
CREATE TABLE IF NOT EXISTS case_mgmt.cfs_public_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cfs_id bigint NOT NULL UNIQUE REFERENCES case_mgmt.calls_for_service(id) ON DELETE CASCADE,
  public_tracking_id text NOT NULL UNIQUE,
  status_bucket core.cfs_public_status_enum NOT NULL,
  category core.cfs_public_category_enum NOT NULL,
  public_location_area text NOT NULL,
  public_summary text NULL,
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cfs_public_tracking_status_idx ON case_mgmt.cfs_public_tracking (status_bucket);

-- 6) Helper functions for access checks
CREATE OR REPLACE FUNCTION case_mgmt.cfs_actor_has_permission(
  p_cfs_id bigint,
  p_permission text,
  p_min_access core.cfs_access_level_enum DEFAULT 'view'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'case_mgmt', 'core', 'portal', 'public'
SET row_security = off
AS $$
DECLARE
  actor_org bigint := portal.actor_org_id();
  owner_org bigint;
  access_level core.cfs_access_level_enum;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN true;
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  IF core.is_global_admin(auth.uid()) THEN
    RETURN true;
  END IF;

  IF actor_org IS NULL THEN
    RETURN false;
  END IF;

  SELECT owning_organization_id INTO owner_org
  FROM case_mgmt.calls_for_service
  WHERE id = p_cfs_id;

  IF owner_org IS NULL THEN
    RETURN false;
  END IF;

  IF owner_org = actor_org THEN
    RETURN core.has_org_permission(actor_org, p_permission, auth.uid());
  END IF;

  SELECT a.access_level INTO access_level
  FROM case_mgmt.cfs_org_access a
  WHERE a.cfs_id = p_cfs_id
    AND a.organization_id = actor_org
    AND a.is_active
  ORDER BY a.granted_at DESC
  LIMIT 1;

  IF access_level IS NOT NULL AND access_level >= p_min_access THEN
    RETURN core.has_org_permission(actor_org, p_permission, auth.uid());
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION case_mgmt.incident_actor_has_permission(
  p_incident_id bigint,
  p_permission text,
  p_min_access core.cfs_access_level_enum DEFAULT 'view'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'case_mgmt', 'core', 'portal', 'public'
SET row_security = off
AS $$
DECLARE
  actor_org bigint := portal.actor_org_id();
  owner_org bigint;
  access_level core.cfs_access_level_enum;
  linked_cfs_id bigint;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN true;
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  IF core.is_global_admin(auth.uid()) THEN
    RETURN true;
  END IF;

  IF actor_org IS NULL THEN
    RETURN false;
  END IF;

  SELECT owning_organization_id, incident_report_id
  INTO owner_org, linked_cfs_id
  FROM case_mgmt.incidents
  WHERE id = p_incident_id;

  IF owner_org IS NULL THEN
    RETURN false;
  END IF;

  IF owner_org = actor_org THEN
    RETURN core.has_org_permission(actor_org, p_permission, auth.uid());
  END IF;

  IF linked_cfs_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT a.access_level INTO access_level
  FROM case_mgmt.cfs_org_access a
  WHERE a.cfs_id = linked_cfs_id
    AND a.organization_id = actor_org
    AND a.is_active
  ORDER BY a.granted_at DESC
  LIMIT 1;

  IF access_level IS NOT NULL AND access_level >= p_min_access THEN
    RETURN core.has_org_permission(actor_org, p_permission, auth.uid());
  END IF;

  RETURN false;
END;
$$;

-- 7) Fix initial timeline trigger + add org attribution
CREATE OR REPLACE FUNCTION case_mgmt.create_initial_timeline_entry()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO case_mgmt.cfs_timeline (
    incident_report_id,
    phase,
    phase_started_at,
    phase_status,
    performed_by,
    phase_notes,
    organization_id,
    created_by
  ) VALUES (
    NEW.id,
    'intake',
    NEW.report_received_at,
    'completed',
    COALESCE(NEW.call_taker_id, NEW.created_by),
    'Initial report received via ' || NEW.report_method,
    NEW.owning_organization_id,
    NEW.created_by
  );

  RETURN NEW;
END;
$$;

-- 8) Attachments count
CREATE OR REPLACE FUNCTION case_mgmt.cfs_update_attachment_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE case_mgmt.calls_for_service
    SET attachments_count = COALESCE(attachments_count, 0) + 1
    WHERE id = NEW.cfs_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE case_mgmt.calls_for_service
    SET attachments_count = GREATEST(COALESCE(attachments_count, 0) - 1, 0)
    WHERE id = OLD.cfs_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_cfs_attachments_update ON case_mgmt.cfs_attachments;
CREATE TRIGGER trg_cfs_attachments_update
  AFTER INSERT OR DELETE ON case_mgmt.cfs_attachments
  FOR EACH ROW
  EXECUTE FUNCTION case_mgmt.cfs_update_attachment_count();

-- 9) Public tracking helpers
CREATE OR REPLACE FUNCTION case_mgmt.cfs_generate_public_tracking_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT lower(encode(gen_random_bytes(8), 'hex'));
$$;

CREATE OR REPLACE FUNCTION case_mgmt.cfs_public_status_from_call(
  p_cfs_id bigint
)
RETURNS core.cfs_public_status_enum
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'case_mgmt', 'core', 'public'
SET row_security = off
AS $$
DECLARE
  cfs_record record;
  incident_status core.incident_status_enum;
BEGIN
  SELECT id, status, report_status, converted_incident_id, escalated_to_incident_id
  INTO cfs_record
  FROM case_mgmt.calls_for_service
  WHERE id = p_cfs_id;

  IF cfs_record IS NULL THEN
    RETURN 'received';
  END IF;

  IF cfs_record.report_status IN ('resolved', 'duplicate', 'false_alarm', 'archived') THEN
    RETURN 'resolved';
  END IF;

  IF cfs_record.status = 'received' THEN
    RETURN 'received';
  END IF;

  IF cfs_record.status = 'triaged' THEN
    RETURN 'triaged';
  END IF;

  IF cfs_record.status = 'dismissed' THEN
    RETURN 'resolved';
  END IF;

  IF cfs_record.status = 'converted' THEN
    SELECT status
    INTO incident_status
    FROM case_mgmt.incidents
    WHERE id = COALESCE(cfs_record.converted_incident_id, cfs_record.escalated_to_incident_id)
    LIMIT 1;

    IF incident_status IN ('resolved', 'closed') THEN
      RETURN 'resolved';
    END IF;

    IF incident_status = 'in_progress' THEN
      RETURN 'in_progress';
    END IF;

    RETURN 'dispatched';
  END IF;

  RETURN 'received';
END;
$$;

CREATE OR REPLACE FUNCTION case_mgmt.cfs_refresh_public_tracking(p_cfs_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'case_mgmt', 'core', 'public'
SET row_security = off
AS $$
DECLARE
  cfs_record record;
  bucket core.cfs_public_status_enum;
BEGIN
  SELECT id, public_tracking_enabled, public_tracking_id
  INTO cfs_record
  FROM case_mgmt.calls_for_service
  WHERE id = p_cfs_id;

  IF cfs_record IS NULL THEN
    RETURN;
  END IF;

  IF NOT cfs_record.public_tracking_enabled OR cfs_record.public_tracking_id IS NULL THEN
    DELETE FROM case_mgmt.cfs_public_tracking
    WHERE cfs_id = p_cfs_id;
    RETURN;
  END IF;

  bucket := case_mgmt.cfs_public_status_from_call(p_cfs_id);

  UPDATE case_mgmt.cfs_public_tracking
  SET status_bucket = bucket,
      last_updated_at = now(),
      updated_at = now()
  WHERE cfs_id = p_cfs_id;
END;
$$;

CREATE OR REPLACE FUNCTION case_mgmt.cfs_public_tracking_upsert(
  p_cfs_id bigint,
  p_category core.cfs_public_category_enum,
  p_public_location_area text,
  p_public_summary text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'case_mgmt', 'core', 'public', 'portal'
SET row_security = off
AS $$
DECLARE
  cfs_record record;
  tracking_id text;
  bucket core.cfs_public_status_enum;
BEGIN
  IF NOT case_mgmt.cfs_actor_has_permission(p_cfs_id, 'cfs.public_track', 'dispatch') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT id, type_hint, reporting_person_id, public_tracking_id
  INTO cfs_record
  FROM case_mgmt.calls_for_service
  WHERE id = p_cfs_id;

  IF cfs_record IS NULL THEN
    RAISE EXCEPTION 'Call not found';
  END IF;

  IF cfs_record.reporting_person_id IS NOT NULL THEN
    RAISE EXCEPTION 'Public tracking not allowed for person-linked calls';
  END IF;

  IF cfs_record.type_hint IN ('medical', 'mental_health', 'mental_health_crisis', 'overdose', 'death', 'assault') THEN
    RAISE EXCEPTION 'Public tracking not allowed for sensitive call types';
  END IF;

  tracking_id := COALESCE(cfs_record.public_tracking_id, case_mgmt.cfs_generate_public_tracking_id());
  bucket := case_mgmt.cfs_public_status_from_call(p_cfs_id);

  INSERT INTO case_mgmt.cfs_public_tracking (
    cfs_id,
    public_tracking_id,
    status_bucket,
    category,
    public_location_area,
    public_summary,
    last_updated_at
  ) VALUES (
    p_cfs_id,
    tracking_id,
    bucket,
    p_category,
    p_public_location_area,
    p_public_summary,
    now()
  )
  ON CONFLICT (cfs_id)
  DO UPDATE SET
    public_tracking_id = EXCLUDED.public_tracking_id,
    status_bucket = EXCLUDED.status_bucket,
    category = EXCLUDED.category,
    public_location_area = EXCLUDED.public_location_area,
    public_summary = EXCLUDED.public_summary,
    last_updated_at = now(),
    updated_at = now();

  UPDATE case_mgmt.calls_for_service
  SET public_tracking_enabled = true,
      public_tracking_id = tracking_id,
      updated_at = now(),
      updated_by = auth.uid()
  WHERE id = p_cfs_id;

  RETURN tracking_id;
END;
$$;

CREATE OR REPLACE FUNCTION case_mgmt.cfs_public_tracking_disable(p_cfs_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'case_mgmt', 'core', 'public', 'portal'
SET row_security = off
AS $$
BEGIN
  IF NOT case_mgmt.cfs_actor_has_permission(p_cfs_id, 'cfs.public_track', 'dispatch') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE case_mgmt.calls_for_service
  SET public_tracking_enabled = false,
      public_tracking_id = NULL,
      updated_at = now(),
      updated_by = auth.uid()
  WHERE id = p_cfs_id;

  DELETE FROM case_mgmt.cfs_public_tracking
  WHERE cfs_id = p_cfs_id;
END;
$$;

CREATE OR REPLACE FUNCTION case_mgmt.cfs_public_tracking_get(p_tracking_id text)
RETURNS TABLE(
  public_tracking_id text,
  status_bucket core.cfs_public_status_enum,
  category core.cfs_public_category_enum,
  public_location_area text,
  public_summary text,
  last_updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'case_mgmt', 'core', 'public'
SET row_security = off
AS $$
  SELECT public_tracking_id, status_bucket, category, public_location_area, public_summary, last_updated_at
  FROM case_mgmt.cfs_public_tracking
  WHERE public_tracking_id = p_tracking_id;
$$;

-- 10) Trigger to refresh public tracking on updates
CREATE OR REPLACE FUNCTION case_mgmt.cfs_refresh_public_tracking_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.public_tracking_enabled OR NEW.public_tracking_id IS NOT NULL THEN
      PERFORM case_mgmt.cfs_refresh_public_tracking(NEW.id);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.public_tracking_enabled IS DISTINCT FROM OLD.public_tracking_enabled
      OR NEW.public_tracking_id IS DISTINCT FROM OLD.public_tracking_id
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.report_status IS DISTINCT FROM OLD.report_status
      OR NEW.converted_incident_id IS DISTINCT FROM OLD.converted_incident_id
      OR NEW.escalated_to_incident_id IS DISTINCT FROM OLD.escalated_to_incident_id THEN
      PERFORM case_mgmt.cfs_refresh_public_tracking(NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cfs_public_tracking_refresh ON case_mgmt.calls_for_service;
CREATE TRIGGER trg_cfs_public_tracking_refresh
  AFTER INSERT OR UPDATE ON case_mgmt.calls_for_service
  FOR EACH ROW
  EXECUTE FUNCTION case_mgmt.cfs_refresh_public_tracking_trigger();

CREATE OR REPLACE FUNCTION case_mgmt.incident_refresh_public_tracking_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.incident_report_id IS NOT NULL THEN
      PERFORM case_mgmt.cfs_refresh_public_tracking(NEW.incident_report_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_incident_public_tracking_refresh ON case_mgmt.incidents;
CREATE TRIGGER trg_incident_public_tracking_refresh
  AFTER UPDATE ON case_mgmt.incidents
  FOR EACH ROW
  EXECUTE FUNCTION case_mgmt.incident_refresh_public_tracking_trigger();

-- 11) RPC helpers
CREATE OR REPLACE FUNCTION case_mgmt.cfs_create_call(p_payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'case_mgmt', 'core', 'portal', 'public'
SET row_security = off
AS $$
DECLARE
  v_call_id bigint;
  v_owning_org bigint;
  v_reporting_org bigint := NULLIF((p_payload->>'reporting_organization_id')::bigint, 0);
  v_reporting_person bigint := NULLIF((p_payload->>'reporting_person_id')::bigint, 0);
  v_anonymous boolean;
  v_origin core.cfs_origin_enum := COALESCE((p_payload->>'origin')::core.cfs_origin_enum, 'community');
  v_source core.cfs_source_enum := (p_payload->>'source')::core.cfs_source_enum;
BEGIN
  v_anonymous := COALESCE((p_payload->>'anonymous_reporter')::boolean, false);
  IF v_reporting_org IS NULL AND v_reporting_person IS NULL THEN
    v_anonymous := true;
  END IF;
  IF auth.role() = 'service_role' THEN
    v_owning_org := COALESCE(
      NULLIF((p_payload->>'owning_organization_id')::bigint, 0),
      v_reporting_org,
      core.get_iharc_org_id()
    );
  ELSE
    v_owning_org := COALESCE(
      NULLIF((p_payload->>'owning_organization_id')::bigint, 0),
      portal.actor_org_id(),
      v_reporting_org,
      core.get_iharc_org_id()
    );
  END IF;

  IF v_owning_org IS NULL THEN
    RAISE EXCEPTION 'Owning organization is required.';
  END IF;

  IF NOT core.has_org_permission(v_owning_org, 'cfs.create', auth.uid()) AND NOT core.is_global_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  INSERT INTO case_mgmt.calls_for_service (
    owning_organization_id,
    origin,
    source,
    report_method,
    report_source_details,
    reporting_person_id,
    reporting_organization_id,
    anonymous_reporter,
    anonymous_reporter_details,
    reporter_name,
    reporter_phone,
    reporter_email,
    reporter_address,
    reporter_relationship,
    initial_report_narrative,
    report_priority_assessment,
    urgency_indicators,
    call_taker_id,
    call_taker_notes,
    report_received_at,
    received_at,
    reported_location,
    reported_coordinates,
    location_text,
    location_confidence,
    notify_opt_in,
    notify_channel,
    notify_target,
    type_hint,
    priority_hint,
    referring_organization_id,
    referring_agency_name,
    created_by,
    updated_by
  ) VALUES (
    v_owning_org,
    v_origin,
    v_source,
    COALESCE(p_payload->>'report_method', 'phone'),
    COALESCE(p_payload->'report_source_details', '{}'::jsonb),
    v_reporting_person,
    v_reporting_org,
    v_anonymous,
    p_payload->>'anonymous_reporter_details',
    p_payload->>'reporter_name',
    p_payload->>'reporter_phone',
    p_payload->>'reporter_email',
    p_payload->>'reporter_address',
    p_payload->>'reporter_relationship',
    COALESCE(p_payload->>'initial_report_narrative', ''),
    COALESCE(p_payload->>'report_priority_assessment', 'routine'),
    COALESCE(p_payload->'urgency_indicators', '[]'::jsonb),
    NULLIF(p_payload->>'call_taker_id', '')::uuid,
    p_payload->>'call_taker_notes',
    COALESCE((p_payload->>'report_received_at')::timestamptz, now()),
    COALESCE((p_payload->>'received_at')::timestamptz, now()),
    p_payload->>'reported_location',
    p_payload->>'reported_coordinates',
    p_payload->>'location_text',
    p_payload->>'location_confidence',
    COALESCE((p_payload->>'notify_opt_in')::boolean, false),
    COALESCE((p_payload->>'notify_channel')::core.notify_channel_enum, 'none'),
    p_payload->>'notify_target',
    NULLIF(p_payload->>'type_hint', '')::core.incident_type_enum,
    NULLIF(p_payload->>'priority_hint', '')::core.incident_priority_enum,
    NULLIF((p_payload->>'referring_organization_id')::bigint, 0),
    p_payload->>'referring_agency_name',
    auth.uid(),
    auth.uid()
  )
  RETURNING id INTO v_call_id;

  RETURN v_call_id;
END;
$$;

CREATE OR REPLACE FUNCTION case_mgmt.cfs_triage(p_cfs_id bigint, p_payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'case_mgmt', 'core', 'portal', 'public'
SET row_security = off
AS $$
BEGIN
  IF NOT case_mgmt.cfs_actor_has_permission(p_cfs_id, 'cfs.triage', 'collaborate') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE case_mgmt.calls_for_service
  SET report_priority_assessment = COALESCE(p_payload->>'report_priority_assessment', report_priority_assessment),
      urgency_indicators = COALESCE(p_payload->'urgency_indicators', urgency_indicators),
      type_hint = COALESCE((p_payload->>'type_hint')::core.incident_type_enum, type_hint),
      priority_hint = COALESCE((p_payload->>'priority_hint')::core.incident_priority_enum, priority_hint),
      triaged_by = auth.uid(),
      status = 'triaged',
      updated_at = now(),
      updated_by = auth.uid()
  WHERE id = p_cfs_id;

  INSERT INTO case_mgmt.cfs_timeline (
    incident_report_id,
    phase,
    phase_started_at,
    phase_status,
    phase_notes,
    performed_by,
    organization_id,
    created_by
  ) VALUES (
    p_cfs_id,
    'assessment',
    now(),
    'completed',
    COALESCE(p_payload->>'phase_notes', 'Triage completed'),
    auth.uid(),
    portal.actor_org_id(),
    auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION case_mgmt.cfs_verify(p_cfs_id bigint, p_status text, p_method text, p_notes text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'case_mgmt', 'core', 'portal', 'public'
SET row_security = off
AS $$
BEGIN
  IF NOT case_mgmt.cfs_actor_has_permission(p_cfs_id, 'cfs.triage', 'collaborate') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE case_mgmt.calls_for_service
  SET verification_status = COALESCE(p_status, verification_status),
      verification_method = COALESCE(p_method, verification_method),
      verification_notes = COALESCE(p_notes, verification_notes),
      verified_at = now(),
      verified_by = auth.uid(),
      updated_at = now(),
      updated_by = auth.uid()
  WHERE id = p_cfs_id;

  INSERT INTO case_mgmt.cfs_timeline (
    incident_report_id,
    phase,
    phase_started_at,
    phase_status,
    phase_notes,
    performed_by,
    organization_id,
    created_by
  ) VALUES (
    p_cfs_id,
    'verification',
    now(),
    'completed',
    COALESCE(p_notes, 'Verification updated'),
    auth.uid(),
    portal.actor_org_id(),
    auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION case_mgmt.cfs_convert_to_incident(p_cfs_id bigint, p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'case_mgmt', 'core', 'portal', 'public'
SET row_security = off
AS $$
DECLARE
  cfs_record record;
  incident_id bigint;
  dispatch_priority core.dispatch_priority_enum;
BEGIN
  IF NOT case_mgmt.cfs_actor_has_permission(p_cfs_id, 'cfs.dispatch', 'dispatch') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO cfs_record
  FROM case_mgmt.calls_for_service
  WHERE id = p_cfs_id;

  IF cfs_record IS NULL THEN
    RAISE EXCEPTION 'Call not found';
  END IF;

  dispatch_priority := CASE cfs_record.report_priority_assessment
    WHEN 'immediate' THEN 'critical'
    WHEN 'urgent' THEN 'high'
    WHEN 'routine' THEN 'medium'
    ELSE 'informational'
  END;

  INSERT INTO case_mgmt.incidents (
    incident_report_id,
    owning_organization_id,
    incident_type,
    description,
    status,
    dispatch_priority,
    dispatch_at,
    location,
    coordinates,
    reported_by,
    created_by,
    updated_by
  ) VALUES (
    cfs_record.id,
    cfs_record.owning_organization_id,
    COALESCE((p_payload->>'incident_type')::core.incident_type_enum, cfs_record.type_hint),
    COALESCE(p_payload->>'description', cfs_record.initial_report_narrative),
    COALESCE((p_payload->>'status')::core.incident_status_enum, 'open'),
    COALESCE((p_payload->>'dispatch_priority')::core.dispatch_priority_enum, dispatch_priority),
    now(),
    COALESCE(cfs_record.location_text, cfs_record.reported_location),
    cfs_record.reported_coordinates,
    COALESCE(p_payload->>'reported_by', cfs_record.reporter_name),
    auth.uid(),
    auth.uid()
  )
  RETURNING id INTO incident_id;

  UPDATE case_mgmt.calls_for_service
  SET status = 'converted',
      report_status = 'escalated',
      converted_incident_id = incident_id,
      escalated_at = now(),
      escalated_by = auth.uid(),
      updated_at = now(),
      updated_by = auth.uid()
  WHERE id = p_cfs_id;

  INSERT INTO case_mgmt.cfs_timeline (
    incident_report_id,
    incident_id,
    phase,
    phase_started_at,
    phase_status,
    phase_notes,
    performed_by,
    organization_id,
    created_by
  ) VALUES (
    p_cfs_id,
    incident_id,
    'dispatch',
    now(),
    'completed',
    COALESCE(p_payload->>'phase_notes', 'Converted to incident and dispatched'),
    auth.uid(),
    portal.actor_org_id(),
    auth.uid()
  );

  RETURN incident_id;
END;
$$;

CREATE OR REPLACE FUNCTION case_mgmt.cfs_mark_duplicate(p_cfs_id bigint, p_duplicate_of bigint, p_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'case_mgmt', 'core', 'portal', 'public'
SET row_security = off
AS $$
BEGIN
  IF NOT case_mgmt.cfs_actor_has_permission(p_cfs_id, 'cfs.update', 'collaborate') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE case_mgmt.calls_for_service
  SET status = 'dismissed',
      report_status = 'duplicate',
      duplicate_of_report_id = p_duplicate_of,
      updated_at = now(),
      updated_by = auth.uid()
  WHERE id = p_cfs_id;

  INSERT INTO case_mgmt.cfs_timeline (
    incident_report_id,
    phase,
    phase_started_at,
    phase_status,
    phase_notes,
    performed_by,
    organization_id,
    created_by
  ) VALUES (
    p_cfs_id,
    'resolution',
    now(),
    'completed',
    COALESCE(p_notes, 'Marked as duplicate'),
    auth.uid(),
    portal.actor_org_id(),
    auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION case_mgmt.cfs_dismiss(p_cfs_id bigint, p_report_status text, p_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'case_mgmt', 'core', 'portal', 'public'
SET row_security = off
AS $$
DECLARE
  v_status text := COALESCE(p_report_status, 'resolved');
BEGIN
  IF NOT case_mgmt.cfs_actor_has_permission(p_cfs_id, 'cfs.update', 'collaborate') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE case_mgmt.calls_for_service
  SET status = 'dismissed',
      report_status = v_status,
      updated_at = now(),
      updated_by = auth.uid()
  WHERE id = p_cfs_id;

  INSERT INTO case_mgmt.cfs_timeline (
    incident_report_id,
    phase,
    phase_started_at,
    phase_status,
    phase_notes,
    performed_by,
    organization_id,
    created_by
  ) VALUES (
    p_cfs_id,
    'resolution',
    now(),
    'completed',
    COALESCE(p_notes, 'Call closed'),
    auth.uid(),
    portal.actor_org_id(),
    auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION case_mgmt.cfs_grant_org_access(
  p_cfs_id bigint,
  p_org_id bigint,
  p_access_level core.cfs_access_level_enum,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'case_mgmt', 'core', 'portal', 'public'
SET row_security = off
AS $$
BEGIN
  IF NOT case_mgmt.cfs_actor_has_permission(p_cfs_id, 'cfs.share', 'dispatch') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  INSERT INTO case_mgmt.cfs_org_access (
    cfs_id,
    organization_id,
    access_level,
    reason,
    granted_by,
    granted_at,
    is_active
  ) VALUES (
    p_cfs_id,
    p_org_id,
    COALESCE(p_access_level, 'view'),
    p_reason,
    auth.uid(),
    now(),
    true
  )
  ON CONFLICT (cfs_id, organization_id) WHERE is_active
  DO UPDATE SET
    access_level = EXCLUDED.access_level,
    reason = EXCLUDED.reason,
    granted_by = auth.uid(),
    granted_at = now(),
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION case_mgmt.cfs_revoke_org_access(
  p_cfs_id bigint,
  p_org_id bigint,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'case_mgmt', 'core', 'portal', 'public'
SET row_security = off
AS $$
BEGIN
  IF NOT case_mgmt.cfs_actor_has_permission(p_cfs_id, 'cfs.share', 'dispatch') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE case_mgmt.cfs_org_access
  SET is_active = false,
      revoked_at = now(),
      revoked_by = auth.uid(),
      reason = COALESCE(p_reason, reason),
      updated_at = now()
  WHERE cfs_id = p_cfs_id
    AND organization_id = p_org_id
    AND is_active;
END;
$$;

CREATE OR REPLACE FUNCTION case_mgmt.cfs_transfer_ownership(
  p_cfs_id bigint,
  p_new_org_id bigint,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'case_mgmt', 'core', 'portal', 'public'
SET row_security = off
AS $$
DECLARE
  v_old_org_id bigint;
BEGIN
  IF NOT case_mgmt.cfs_actor_has_permission(p_cfs_id, 'cfs.dispatch', 'dispatch') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT owning_organization_id INTO v_old_org_id
  FROM case_mgmt.calls_for_service
  WHERE id = p_cfs_id;

  UPDATE case_mgmt.calls_for_service
  SET owning_organization_id = p_new_org_id,
      updated_at = now(),
      updated_by = auth.uid()
  WHERE id = p_cfs_id;

  UPDATE case_mgmt.incidents
  SET owning_organization_id = p_new_org_id,
      updated_at = now(),
      updated_by = auth.uid()
  WHERE incident_report_id = p_cfs_id;

  IF v_old_org_id IS NOT NULL AND v_old_org_id <> p_new_org_id THEN
    PERFORM case_mgmt.cfs_grant_org_access(p_cfs_id, v_old_org_id, 'view', COALESCE(p_reason, 'Ownership transferred'));
  END IF;
END;
$$;

-- 12) Views
CREATE OR REPLACE VIEW case_mgmt.cfs_queue_view
WITH (security_invoker = true)
AS
SELECT
  c.id,
  c.report_number,
  c.report_received_at,
  c.received_at,
  c.status,
  c.report_status,
  c.report_priority_assessment,
  c.priority_hint,
  c.type_hint,
  c.origin,
  c.source,
  c.report_method,
  c.location_text,
  c.reported_location,
  c.reported_coordinates,
  c.location_confidence,
  c.owning_organization_id,
  o.name AS owning_organization_name,
  c.reporting_organization_id,
  ro.name AS reporting_organization_name,
  c.notify_opt_in,
  c.notify_channel,
  c.notify_target,
  c.public_tracking_enabled,
  c.public_tracking_id,
  c.created_at,
  c.updated_at,
  c.duplicate_of_report_id,
  c.converted_incident_id,
  c.escalated_to_incident_id
FROM case_mgmt.calls_for_service c
LEFT JOIN core.organizations o ON o.id = c.owning_organization_id
LEFT JOIN core.organizations ro ON ro.id = c.reporting_organization_id;

-- 13) RLS enablement
ALTER TABLE case_mgmt.calls_for_service ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_mgmt.cfs_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_mgmt.cfs_org_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_mgmt.cfs_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_mgmt.cfs_public_tracking ENABLE ROW LEVEL SECURITY;

-- Calls for service policies
DROP POLICY IF EXISTS cfs_select_policy ON case_mgmt.calls_for_service;
DROP POLICY IF EXISTS cfs_insert_policy ON case_mgmt.calls_for_service;
DROP POLICY IF EXISTS cfs_update_policy ON case_mgmt.calls_for_service;
DROP POLICY IF EXISTS cfs_delete_policy ON case_mgmt.calls_for_service;

CREATE POLICY cfs_select_policy ON case_mgmt.calls_for_service
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR core.is_global_admin(auth.uid())
    OR case_mgmt.cfs_actor_has_permission(id, 'cfs.read', 'view')
  );

CREATE POLICY cfs_insert_policy ON case_mgmt.calls_for_service
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR (
      owning_organization_id = portal.actor_org_id()
      AND core.has_org_permission(owning_organization_id, 'cfs.create', auth.uid())
    )
    OR core.is_global_admin(auth.uid())
  );

CREATE POLICY cfs_update_policy ON case_mgmt.calls_for_service
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR case_mgmt.cfs_actor_has_permission(id, 'cfs.update', 'collaborate')
    OR case_mgmt.cfs_actor_has_permission(id, 'cfs.triage', 'collaborate')
    OR case_mgmt.cfs_actor_has_permission(id, 'cfs.dispatch', 'dispatch')
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR case_mgmt.cfs_actor_has_permission(id, 'cfs.update', 'collaborate')
    OR case_mgmt.cfs_actor_has_permission(id, 'cfs.triage', 'collaborate')
    OR case_mgmt.cfs_actor_has_permission(id, 'cfs.dispatch', 'dispatch')
  );

CREATE POLICY cfs_delete_policy ON case_mgmt.calls_for_service
  FOR DELETE
  USING (
    auth.role() = 'service_role'
    OR core.is_global_admin(auth.uid())
    OR case_mgmt.cfs_actor_has_permission(id, 'cfs.delete', 'dispatch')
  );

-- Timeline policies
DROP POLICY IF EXISTS cfs_timeline_select_policy ON case_mgmt.cfs_timeline;
DROP POLICY IF EXISTS cfs_timeline_insert_policy ON case_mgmt.cfs_timeline;
DROP POLICY IF EXISTS cfs_timeline_update_policy ON case_mgmt.cfs_timeline;
DROP POLICY IF EXISTS cfs_timeline_delete_policy ON case_mgmt.cfs_timeline;

CREATE POLICY cfs_timeline_select_policy ON case_mgmt.cfs_timeline
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR case_mgmt.cfs_actor_has_permission(incident_report_id, 'cfs.read', 'view')
  );

CREATE POLICY cfs_timeline_insert_policy ON case_mgmt.cfs_timeline
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR (
      organization_id = portal.actor_org_id()
      AND case_mgmt.cfs_actor_has_permission(incident_report_id, 'cfs.update', 'collaborate')
    )
  );

CREATE POLICY cfs_timeline_update_policy ON case_mgmt.cfs_timeline
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR case_mgmt.cfs_actor_has_permission(incident_report_id, 'cfs.update', 'collaborate')
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR case_mgmt.cfs_actor_has_permission(incident_report_id, 'cfs.update', 'collaborate')
  );

CREATE POLICY cfs_timeline_delete_policy ON case_mgmt.cfs_timeline
  FOR DELETE
  USING (
    auth.role() = 'service_role'
    OR case_mgmt.cfs_actor_has_permission(incident_report_id, 'cfs.dispatch', 'dispatch')
  );

-- Collaboration access policies
DROP POLICY IF EXISTS cfs_org_access_select_policy ON case_mgmt.cfs_org_access;
DROP POLICY IF EXISTS cfs_org_access_insert_policy ON case_mgmt.cfs_org_access;
DROP POLICY IF EXISTS cfs_org_access_update_policy ON case_mgmt.cfs_org_access;
DROP POLICY IF EXISTS cfs_org_access_delete_policy ON case_mgmt.cfs_org_access;

CREATE POLICY cfs_org_access_select_policy ON case_mgmt.cfs_org_access
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR core.is_global_admin(auth.uid())
    OR organization_id = portal.actor_org_id()
    OR case_mgmt.cfs_actor_has_permission(cfs_id, 'cfs.share', 'dispatch')
  );

CREATE POLICY cfs_org_access_insert_policy ON case_mgmt.cfs_org_access
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR case_mgmt.cfs_actor_has_permission(cfs_id, 'cfs.share', 'dispatch')
  );

CREATE POLICY cfs_org_access_update_policy ON case_mgmt.cfs_org_access
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR case_mgmt.cfs_actor_has_permission(cfs_id, 'cfs.share', 'dispatch')
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR case_mgmt.cfs_actor_has_permission(cfs_id, 'cfs.share', 'dispatch')
  );

CREATE POLICY cfs_org_access_delete_policy ON case_mgmt.cfs_org_access
  FOR DELETE
  USING (
    auth.role() = 'service_role'
    OR case_mgmt.cfs_actor_has_permission(cfs_id, 'cfs.share', 'dispatch')
  );

-- Attachments policies
DROP POLICY IF EXISTS cfs_attachments_select_policy ON case_mgmt.cfs_attachments;
DROP POLICY IF EXISTS cfs_attachments_insert_policy ON case_mgmt.cfs_attachments;
DROP POLICY IF EXISTS cfs_attachments_delete_policy ON case_mgmt.cfs_attachments;

CREATE POLICY cfs_attachments_select_policy ON case_mgmt.cfs_attachments
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR case_mgmt.cfs_actor_has_permission(cfs_id, 'cfs.read', 'view')
  );

CREATE POLICY cfs_attachments_insert_policy ON case_mgmt.cfs_attachments
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR (
      organization_id = portal.actor_org_id()
      AND case_mgmt.cfs_actor_has_permission(cfs_id, 'cfs.update', 'collaborate')
    )
  );

CREATE POLICY cfs_attachments_delete_policy ON case_mgmt.cfs_attachments
  FOR DELETE
  USING (
    auth.role() = 'service_role'
    OR case_mgmt.cfs_actor_has_permission(cfs_id, 'cfs.dispatch', 'dispatch')
  );

-- Public tracking policies (internal only; public access via RPC)
DROP POLICY IF EXISTS cfs_public_tracking_select_policy ON case_mgmt.cfs_public_tracking;
DROP POLICY IF EXISTS cfs_public_tracking_insert_policy ON case_mgmt.cfs_public_tracking;
DROP POLICY IF EXISTS cfs_public_tracking_update_policy ON case_mgmt.cfs_public_tracking;
DROP POLICY IF EXISTS cfs_public_tracking_delete_policy ON case_mgmt.cfs_public_tracking;

CREATE POLICY cfs_public_tracking_select_policy ON case_mgmt.cfs_public_tracking
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR case_mgmt.cfs_actor_has_permission(cfs_id, 'cfs.read', 'view')
  );

CREATE POLICY cfs_public_tracking_insert_policy ON case_mgmt.cfs_public_tracking
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR case_mgmt.cfs_actor_has_permission(cfs_id, 'cfs.public_track', 'dispatch')
  );

CREATE POLICY cfs_public_tracking_update_policy ON case_mgmt.cfs_public_tracking
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR case_mgmt.cfs_actor_has_permission(cfs_id, 'cfs.public_track', 'dispatch')
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR case_mgmt.cfs_actor_has_permission(cfs_id, 'cfs.public_track', 'dispatch')
  );

CREATE POLICY cfs_public_tracking_delete_policy ON case_mgmt.cfs_public_tracking
  FOR DELETE
  USING (
    auth.role() = 'service_role'
    OR case_mgmt.cfs_actor_has_permission(cfs_id, 'cfs.public_track', 'dispatch')
  );

-- 14) Incidents policies (org-scoped)
DROP POLICY IF EXISTS incidents_select_policy ON case_mgmt.incidents;
DROP POLICY IF EXISTS incidents_insert_policy ON case_mgmt.incidents;
DROP POLICY IF EXISTS incidents_update_policy ON case_mgmt.incidents;
DROP POLICY IF EXISTS incidents_delete_policy ON case_mgmt.incidents;

CREATE POLICY incidents_select_policy ON case_mgmt.incidents
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR case_mgmt.incident_actor_has_permission(id, 'incidents.read', 'view')
  );

CREATE POLICY incidents_insert_policy ON case_mgmt.incidents
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR (
      owning_organization_id = portal.actor_org_id()
      AND core.has_org_permission(owning_organization_id, 'incidents.create', auth.uid())
    )
  );

CREATE POLICY incidents_update_policy ON case_mgmt.incidents
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR case_mgmt.incident_actor_has_permission(id, 'incidents.update', 'collaborate')
    OR case_mgmt.incident_actor_has_permission(id, 'incidents.assign', 'dispatch')
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR case_mgmt.incident_actor_has_permission(id, 'incidents.update', 'collaborate')
    OR case_mgmt.incident_actor_has_permission(id, 'incidents.assign', 'dispatch')
  );

CREATE POLICY incidents_delete_policy ON case_mgmt.incidents
  FOR DELETE
  USING (
    auth.role() = 'service_role'
    OR case_mgmt.incident_actor_has_permission(id, 'incidents.delete', 'dispatch')
  );

-- Incident people + medical + links use incident access
DROP POLICY IF EXISTS incident_people_policy ON case_mgmt.incident_people;
DROP POLICY IF EXISTS incident_person_medical_policy ON case_mgmt.incident_person_medical;
DROP POLICY IF EXISTS iharc_staff_select_incident_links ON case_mgmt.incident_links;
DROP POLICY IF EXISTS iharc_staff_insert_incident_links ON case_mgmt.incident_links;
DROP POLICY IF EXISTS iharc_staff_update_incident_links ON case_mgmt.incident_links;
DROP POLICY IF EXISTS iharc_staff_delete_incident_links ON case_mgmt.incident_links;

CREATE POLICY incident_people_select_policy ON case_mgmt.incident_people
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR case_mgmt.incident_actor_has_permission(incident_id, 'incidents.read', 'view')
  );

CREATE POLICY incident_people_modify_policy ON case_mgmt.incident_people
  FOR ALL
  USING (
    auth.role() = 'service_role'
    OR case_mgmt.incident_actor_has_permission(incident_id, 'incidents.update', 'collaborate')
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR case_mgmt.incident_actor_has_permission(incident_id, 'incidents.update', 'collaborate')
  );

CREATE POLICY incident_person_medical_select_policy ON case_mgmt.incident_person_medical
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1
      FROM case_mgmt.incident_people ip
      WHERE ip.id = incident_person_medical.incident_person_id
        AND case_mgmt.incident_actor_has_permission(ip.incident_id, 'incidents.read', 'view')
    )
  );

CREATE POLICY incident_person_medical_modify_policy ON case_mgmt.incident_person_medical
  FOR ALL
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1
      FROM case_mgmt.incident_people ip
      WHERE ip.id = incident_person_medical.incident_person_id
        AND case_mgmt.incident_actor_has_permission(ip.incident_id, 'incidents.update', 'collaborate')
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1
      FROM case_mgmt.incident_people ip
      WHERE ip.id = incident_person_medical.incident_person_id
        AND case_mgmt.incident_actor_has_permission(ip.incident_id, 'incidents.update', 'collaborate')
    )
  );

CREATE POLICY incident_links_select_policy ON case_mgmt.incident_links
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR case_mgmt.incident_actor_has_permission(incident_id, 'incidents.read', 'view')
  );

CREATE POLICY incident_links_modify_policy ON case_mgmt.incident_links
  FOR ALL
  USING (
    auth.role() = 'service_role'
    OR case_mgmt.incident_actor_has_permission(incident_id, 'incidents.update', 'collaborate')
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR case_mgmt.incident_actor_has_permission(incident_id, 'incidents.update', 'collaborate')
  );

-- 15) Permissions
INSERT INTO core.permissions (name, description, domain, category, created_by, updated_by)
VALUES
  ('cfs.read', 'View calls for service', 'case_mgmt', 'cfs', null, null),
  ('cfs.create', 'Create calls for service', 'case_mgmt', 'cfs', null, null),
  ('cfs.update', 'Update calls for service', 'case_mgmt', 'cfs', null, null),
  ('cfs.triage', 'Triage and verify calls for service', 'case_mgmt', 'cfs', null, null),
  ('cfs.dispatch', 'Dispatch or convert calls for service', 'case_mgmt', 'cfs', null, null),
  ('cfs.share', 'Share calls for service across orgs', 'case_mgmt', 'cfs', null, null),
  ('cfs.public_track', 'Enable public tracking for calls', 'case_mgmt', 'cfs', null, null),
  ('cfs.delete', 'Delete calls for service', 'case_mgmt', 'cfs', null, null)
ON CONFLICT (name) DO NOTHING;

WITH permission_map(template_name, permission_name) AS (
  VALUES
    ('iharc_staff', 'cfs.read'),
    ('iharc_staff', 'cfs.create'),
    ('iharc_staff', 'cfs.update'),
    ('iharc_staff', 'cfs.triage'),
    ('iharc_supervisor', 'cfs.read'),
    ('iharc_supervisor', 'cfs.create'),
    ('iharc_supervisor', 'cfs.update'),
    ('iharc_supervisor', 'cfs.triage'),
    ('iharc_supervisor', 'cfs.dispatch'),
    ('iharc_supervisor', 'cfs.share'),
    ('iharc_supervisor', 'cfs.public_track'),
    ('org_admin', 'cfs.read'),
    ('org_admin', 'cfs.create'),
    ('org_admin', 'cfs.update'),
    ('org_admin', 'cfs.triage'),
    ('org_admin', 'cfs.dispatch'),
    ('org_admin', 'cfs.share'),
    ('org_admin', 'cfs.public_track'),
    ('org_rep', 'cfs.read'),
    ('org_rep', 'cfs.create'),
    ('org_rep', 'cfs.update'),
    ('org_member', 'cfs.read'),
    ('org_member', 'cfs.create'),
    ('org_member', 'cfs.update'),
    ('org_volunteer', 'cfs.read'),
    ('org_volunteer', 'cfs.create')
)
INSERT INTO core.role_template_permissions (template_id, permission_id, created_at, updated_at)
SELECT rt.id, p.id, now(), now()
FROM permission_map pm
JOIN core.role_templates rt ON rt.name = pm.template_name
JOIN core.permissions p ON p.name = pm.permission_name
ON CONFLICT DO NOTHING;

WITH permission_map(template_name, permission_name) AS (
  VALUES
    ('iharc_staff', 'cfs.read'),
    ('iharc_staff', 'cfs.create'),
    ('iharc_staff', 'cfs.update'),
    ('iharc_staff', 'cfs.triage'),
    ('iharc_supervisor', 'cfs.read'),
    ('iharc_supervisor', 'cfs.create'),
    ('iharc_supervisor', 'cfs.update'),
    ('iharc_supervisor', 'cfs.triage'),
    ('iharc_supervisor', 'cfs.dispatch'),
    ('iharc_supervisor', 'cfs.share'),
    ('iharc_supervisor', 'cfs.public_track'),
    ('org_admin', 'cfs.read'),
    ('org_admin', 'cfs.create'),
    ('org_admin', 'cfs.update'),
    ('org_admin', 'cfs.triage'),
    ('org_admin', 'cfs.dispatch'),
    ('org_admin', 'cfs.share'),
    ('org_admin', 'cfs.public_track'),
    ('org_rep', 'cfs.read'),
    ('org_rep', 'cfs.create'),
    ('org_rep', 'cfs.update'),
    ('org_member', 'cfs.read'),
    ('org_member', 'cfs.create'),
    ('org_member', 'cfs.update'),
    ('org_volunteer', 'cfs.read'),
    ('org_volunteer', 'cfs.create')
)
INSERT INTO core.org_role_permissions (org_role_id, permission_id, created_at, updated_at)
SELECT r.id, p.id, now(), now()
FROM permission_map pm
JOIN core.role_templates rt ON rt.name = pm.template_name
JOIN core.org_roles r ON r.template_id = rt.id
JOIN core.permissions p ON p.name = pm.permission_name
ON CONFLICT DO NOTHING;

-- 16) Public RPC grants
GRANT EXECUTE ON FUNCTION case_mgmt.cfs_public_tracking_get(text) TO anon, authenticated;
