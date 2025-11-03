import type { Json } from '@/types/supabase';
import type { SupabaseServerClient } from '@/lib/supabase/types';

export type QueueNotificationArgs = {
  profileId?: string | null;
  email?: string | null;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  ideaId?: string;
  type: string;
  payload?: Record<string, unknown>;
};

export async function queuePortalNotification(supabase: SupabaseServerClient, args: QueueNotificationArgs) {
  const { profileId = null, email = null, subject, bodyText, bodyHtml, ideaId, type, payload } = args;

  const payloadJson = (payload ?? {}) as Json;

  const { data, error } = await supabase.rpc('portal_queue_notification', {
    p_subject: subject,
    p_body_text: bodyText,
    p_profile_id: profileId,
    p_body_html: bodyHtml ?? null,
    p_idea_id: ideaId ?? null,
    p_type: type,
    p_payload: payloadJson,
    p_recipient_email: email,
  });

  if (error) {
    throw error;
  }

  const notificationId = data;

  const alertsSecret = process.env.PORTAL_ALERTS_SECRET;

  if (alertsSecret && notificationId) {
    try {
      await supabase.functions.invoke('portal-alerts', {
        body: { notificationId },
        headers: { Authorization: `Bearer ${alertsSecret}` },
      });
    } catch (invokeError) {
      console.error('Failed to invoke portal-alerts edge function', invokeError);
    }
  }

  return notificationId;
}
