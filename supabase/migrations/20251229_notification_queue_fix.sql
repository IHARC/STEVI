-- Fix portal_queue_notification to resolve recipient email from profile when missing

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
  v_recipient_email text := p_recipient_email;
  v_recipient_phone text := p_recipient_phone;
BEGIN
  IF v_recipient_email IS NULL AND p_profile_id IS NOT NULL THEN
    v_recipient_email := portal.portal_get_user_email(p_profile_id);
  END IF;

  IF v_recipient_email IS NULL AND v_recipient_phone IS NULL THEN
    RAISE EXCEPTION 'Recipient email or phone is required';
  END IF;

  IF v_channels IS NULL OR array_length(v_channels, 1) IS NULL THEN
    v_channels := ARRAY[]::text[];
    IF v_recipient_email IS NOT NULL THEN
      v_channels := v_channels || 'email';
    END IF;
    IF v_recipient_phone IS NOT NULL THEN
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
    v_recipient_email,
    v_recipient_phone,
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
