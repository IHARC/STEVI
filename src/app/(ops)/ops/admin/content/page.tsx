import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { PageHeader } from '@shared/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import type { NotificationRecord } from '@workspace/admin/notifications/types';
import { NotificationsChart } from '../notifications-chart';
import { RecentNotifications } from '@workspace/admin/notifications/recent-notifications';
import { AdminTabs } from '../admin-tabs';

export const dynamic = 'force-dynamic';

export default async function AdminContentPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessOpsSteviAdmin) {
    redirect(resolveLandingPath(access));
  }

  const portal = supabase.schema('portal');
  const { data: notificationRows, error } = await portal
    .from('notifications')
    .select(
      'id, subject, body_text, body_html, notification_type, status, created_at, sent_at, recipient_email, profile_id, profile:profiles(display_name)',
    )
    .order('created_at', { ascending: false })
    .limit(60);

  if (error) throw error;

  const notifications: NotificationRecord[] = (notificationRows ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id ?? ''),
    profileId: (row.profile_id as string | null) ?? null,
    profileName: ((row.profile as { display_name?: string } | null)?.display_name as string | null) ?? null,
    recipientEmail: (row.recipient_email as string | null) ?? 'Unknown',
    subject: (row.subject as string | null) ?? 'Notification',
    bodyText: (row.body_text as string | null) ?? '',
    bodyHtml: (row.body_html as string | null) ?? null,
    notificationType: (row.notification_type as string | null) ?? 'general',
    status: (row.status as string | null) ?? 'pending',
    createdAt: (row.created_at as string | null) ?? '',
    sentAt: (row.sent_at as string | null) ?? null,
  }));

  const trendData = buildNotificationTrend(notifications);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-6">
      <PageHeader
        eyebrow="STEVI Admin"
        title="Content & Notifications"
        description="Monitor outbound communications and manage public-facing content."
        primaryAction={{ label: 'Back to overview', href: '/ops/admin' }}
      />

      <AdminTabs />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card className="border-border/60">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Notifications trend</CardTitle>
            <CardDescription>Recent volume by delivery state.</CardDescription>
          </CardHeader>
          <CardContent>
            <NotificationsChart data={trendData} />
          </CardContent>
        </Card>

        <RecentNotifications notifications={notifications.slice(0, 20)} />
      </div>
    </div>
  );
}

function buildNotificationTrend(notifications: NotificationRecord[]) {
  const buckets = [
    { name: 'Sent', key: 'sent' },
    { name: 'Queued', key: 'queued' },
    { name: 'Failed', key: 'failed' },
    { name: 'Draft', key: 'draft' },
  ];

  return buckets.map(({ name, key }) => ({
    name,
    value: notifications.filter((n) => n.status === key).length,
  }));
}
