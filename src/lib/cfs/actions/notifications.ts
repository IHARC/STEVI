import { buildEntityRef, logAuditEvent } from '@/lib/audit';
import { queuePortalNotification } from '@/lib/notifications';
import type { SupabaseServerClient } from '@/lib/supabase/types';
import { type NotifySummary } from './shared';

type NotifyOptions = {
  actorProfileId?: string | null;
};

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

function formatAuditError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
}

async function recordNotificationAudit(
  supabase: SupabaseServerClient,
  cfsId: number,
  audit: Parameters<typeof logAuditEvent>[1],
) {
  try {
    await logAuditEvent(supabase, audit);
  } catch (auditError) {
    console.warn('Unable to log CFS notification audit.', { cfsId, auditError });
  }
}

export async function maybeNotifyReporter(
  supabase: SupabaseServerClient,
  cfsId: number,
  message: { subject: string; bodyText: string; bodySms?: string; type: string },
  options: NotifyOptions = {},
) {
  const summary = await fetchNotifySummary(supabase, cfsId);
  if (!summary || !summary.notify_opt_in || !summary.notify_channel || summary.notify_channel === 'none' || !summary.notify_target) {
    return;
  }

  const channel = summary.notify_channel === 'sms' ? 'sms' : 'email';
  const bodyText = channel === 'sms' ? message.bodySms ?? message.bodyText : message.bodyText;
  const actorProfileId = options.actorProfileId ?? null;
  const baseMeta = {
    cfs_id: cfsId,
    notification_type: message.type,
    channel,
    report_number: summary.report_number,
    public_tracking_id: summary.public_tracking_id,
  };

  try {
    const notificationId = await queuePortalNotification(supabase, {
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

    await recordNotificationAudit(supabase, cfsId, {
      actorProfileId,
      action: 'cfs_notification_queued',
      entityType: 'portal.notifications',
      entityRef: buildEntityRef({ schema: 'portal', table: 'notifications', id: notificationId }),
      meta: {
        ...baseMeta,
        notification_id: notificationId ?? null,
      },
    });
  } catch (error) {
    const errorMessage = formatAuditError(error).slice(0, 500);
    await recordNotificationAudit(supabase, cfsId, {
      actorProfileId,
      action: 'cfs_notification_failed',
      entityType: 'portal.notifications',
      entityRef: null,
      meta: {
        ...baseMeta,
        error_message: errorMessage,
      },
    });
    console.warn('Unable to send CFS notification.', { cfsId, error });
  }
}
