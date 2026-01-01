-- Atomic audit + CFS create/public tracking + appointment completion

-- 1) CFS create now handles optional public tracking and returns json payload
DROP FUNCTION IF EXISTS case_mgmt.cfs_create_call(jsonb);
CREATE OR REPLACE FUNCTION case_mgmt.cfs_create_call(p_payload jsonb)
RETURNS jsonb
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
  v_public_enabled boolean := COALESCE((p_payload->>'public_tracking_enabled')::boolean, false);
  v_public_category core.cfs_public_category_enum := NULLIF(p_payload->>'public_category', '')::core.cfs_public_category_enum;
  v_public_location text := NULLIF(p_payload->>'public_location_area', '');
  v_public_summary text := NULLIF(p_payload->>'public_summary', '');
  v_tracking_id text;
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

  IF v_public_enabled THEN
    IF v_public_category IS NULL OR v_public_location IS NULL THEN
      RAISE EXCEPTION 'Public tracking requires category and location.';
    END IF;

    v_tracking_id := case_mgmt.cfs_public_tracking_upsert(
      v_call_id,
      v_public_category,
      v_public_location,
      v_public_summary
    );
  END IF;

  PERFORM public.portal_log_audit_event(
    'cfs_created',
    'case_mgmt.calls_for_service',
    NULL,
    jsonb_strip_nulls(jsonb_build_object(
      'entity_ref', format('case_mgmt.calls_for_service:%s', v_call_id),
      'origin', v_origin,
      'source', v_source,
      'report_method', COALESCE(p_payload->>'report_method', 'phone'),
      'report_priority_assessment', COALESCE(p_payload->>'report_priority_assessment', 'routine'),
      'report_status', 'active',
      'status', 'received',
      'reporting_organization_id', v_reporting_org,
      'reporting_person_id', v_reporting_person
    ))
  );

  RETURN jsonb_build_object('call_id', v_call_id, 'tracking_id', v_tracking_id);
END;
$$;

-- 2) Audit logging for CFS RPCs
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

  PERFORM public.portal_log_audit_event(
    'cfs_triaged',
    'case_mgmt.calls_for_service',
    NULL,
    jsonb_strip_nulls(jsonb_build_object(
      'entity_ref', format('case_mgmt.calls_for_service:%s', p_cfs_id),
      'report_priority_assessment', p_payload->>'report_priority_assessment',
      'type_hint', p_payload->>'type_hint',
      'priority_hint', p_payload->>'priority_hint'
    ))
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

  PERFORM public.portal_log_audit_event(
    'cfs_verified',
    'case_mgmt.calls_for_service',
    NULL,
    jsonb_strip_nulls(jsonb_build_object(
      'entity_ref', format('case_mgmt.calls_for_service:%s', p_cfs_id),
      'verification_status', p_status,
      'verification_method', p_method
    ))
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

  PERFORM public.portal_log_audit_event(
    'cfs_closed',
    'case_mgmt.calls_for_service',
    NULL,
    jsonb_strip_nulls(jsonb_build_object(
      'entity_ref', format('case_mgmt.calls_for_service:%s', p_cfs_id),
      'report_status', v_status
    ))
  );
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

  PERFORM public.portal_log_audit_event(
    'cfs_marked_duplicate',
    'case_mgmt.calls_for_service',
    NULL,
    jsonb_strip_nulls(jsonb_build_object(
      'entity_ref', format('case_mgmt.calls_for_service:%s', p_cfs_id),
      'duplicate_of_report_id', p_duplicate_of
    ))
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
  resolved_incident_type core.incident_type_enum;
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

  resolved_incident_type := COALESCE((p_payload->>'incident_type')::core.incident_type_enum, cfs_record.type_hint);

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
    resolved_incident_type,
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

  PERFORM public.portal_log_audit_event(
    'cfs_converted_to_incident',
    'case_mgmt.incidents',
    NULL,
    jsonb_strip_nulls(jsonb_build_object(
      'entity_ref', format('case_mgmt.incidents:%s', incident_id),
      'cfs_id', p_cfs_id,
      'incident_type', resolved_incident_type
    ))
  );

  RETURN incident_id;
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
DECLARE
  v_access_level core.cfs_access_level_enum := COALESCE(p_access_level, 'view');
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
    v_access_level,
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

  PERFORM public.portal_log_audit_event(
    'cfs_shared',
    'case_mgmt.cfs_org_access',
    NULL,
    jsonb_strip_nulls(jsonb_build_object(
      'cfs_id', p_cfs_id,
      'organization_id', p_org_id,
      'access_level', v_access_level
    ))
  );
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

  PERFORM public.portal_log_audit_event(
    'cfs_share_revoked',
    'case_mgmt.cfs_org_access',
    NULL,
    jsonb_strip_nulls(jsonb_build_object(
      'cfs_id', p_cfs_id,
      'organization_id', p_org_id
    ))
  );
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

  PERFORM public.portal_log_audit_event(
    'cfs_transfer_ownership',
    'case_mgmt.calls_for_service',
    NULL,
    jsonb_strip_nulls(jsonb_build_object(
      'entity_ref', format('case_mgmt.calls_for_service:%s', p_cfs_id),
      'new_org_id', p_new_org_id,
      'old_org_id', v_old_org_id,
      'reason', p_reason
    ))
  );
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

  PERFORM public.portal_log_audit_event(
    'cfs_public_tracking_enabled',
    'case_mgmt.cfs_public_tracking',
    NULL,
    jsonb_strip_nulls(jsonb_build_object(
      'entity_ref', format('case_mgmt.cfs_public_tracking:%s', tracking_id),
      'cfs_id', p_cfs_id,
      'category', p_category,
      'public_location_area', p_public_location_area
    ))
  );

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
DECLARE
  v_tracking_id text;
BEGIN
  IF NOT case_mgmt.cfs_actor_has_permission(p_cfs_id, 'cfs.public_track', 'dispatch') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT public_tracking_id INTO v_tracking_id
  FROM case_mgmt.calls_for_service
  WHERE id = p_cfs_id;

  UPDATE case_mgmt.calls_for_service
  SET public_tracking_enabled = false,
      public_tracking_id = NULL,
      updated_at = now(),
      updated_by = auth.uid()
  WHERE id = p_cfs_id;

  DELETE FROM case_mgmt.cfs_public_tracking
  WHERE cfs_id = p_cfs_id;

  PERFORM public.portal_log_audit_event(
    'cfs_public_tracking_disabled',
    'case_mgmt.cfs_public_tracking',
    NULL,
    jsonb_strip_nulls(jsonb_build_object(
      'entity_ref', CASE WHEN v_tracking_id IS NULL THEN NULL ELSE format('case_mgmt.cfs_public_tracking:%s', v_tracking_id) END,
      'cfs_id', p_cfs_id
    ))
  );
END;
$$;

-- New RPCs for CFS status + notes (transactional audit)
CREATE OR REPLACE FUNCTION case_mgmt.cfs_update_status(
  p_cfs_id bigint,
  p_status core.cfs_status_enum,
  p_notes text DEFAULT NULL
)
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
  SET status = p_status,
      updated_at = now(),
      updated_by = auth.uid()
  WHERE id = p_cfs_id;

  IF p_notes IS NOT NULL AND length(trim(p_notes)) > 0 THEN
    INSERT INTO case_mgmt.cfs_timeline (
      incident_report_id,
      phase,
      sub_phase,
      phase_started_at,
      phase_status,
      phase_notes,
      performed_by,
      organization_id,
      created_by
    ) VALUES (
      p_cfs_id,
      'response',
      'status_update',
      now(),
      'completed',
      p_notes,
      auth.uid(),
      portal.actor_org_id(),
      auth.uid()
    );
  END IF;

  PERFORM public.portal_log_audit_event(
    'cfs_status_updated',
    'case_mgmt.calls_for_service',
    NULL,
    jsonb_strip_nulls(jsonb_build_object(
      'entity_ref', format('case_mgmt.calls_for_service:%s', p_cfs_id),
      'status', p_status,
      'notes', p_notes
    ))
  );
END;
$$;

CREATE OR REPLACE FUNCTION case_mgmt.cfs_add_note(p_cfs_id bigint, p_note text)
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

  INSERT INTO case_mgmt.cfs_timeline (
    incident_report_id,
    phase,
    sub_phase,
    phase_started_at,
    phase_status,
    phase_notes,
    performed_by,
    organization_id,
    created_by
  ) VALUES (
    p_cfs_id,
    'follow_up',
    'note',
    now(),
    'completed',
    p_note,
    auth.uid(),
    portal.actor_org_id(),
    auth.uid()
  );

  PERFORM public.portal_log_audit_event(
    'cfs_note_added',
    'case_mgmt.cfs_timeline',
    NULL,
    jsonb_strip_nulls(jsonb_build_object(
      'cfs_id', p_cfs_id
    ))
  );
END;
$$;

-- 3) Appointment completion audit inside RPC
CREATE OR REPLACE FUNCTION portal.complete_appointment_with_costs(
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
RETURNS TABLE (appointment_id uuid, cost_event_id uuid)
LANGUAGE plpgsql
SET search_path = portal, core, public
AS $$
DECLARE
  v_org_id bigint;
  v_occurred_at timestamptz;
BEGIN
  IF p_person_id IS NULL THEN
    RAISE EXCEPTION 'Unable to resolve the client record for cost tracking.';
  END IF;

  UPDATE portal.appointments
  SET status = 'completed',
      outcome_notes = p_outcome_notes,
      updated_at = now()
  WHERE id = p_appointment_id
  RETURNING organization_id, occurs_at INTO v_org_id, v_occurred_at;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found or unavailable.';
  END IF;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Appointments must be tied to an organization to record costs.';
  END IF;

  IF v_occurred_at IS NULL THEN
    RAISE EXCEPTION 'Appointments must have a scheduled time to record costs.';
  END IF;

  INSERT INTO core.cost_events (
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
  ) VALUES (
    p_person_id,
    v_org_id,
    'appointment',
    p_appointment_id::text,
    v_occurred_at,
    p_cost_amount,
    COALESCE(p_currency, 'CAD'),
    p_quantity,
    p_unit_cost,
    p_uom,
    p_cost_category_id,
    COALESCE(p_metadata, '{}'::jsonb),
    p_created_by
  )
  RETURNING id INTO cost_event_id;

  PERFORM public.portal_log_audit_event(
    'appointment_completed',
    'appointment',
    p_appointment_id,
    jsonb_strip_nulls(jsonb_build_object(
      'entity_ref', format('portal.appointments:%s', p_appointment_id),
      'outcome_notes', p_outcome_notes
    ))
  );

  PERFORM public.portal_log_audit_event(
    'cost_event_created',
    'core.cost_events',
    cost_event_id,
    jsonb_strip_nulls(jsonb_build_object(
      'entity_ref', format('core.cost_events:%s', cost_event_id),
      'source_type', 'appointment',
      'source_id', p_appointment_id::text,
      'person_id', p_person_id,
      'organization_id', v_org_id,
      'cost_amount', p_cost_amount
    ))
  );

  appointment_id := p_appointment_id;
  RETURN NEXT;
END;
$$;

-- 4) Consent audit triggers
CREATE OR REPLACE FUNCTION core.audit_person_consent_requests()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'core', 'portal', 'public'
AS $$
DECLARE
  v_action text;
  v_entity_ref text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'consent_request_submitted';
    v_entity_ref := format('core.person_consent_requests:%s', NEW.id);

    PERFORM public.portal_log_audit_event(
      v_action,
      'core.person_consent_requests',
      NULL,
      jsonb_strip_nulls(jsonb_build_object(
        'entity_ref', v_entity_ref,
        'person_id', NEW.person_id,
        'requesting_org_id', NEW.requesting_org_id,
        'status', NEW.status
      ))
    );

    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'approved' THEN
      v_action := 'consent_request_approved';
    ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'denied' THEN
      v_action := 'consent_request_denied';
    ELSE
      v_action := 'consent_request_updated';
    END IF;

    v_entity_ref := format('core.person_consent_requests:%s', NEW.id);

    PERFORM public.portal_log_audit_event(
      v_action,
      'core.person_consent_requests',
      NULL,
      jsonb_strip_nulls(jsonb_build_object(
        'entity_ref', v_entity_ref,
        'person_id', NEW.person_id,
        'requesting_org_id', NEW.requesting_org_id,
        'status', NEW.status,
        'previous_status', OLD.status
      ))
    );

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'consent_request_deleted';
    v_entity_ref := format('core.person_consent_requests:%s', OLD.id);

    PERFORM public.portal_log_audit_event(
      v_action,
      'core.person_consent_requests',
      NULL,
      jsonb_strip_nulls(jsonb_build_object(
        'entity_ref', v_entity_ref,
        'person_id', OLD.person_id,
        'requesting_org_id', OLD.requesting_org_id,
        'status', OLD.status
      ))
    );

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_person_consent_requests ON core.person_consent_requests;
CREATE TRIGGER trg_audit_person_consent_requests
  AFTER INSERT OR UPDATE OR DELETE ON core.person_consent_requests
  FOR EACH ROW
  EXECUTE FUNCTION core.audit_person_consent_requests();

CREATE OR REPLACE FUNCTION core.audit_person_consents()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'core', 'portal', 'public'
AS $$
DECLARE
  v_action text;
  v_entity_ref text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'consent_created';
    v_entity_ref := format('core.person_consents:%s', NEW.id);

    PERFORM public.portal_log_audit_event(
      v_action,
      'core.person_consents',
      NULL,
      jsonb_strip_nulls(jsonb_build_object(
        'entity_ref', v_entity_ref,
        'person_id', NEW.person_id,
        'scope', NEW.scope,
        'status', NEW.status
      ))
    );

    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'revoked' THEN
      v_action := 'consent_revoked';
    ELSE
      v_action := 'consent_updated';
    END IF;

    v_entity_ref := format('core.person_consents:%s', NEW.id);

    PERFORM public.portal_log_audit_event(
      v_action,
      'core.person_consents',
      NULL,
      jsonb_strip_nulls(jsonb_build_object(
        'entity_ref', v_entity_ref,
        'person_id', NEW.person_id,
        'scope', NEW.scope,
        'previous_scope', OLD.scope,
        'status', NEW.status
      ))
    );

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'consent_deleted';
    v_entity_ref := format('core.person_consents:%s', OLD.id);

    PERFORM public.portal_log_audit_event(
      v_action,
      'core.person_consents',
      NULL,
      jsonb_strip_nulls(jsonb_build_object(
        'entity_ref', v_entity_ref,
        'person_id', OLD.person_id,
        'scope', OLD.scope,
        'status', OLD.status
      ))
    );

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_person_consents ON core.person_consents;
CREATE TRIGGER trg_audit_person_consents
  AFTER INSERT OR UPDATE OR DELETE ON core.person_consents
  FOR EACH ROW
  EXECUTE FUNCTION core.audit_person_consents();

CREATE OR REPLACE FUNCTION core.audit_person_consent_orgs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'core', 'portal', 'public'
AS $$
DECLARE
  v_entity_ref text;
BEGIN
  v_entity_ref := format('core.person_consents:%s', COALESCE(NEW.consent_id, OLD.consent_id));

  PERFORM public.portal_log_audit_event(
    'consent_org_updated',
    'core.person_consents',
    NULL,
    jsonb_strip_nulls(jsonb_build_object(
      'entity_ref', v_entity_ref,
      'consent_id', COALESCE(NEW.consent_id, OLD.consent_id),
      'organization_id', COALESCE(NEW.organization_id, OLD.organization_id),
      'allowed', COALESCE(NEW.allowed, OLD.allowed),
      'change_type', TG_OP
    ))
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_person_consent_orgs ON core.person_consent_orgs;
CREATE TRIGGER trg_audit_person_consent_orgs
  AFTER INSERT OR UPDATE OR DELETE ON core.person_consent_orgs
  FOR EACH ROW
  EXECUTE FUNCTION core.audit_person_consent_orgs();

CREATE OR REPLACE FUNCTION core.audit_person_access_grants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'core', 'portal', 'public'
AS $$
DECLARE
  v_action text;
  v_person_id int;
BEGIN
  v_person_id := COALESCE(NEW.person_id, OLD.person_id);

  IF TG_OP = 'INSERT' THEN
    v_action := 'person_access_grant_added';
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'person_access_grant_updated';
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'person_access_grant_revoked';
  END IF;

  PERFORM public.portal_log_audit_event(
    v_action,
    'people',
    NULL,
    jsonb_strip_nulls(jsonb_build_object(
      'entity_ref', format('core.people:%s', v_person_id),
      'person_id', v_person_id,
      'scope', COALESCE(NEW.scope, OLD.scope),
      'grantee_org_id', COALESCE(NEW.grantee_org_id, OLD.grantee_org_id),
      'grantee_user_id', COALESCE(NEW.grantee_user_id, OLD.grantee_user_id),
      'expires_at', COALESCE(NEW.expires_at, OLD.expires_at),
      'change_type', TG_OP
    ))
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_person_access_grants ON core.person_access_grants;
CREATE TRIGGER trg_audit_person_access_grants
  AFTER INSERT OR UPDATE OR DELETE ON core.person_access_grants
  FOR EACH ROW
  EXECUTE FUNCTION core.audit_person_access_grants();

-- 5) Consent contact audit inside RPC
CREATE OR REPLACE FUNCTION core.log_consent_contact(p_person_id bigint, p_org_id bigint, p_summary text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'core', 'portal', 'public'
AS $$
DECLARE
  v_profile_id uuid;
  v_display_name text;
  v_summary text;
BEGIN
  IF p_person_id IS NULL OR p_org_id IS NULL THEN
    RAISE EXCEPTION 'Person and organization are required.';
  END IF;

  IF NOT portal.actor_is_approved() THEN
    RAISE EXCEPTION 'Profile approval required.';
  END IF;

  IF portal.actor_org_id() IS NULL OR portal.actor_org_id() <> p_org_id THEN
    RAISE EXCEPTION 'Contact org does not match acting org.';
  END IF;

  SELECT portal.current_profile_id() INTO v_profile_id;
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile required to log consent contact.';
  END IF;

  SELECT display_name INTO v_display_name
  FROM portal.profiles
  WHERE id = v_profile_id;

  IF v_display_name IS NULL THEN
    RAISE EXCEPTION 'Profile display name required.';
  END IF;

  v_summary := NULLIF(TRIM(p_summary), '');
  IF v_summary IS NULL THEN
    RAISE EXCEPTION 'Summary is required.';
  END IF;

  IF char_length(v_summary) > 240 THEN
    RAISE EXCEPTION 'Summary must be 240 characters or fewer.';
  END IF;

  INSERT INTO core.timeline_events (
    person_id,
    owning_org_id,
    event_category,
    event_at,
    source_type,
    visibility_scope,
    sensitivity_level,
    summary,
    metadata,
    recorded_by_profile_id,
    created_by
  ) VALUES (
    p_person_id,
    p_org_id,
    'consent',
    now(),
    'consent_contact',
    'internal_to_org',
    'standard',
    'Consent contact logged',
    jsonb_build_object(
      'summary', v_summary,
      'staff_member', v_display_name,
      'consent_contact', true
    ),
    v_profile_id,
    auth.uid()
  );

  PERFORM public.portal_log_audit_event(
    'consent_contact_logged',
    'core.timeline_events',
    NULL,
    jsonb_strip_nulls(jsonb_build_object(
      'person_id', p_person_id,
      'requesting_org_id', p_org_id,
      'summary', v_summary
    ))
  );
END;
$$;

-- 6) Client record RPCs with transactional audit
CREATE OR REPLACE FUNCTION core.person_update_identity(
  p_person_id bigint,
  p_first_name text,
  p_last_name text,
  p_date_of_birth date,
  p_age integer,
  p_gender core.gender_enum,
  p_preferred_pronouns text,
  p_changed_fields text[],
  p_change_reason text
)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'core', 'portal', 'public'
AS $$
DECLARE
  v_person_id bigint;
BEGIN
  UPDATE core.people
  SET first_name = p_first_name,
      last_name = p_last_name,
      date_of_birth = p_date_of_birth,
      age = p_age,
      gender = p_gender,
      preferred_pronouns = p_preferred_pronouns,
      updated_at = now(),
      updated_by = auth.uid()
  WHERE id = p_person_id
  RETURNING id INTO v_person_id;

  IF v_person_id IS NULL THEN
    RAISE EXCEPTION 'Person not found.';
  END IF;

  PERFORM public.portal_log_audit_event(
    'person_identity_updated',
    'core.people',
    NULL,
    jsonb_strip_nulls(jsonb_build_object(
      'entity_ref', format('core.people:%s', v_person_id),
      'person_id', v_person_id,
      'changed_fields', p_changed_fields,
      'change_reason', p_change_reason
    ))
  );
END;
$$;

CREATE OR REPLACE FUNCTION core.person_update_contact(
  p_person_id bigint,
  p_email text,
  p_phone text,
  p_preferred_contact_method text,
  p_changed_fields text[],
  p_change_reason text
)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'core', 'portal', 'public'
AS $$
DECLARE
  v_person_id bigint;
BEGIN
  UPDATE core.people
  SET email = p_email,
      phone = p_phone,
      preferred_contact_method = p_preferred_contact_method,
      updated_at = now(),
      updated_by = auth.uid()
  WHERE id = p_person_id
  RETURNING id INTO v_person_id;

  IF v_person_id IS NULL THEN
    RAISE EXCEPTION 'Person not found.';
  END IF;

  PERFORM public.portal_log_audit_event(
    'person_contact_updated',
    'core.people',
    NULL,
    jsonb_strip_nulls(jsonb_build_object(
      'entity_ref', format('core.people:%s', v_person_id),
      'person_id', v_person_id,
      'changed_fields', p_changed_fields,
      'change_reason', p_change_reason
    ))
  );
END;
$$;

CREATE OR REPLACE FUNCTION case_mgmt.client_intake_update(
  p_intake_id bigint,
  p_person_id bigint,
  p_housing_status core.housing_status_enum,
  p_risk_level core.risk_level_enum,
  p_immediate_needs core.assessment_urgency,
  p_health_concerns core.health_concern_enum[],
  p_risk_factors core.risk_factor_enum[],
  p_situation_notes text,
  p_general_notes text,
  p_changed_fields text[],
  p_change_reason text
)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'case_mgmt', 'core', 'portal', 'public'
AS $$
DECLARE
  v_intake_id bigint;
BEGIN
  UPDATE case_mgmt.client_intakes
  SET housing_status = p_housing_status,
      risk_level = p_risk_level,
      immediate_needs = p_immediate_needs,
      health_concerns = COALESCE(p_health_concerns, '{}'::core.health_concern_enum[]),
      risk_factors = COALESCE(p_risk_factors, '{}'::core.risk_factor_enum[]),
      situation_notes = p_situation_notes,
      general_notes = p_general_notes
  WHERE id = p_intake_id
    AND person_id = p_person_id
  RETURNING id INTO v_intake_id;

  IF v_intake_id IS NULL THEN
    RAISE EXCEPTION 'Intake not found.';
  END IF;

  PERFORM public.portal_log_audit_event(
    'client_intake_updated',
    'case_mgmt.client_intakes',
    NULL,
    jsonb_strip_nulls(jsonb_build_object(
      'entity_ref', format('case_mgmt.client_intakes:%s', v_intake_id),
      'person_id', p_person_id,
      'intake_id', v_intake_id,
      'changed_fields', p_changed_fields,
      'change_reason', p_change_reason
    ))
  );
END;
$$;

CREATE OR REPLACE FUNCTION core.person_alias_create(
  p_person_id bigint,
  p_alias_name text,
  p_change_reason text
)
RETURNS bigint
LANGUAGE plpgsql
SET search_path TO 'core', 'portal', 'public'
AS $$
DECLARE
  v_existing record;
  v_alias_id bigint;
BEGIN
  SELECT id, is_active
  INTO v_existing
  FROM core.people_aliases
  WHERE person_id = p_person_id
    AND alias_name ILIKE p_alias_name
  LIMIT 1;

  IF v_existing IS NOT NULL AND v_existing.is_active THEN
    RAISE EXCEPTION 'Alias already exists.';
  END IF;

  IF v_existing IS NOT NULL AND NOT v_existing.is_active THEN
    UPDATE core.people_aliases
    SET is_active = true,
        deactivated_at = NULL,
        deactivated_by = NULL,
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = v_existing.id
    RETURNING id INTO v_alias_id;

    PERFORM public.portal_log_audit_event(
      'person_alias_restored',
      'core.people_aliases',
      NULL,
      jsonb_strip_nulls(jsonb_build_object(
        'entity_ref', format('core.people_aliases:%s', v_alias_id),
        'person_id', p_person_id,
        'alias_id', v_alias_id,
        'alias_name', p_alias_name,
        'change_reason', p_change_reason
      ))
    );

    RETURN v_alias_id;
  END IF;

  INSERT INTO core.people_aliases (
    person_id,
    alias_name,
    created_by,
    updated_by,
    updated_at
  ) VALUES (
    p_person_id,
    p_alias_name,
    auth.uid(),
    auth.uid(),
    now()
  )
  RETURNING id INTO v_alias_id;

  PERFORM public.portal_log_audit_event(
    'person_alias_created',
    'core.people_aliases',
    NULL,
    jsonb_strip_nulls(jsonb_build_object(
      'entity_ref', format('core.people_aliases:%s', v_alias_id),
      'person_id', p_person_id,
      'alias_id', v_alias_id,
      'alias_name', p_alias_name,
      'change_reason', p_change_reason
    ))
  );

  RETURN v_alias_id;
END;
$$;

CREATE OR REPLACE FUNCTION core.person_alias_update(
  p_alias_id bigint,
  p_person_id bigint,
  p_alias_name text,
  p_change_reason text
)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'core', 'portal', 'public'
AS $$
DECLARE
  v_existing record;
  v_duplicate record;
BEGIN
  SELECT id, alias_name
  INTO v_existing
  FROM core.people_aliases
  WHERE id = p_alias_id
    AND person_id = p_person_id;

  IF v_existing IS NULL THEN
    RAISE EXCEPTION 'Alias not found.';
  END IF;

  IF v_existing.alias_name = p_alias_name THEN
    RETURN;
  END IF;

  SELECT id, is_active
  INTO v_duplicate
  FROM core.people_aliases
  WHERE person_id = p_person_id
    AND alias_name ILIKE p_alias_name
    AND id <> p_alias_id
  LIMIT 1;

  IF v_duplicate IS NOT NULL AND v_duplicate.is_active THEN
    RAISE EXCEPTION 'Alias already exists.';
  END IF;

  UPDATE core.people_aliases
  SET alias_name = p_alias_name,
      updated_at = now(),
      updated_by = auth.uid()
  WHERE id = p_alias_id;

  PERFORM public.portal_log_audit_event(
    'person_alias_updated',
    'core.people_aliases',
    NULL,
    jsonb_strip_nulls(jsonb_build_object(
      'entity_ref', format('core.people_aliases:%s', p_alias_id),
      'person_id', p_person_id,
      'alias_id', p_alias_id,
      'alias_name', p_alias_name,
      'change_reason', p_change_reason
    ))
  );
END;
$$;

CREATE OR REPLACE FUNCTION core.person_alias_set_active(
  p_alias_id bigint,
  p_person_id bigint,
  p_is_active boolean,
  p_change_reason text
)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'core', 'portal', 'public'
AS $$
DECLARE
  v_existing record;
  v_action text;
BEGIN
  SELECT id, alias_name, is_active
  INTO v_existing
  FROM core.people_aliases
  WHERE id = p_alias_id
    AND person_id = p_person_id;

  IF v_existing IS NULL THEN
    RAISE EXCEPTION 'Alias not found.';
  END IF;

  IF v_existing.is_active = p_is_active THEN
    RETURN;
  END IF;

  UPDATE core.people_aliases
  SET is_active = p_is_active,
      deactivated_at = CASE WHEN p_is_active THEN NULL ELSE now() END,
      deactivated_by = CASE WHEN p_is_active THEN NULL ELSE auth.uid() END,
      updated_at = now(),
      updated_by = auth.uid()
  WHERE id = p_alias_id;

  v_action := CASE WHEN p_is_active THEN 'person_alias_restored' ELSE 'person_alias_deactivated' END;

  PERFORM public.portal_log_audit_event(
    v_action,
    'core.people_aliases',
    NULL,
    jsonb_strip_nulls(jsonb_build_object(
      'entity_ref', format('core.people_aliases:%s', p_alias_id),
      'person_id', p_person_id,
      'alias_id', p_alias_id,
      'alias_name', v_existing.alias_name,
      'change_reason', p_change_reason
    ))
  );
END;
$$;
