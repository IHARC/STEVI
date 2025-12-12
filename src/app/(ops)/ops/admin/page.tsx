import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { PageHeader } from '@shared/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { NotificationsChart } from './notifications-chart';
import { AttentionQueue, type AttentionQueueItem } from './operations/attention-queue';
import type { NotificationRecord } from '@workspace/admin/notifications/types';
import Link from 'next/link';
import { Button } from '@shared/ui/button';
import { AdminTabs } from './admin-tabs';

export const dynamic = 'force-dynamic';

export default async function OpsAdminPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/login?next=/ops/admin');
  }

  if (!access.canAccessOpsSteviAdmin) {
    redirect(resolveLandingPath(access));
  }

  const portal = supabase.schema('portal');

  const [{ data: notificationRows, error: notificationsError }, pendingProfiles, pendingInvites] = await Promise.all([
    portal
      .from('notifications')
      .select(
        'id, subject, body_text, body_html, notification_type, status, created_at, sent_at, recipient_email, profile_id, profile:profiles(display_name)',
      )
      .order('created_at', { ascending: false })
      .limit(20),
    portal.from('profiles').select('id', { count: 'exact', head: true }).eq('affiliation_status', 'pending'),
    portal.from('profile_invites').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  if (notificationsError) throw notificationsError;
  if (pendingProfiles.error) throw pendingProfiles.error;
  if (pendingInvites.error) throw pendingInvites.error;

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
  const pendingProfileCount = pendingProfiles.count ?? 0;
  const pendingInviteCount = pendingInvites.count ?? 0;
  const queuedNotificationCount = notifications.filter((n) => n.status !== 'sent').length;

  const attentionItems: AttentionQueueItem[] = [
    {
      id: 'pending-profiles',
      label: 'Pending profiles',
      count: pendingProfileCount,
      description: 'Awaiting approval across tenants',
      href: '/ops/admin/operations',
      tone: 'warning',
    },
    {
      id: 'pending-invites',
      label: 'Pending invites',
      count: pendingInviteCount,
      description: 'Org access requests across tenants',
      href: '/ops/org/invites',
      tone: 'warning',
    },
    {
      id: 'queued-notifications',
      label: 'Queued notifications',
      count: queuedNotificationCount,
      description: 'Queued or failed deliveries',
      href: '/ops/admin/content',
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-6">
      <PageHeader
        eyebrow="STEVI Admin"
        title="General settings"
        description="System-wide configuration and status for STEVI."
        meta={[{ label: 'IHARC only', tone: 'warning' }, { label: 'No client data', tone: 'neutral' }]}
      />

      <AdminTabs />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card className="border-border/60">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Notifications</CardTitle>
            <CardDescription>Monitor outbound delivery volume and state.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <NotificationsChart data={trendData} />
            <Button asChild variant="outline" size="sm">
              <Link href="/ops/admin/content">Open content & notifications</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Attention queue</CardTitle>
            <CardDescription>Review approvals, invites, and queued messages.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <AttentionQueue items={attentionItems} />
            <Button asChild variant="outline" size="sm">
              <Link href="/ops/admin/operations">Open operations</Link>
            </Button>
          </CardContent>
        </Card>
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
