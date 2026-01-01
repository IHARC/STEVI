import { queuePortalNotification } from '@/lib/notifications';
import type { SupabaseServerClient } from '@/lib/supabase/types';
import { type NotifySummary } from './shared';

async function fetchNotifySummary(supabase: SupabaseServerClient, cfsId: number): Promise<NotifySummary | null> {
  const { data, error } = await supabase
    .schema('case_mgmt')
    .from('calls_for_service')
    .select('notify_opt_in, notify_channel, notify_target, report_number, public_tracking_id')
    .eq('id', cfsId)
    .maybeSingle();

  if (error || !data) return null;
  return data as NotifySummary;
}

export async function maybeNotifyReporter(
  supabase: SupabaseServerClient,
  cfsId: number,
  message: { subject: string; bodyText: string; bodySms?: string; type: string },
) {
  const summary = await fetchNotifySummary(supabase, cfsId);
  if (!summary || !summary.notify_opt_in || !summary.notify_channel || summary.notify_channel === 'none' || !summary.notify_target) {
    return;
  }

  const channel = summary.notify_channel === 'sms' ? 'sms' : 'email';
  const bodyText = channel === 'sms' ? message.bodySms ?? message.bodyText : message.bodyText;

  try {
    await queuePortalNotification(supabase, {
      email: channel === 'email' ? summary.notify_target : null,
      phone: channel === 'sms' ? summary.notify_target : null,
      channels: [channel],
      subject: message.subject,
      bodyText,
      type: message.type,
      payload: {
        report_number: summary.report_number,
        public_tracking_id: summary.public_tracking_id,
      },
    });
  } catch (error) {
    console.warn('Unable to send CFS notification.', { cfsId, error });
  }
}
