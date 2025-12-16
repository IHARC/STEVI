import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { PageHeader } from '@shared/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { AttentionQueue, type AttentionQueueItem } from './attention-queue';
import type { NotificationRecord } from '@workspace/admin/notifications/types';

export const dynamic = 'force-dynamic';

export default async function AdminOperationsPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessOpsSteviAdmin) {
    redirect(resolveLandingPath(access));
  }

  const portal = supabase.schema('portal');

  const [{ data: notificationRows, error: notificationsError }, pendingProfiles, pendingInvites] = await Promise.all([
    portal.from('notifications').select('id, status').order('created_at', { ascending: false }).limit(40),
    portal.from('profiles').select('id', { count: 'exact', head: true }).eq('affiliation_status', 'pending'),
    portal.from('profile_invites').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  if (notificationsError) throw notificationsError;
  if (pendingProfiles.error) throw pendingProfiles.error;
  if (pendingInvites.error) throw pendingInvites.error;

  const notifications: NotificationRecord[] = (notificationRows ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id ?? ''),
    profileId: null,
    profileName: null,
    recipientEmail: 'Unknown',
    subject: 'Notification',
    bodyText: '',
    bodyHtml: null,
    notificationType: 'general',
    status: (row.status as string | null) ?? 'pending',
    createdAt: '',
    sentAt: null,
  }));

  const pendingProfileCount = pendingProfiles.count ?? 0;
  const pendingInviteCount = pendingInvites.count ?? 0;
  const queuedNotificationCount = notifications.filter((n) => n.status !== 'sent').length;

  const attentionItems: AttentionQueueItem[] = [
    {
      id: 'pending-profiles',
      label: 'Pending profiles',
      count: pendingProfileCount,
      description: 'Awaiting approval across tenants',
      href: '/ops/admin/approvals',
      tone: 'warning',
    },
    {
      id: 'pending-invites',
      label: 'Pending invites',
      count: pendingInviteCount,
      description: 'Org access requests across tenants',
      href: '/ops/organizations',
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
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="STEVI Admin"
        title="Operations"
        description="Approvals, invites, and system queues that need admin attention."
        breadcrumbs={[{ label: 'STEVI Admin', href: '/ops/admin' }, { label: 'Operations' }]}
      />

      <Card className="border-border/60">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">Attention queue</CardTitle>
          <CardDescription>Start with what needs review.</CardDescription>
        </CardHeader>
        <CardContent>
          <AttentionQueue items={attentionItems} />
        </CardContent>
      </Card>
    </div>
  );
}
