-- CFS follow-up enhancements: SMS notifications, attachments storage policies, SLA view

-- 1) Notifications: allow SMS recipients
ALTER TABLE portal.notifications
  ALTER COLUMN recipient_email DROP NOT NULL;

ALTER TABLE portal.notifications
  ADD COLUMN IF NOT EXISTS recipient_phone text NULL;

ALTER TABLE portal.notifications
  ALTER COLUMN channels SET DEFAULT ARRAY[]::text[];

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notifications_recipient_check'
      AND conrelid = 'portal.notifications'::regclass
  ) THEN
    ALTER TABLE portal.notifications
      ADD CONSTRAINT notifications_recipient_check
      CHECK (recipient_email IS NOT NULL OR recipient_phone IS NOT NULL);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION portal.portal_queue_notification(
  p_body_html text DEFAULT NULL,
  p_body_text text DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_profile_id uuid DEFAULT NULL,
  p_recipient_email text DEFAULT NULL,
  p_recipient_phone text DEFAULT NULL,
  p_subject text DEFAULT NULL,
  p_type text DEFAULT NULL,
  p_channels text[] DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'portal', 'public'
SET row_security = off
AS $$
DECLARE
  v_subject text := COALESCE(p_subject, 'Notification');
  v_body_text text := COALESCE(p_body_text, '');
  v_type text := COALESCE(p_type, 'general');
  v_channels text[] := p_channels;
  v_notification_id uuid;
BEGIN
  IF p_recipient_email IS NULL AND p_recipient_phone IS NULL THEN
    RAISE EXCEPTION 'Recipient email or phone is required';
  END IF;

  IF v_channels IS NULL OR array_length(v_channels, 1) IS NULL THEN
    v_channels := ARRAY[]::text[];
    IF p_recipient_email IS NOT NULL THEN
      v_channels := v_channels || 'email';
    END IF;
    IF p_recipient_phone IS NOT NULL THEN
      v_channels := v_channels || 'sms';
    END IF;
  END IF;

  INSERT INTO portal.notifications (
    profile_id,
    recipient_email,
    recipient_phone,
    subject,
    body_text,
    body_html,
    notification_type,
    payload,
    channels,
    status,
    created_at
  ) VALUES (
    p_profile_id,
    p_recipient_email,
    p_recipient_phone,
    v_subject,
    v_body_text,
    p_body_html,
    v_type,
    COALESCE(p_payload, '{}'::jsonb),
    v_channels,
    'queued',
    now()
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- 2) Storage: CFS attachment bucket + policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('cfs-attachments', 'cfs-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "cfs_attachments_insert" ON storage.objects;
CREATE POLICY "cfs_attachments_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'cfs-attachments'
    AND owner = auth.uid()
    AND POSITION('..' IN name) = 0
    AND split_part(name, '/', 1) = 'cfs'
    AND case_mgmt.cfs_actor_has_permission(
      CASE
        WHEN split_part(name, '/', 2) ~ '^[0-9]+$' THEN split_part(name, '/', 2)::bigint
        ELSE NULL
      END,
      'cfs.update',
      'collaborate'
    )
  );

DROP POLICY IF EXISTS "cfs_attachments_select" ON storage.objects;
CREATE POLICY "cfs_attachments_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'cfs-attachments'
    AND case_mgmt.cfs_actor_has_permission(
      CASE
        WHEN split_part(name, '/', 2) ~ '^[0-9]+$' THEN split_part(name, '/', 2)::bigint
        ELSE NULL
      END,
      'cfs.read',
      'view'
    )
  );

DROP POLICY IF EXISTS "cfs_attachments_update" ON storage.objects;
CREATE POLICY "cfs_attachments_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'cfs-attachments'
    AND owner = auth.uid()
    AND case_mgmt.cfs_actor_has_permission(
      CASE
        WHEN split_part(name, '/', 2) ~ '^[0-9]+$' THEN split_part(name, '/', 2)::bigint
        ELSE NULL
      END,
      'cfs.update',
      'collaborate'
    )
  )
  WITH CHECK (
    bucket_id = 'cfs-attachments'
    AND owner = auth.uid()
    AND POSITION('..' IN name) = 0
    AND split_part(name, '/', 1) = 'cfs'
  );

DROP POLICY IF EXISTS "cfs_attachments_delete" ON storage.objects;
CREATE POLICY "cfs_attachments_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'cfs-attachments'
    AND owner = auth.uid()
    AND case_mgmt.cfs_actor_has_permission(
      CASE
        WHEN split_part(name, '/', 2) ~ '^[0-9]+$' THEN split_part(name, '/', 2)::bigint
        ELSE NULL
      END,
      'cfs.delete',
      'dispatch'
    )
  );

-- 3) SLA view for reporting
CREATE OR REPLACE VIEW case_mgmt.cfs_sla_view AS
SELECT
  c.id AS cfs_id,
  c.report_number,
  c.owning_organization_id,
  c.report_received_at,
  c.created_at,
  c.status,
  c.report_status,
  c.report_priority_assessment,
  COALESCE(c.report_received_at, c.created_at) AS received_base_at,
  t.triage_at,
  COALESCE(t.dispatch_at, i.dispatch_at) AS dispatch_at,
  t.resolution_at,
  CASE
    WHEN t.triage_at IS NULL OR COALESCE(c.report_received_at, c.created_at) IS NULL THEN NULL
    ELSE EXTRACT(EPOCH FROM (t.triage_at - COALESCE(c.report_received_at, c.created_at))) / 60.0
  END AS triage_minutes,
  CASE
    WHEN COALESCE(t.dispatch_at, i.dispatch_at) IS NULL OR COALESCE(c.report_received_at, c.created_at) IS NULL THEN NULL
    ELSE EXTRACT(EPOCH FROM (COALESCE(t.dispatch_at, i.dispatch_at) - COALESCE(c.report_received_at, c.created_at))) / 60.0
  END AS dispatch_minutes,
  CASE
    WHEN t.resolution_at IS NULL OR COALESCE(c.report_received_at, c.created_at) IS NULL THEN NULL
    ELSE EXTRACT(EPOCH FROM (t.resolution_at - COALESCE(c.report_received_at, c.created_at))) / 60.0
  END AS resolution_minutes,
  CASE c.report_priority_assessment
    WHEN 'immediate' THEN 15
    WHEN 'urgent' THEN 60
    WHEN 'routine' THEN 240
    ELSE 1440
  END AS triage_target_minutes,
  CASE c.report_priority_assessment
    WHEN 'immediate' THEN 30
    WHEN 'urgent' THEN 240
    WHEN 'routine' THEN 1440
    ELSE NULL
  END AS dispatch_target_minutes,
  CASE c.report_priority_assessment
    WHEN 'immediate' THEN 480
    WHEN 'urgent' THEN 1440
    WHEN 'routine' THEN 4320
    ELSE 7200
  END AS resolution_target_minutes,
  CASE
    WHEN t.triage_at IS NULL THEN NULL
    ELSE (EXTRACT(EPOCH FROM (t.triage_at - COALESCE(c.report_received_at, c.created_at))) / 60.0)
      <= (CASE c.report_priority_assessment
            WHEN 'immediate' THEN 15
            WHEN 'urgent' THEN 60
            WHEN 'routine' THEN 240
            ELSE 1440
          END)
  END AS triage_met,
  CASE
    WHEN COALESCE(t.dispatch_at, i.dispatch_at) IS NULL THEN NULL
    WHEN (CASE c.report_priority_assessment WHEN 'immediate' THEN 30 WHEN 'urgent' THEN 240 WHEN 'routine' THEN 1440 ELSE NULL END) IS NULL THEN NULL
    ELSE (EXTRACT(EPOCH FROM (COALESCE(t.dispatch_at, i.dispatch_at) - COALESCE(c.report_received_at, c.created_at))) / 60.0)
      <= (CASE c.report_priority_assessment WHEN 'immediate' THEN 30 WHEN 'urgent' THEN 240 WHEN 'routine' THEN 1440 ELSE NULL END)
  END AS dispatch_met,
  CASE
    WHEN t.resolution_at IS NULL THEN NULL
    ELSE (EXTRACT(EPOCH FROM (t.resolution_at - COALESCE(c.report_received_at, c.created_at))) / 60.0)
      <= (CASE c.report_priority_assessment WHEN 'immediate' THEN 480 WHEN 'urgent' THEN 1440 WHEN 'routine' THEN 4320 ELSE 7200 END)
  END AS resolution_met
FROM case_mgmt.calls_for_service c
LEFT JOIN LATERAL (
  SELECT
    MIN(CASE WHEN phase = 'assessment' THEN phase_started_at END) AS triage_at,
    MIN(CASE WHEN phase = 'dispatch' THEN phase_started_at END) AS dispatch_at,
    MIN(CASE WHEN phase = 'resolution' THEN phase_started_at END) AS resolution_at
  FROM case_mgmt.cfs_timeline t
  WHERE t.incident_report_id = c.id
) t ON true
LEFT JOIN case_mgmt.incidents i ON i.incident_report_id = c.id;

