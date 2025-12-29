import type { Json } from '@/types/supabase';
import type { SupabaseServerClient } from '@/lib/supabase/types';

export type NotificationChannel = 'email' | 'sms';

export type QueueNotificationArgs = {
  profileId?: string | null;
  email?: string | null;
  phone?: string | null;
  channels?: NotificationChannel[];
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  type: string;
  payload?: Record<string, unknown>;
};

export async function queuePortalNotification(supabase: SupabaseServerClient, args: QueueNotificationArgs) {
  const { profileId = null, email = null, phone = null, channels, subject, bodyText, bodyHtml, type, payload } = args;

  const normalizedEmail = email ? email.trim().toLowerCase() : null;
  const normalizedPhone = phone ? phone.trim() : null;

  const resolvedChannels =
    channels && channels.length
      ? channels
      : ([
          normalizedEmail || profileId ? 'email' : null,
          normalizedPhone ? 'sms' : null,
        ].filter(Boolean) as NotificationChannel[]);

  if (!normalizedEmail && !normalizedPhone && !profileId) {
    throw new Error('Recipient email or phone is required.');
  }

  const payloadJson = (payload ?? {}) as Json;

  const { data, error } = await supabase.rpc('portal_queue_notification', {
    p_subject: subject,
    p_body_text: bodyText,
    p_profile_id: profileId,
    p_body_html: bodyHtml ?? null,
    p_type: type,
    p_payload: payloadJson,
    p_recipient_email: normalizedEmail,
    p_recipient_phone: normalizedPhone,
    p_channels: resolvedChannels,
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
