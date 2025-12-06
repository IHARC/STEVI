import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { NotificationsChart } from '../notifications-chart';
import { PageHeader } from '@/components/layout/page-header';
import { StatTile } from '@/components/ui/stat-tile';
import { AttentionQueue } from './attention-queue';

export const dynamic = 'force-dynamic';

type MetricCard = { id: string; label: string; value: string; tone?: 'default' | 'warning' | 'info' };

type OpsSnapshot = {
  pendingProfiles: number;
  pendingInvites: number;
  notifications7d: number;
  openCases: number;
  resourcesPublished: number;
  policiesPublished: number;
};

function formatCount(value: number): string {
  return value.toLocaleString('en-CA');
}

export default async function AdminOperationsPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/login?next=/admin/operations');
  }

  if (!access.canAccessAdminWorkspace) {
    redirect(resolveLandingPath(access));
  }

  await ensurePortalProfile(supabase, access.userId);

  const portal = supabase.schema('portal');
  const caseMgmt = supabase.schema('case_mgmt');

  const [
    pendingProfilesCount,
    pendingInvitesCount,
    notificationsCount,
    openCasesCount,
    resourcesCount,
    policiesCount,
    notificationsTrend,
  ] = await Promise.all([
    portal.from('profiles').select('id', { count: 'exact', head: true }).eq('affiliation_status', 'pending'),
    portal.from('profile_invites').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    portal
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgoIso()),
    caseMgmt.from('case_management').select('id', { count: 'exact', head: true }).not('status', 'eq', 'closed'),
    portal.from('resource_pages').select('id', { count: 'exact', head: true }).eq('is_published', true),
    portal.from('policies').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    portal
      .from('notifications')
      .select('id, created_at')
      .gte('created_at', sevenDaysAgoIso())
      .order('created_at'),
  ]);

  const snapshot: OpsSnapshot = {
    pendingProfiles: pendingProfilesCount.count ?? 0,
    pendingInvites: pendingInvitesCount.count ?? 0,
    notifications7d: notificationsCount.count ?? 0,
    openCases: openCasesCount.count ?? 0,
    resourcesPublished: resourcesCount.count ?? 0,
    policiesPublished: policiesCount.count ?? 0,
  };

  const coreMetrics: MetricCard[] = [
    {
      id: 'pending-profiles',
      label: 'Pending approvals',
      value: formatCount(snapshot.pendingProfiles),
      tone: snapshot.pendingProfiles > 0 ? 'warning' : 'default',
    },
    { id: 'pending-invites', label: 'Open invites', value: formatCount(snapshot.pendingInvites) },
    { id: 'open-cases', label: 'Open cases', value: formatCount(snapshot.openCases) },
    { id: 'notifications', label: 'Notifications (7d)', value: formatCount(snapshot.notifications7d) },
  ];

  const contentMetrics: MetricCard[] = [
    { id: 'resources', label: 'Published resources', value: formatCount(snapshot.resourcesPublished) },
    { id: 'policies', label: 'Published policies', value: formatCount(snapshot.policiesPublished) },
  ];

  type NotificationTrendRow = { created_at: string };
  type NotificationTrendEntry = { day: string; count: number };
  const notificationTrendData: NotificationTrendEntry[] = (notificationsTrend.data ?? []).map((row: NotificationTrendRow) => ({
    day: new Date(row.created_at).toLocaleDateString('en-CA', { weekday: 'short' }),
    count: 1,
  }));

  const dayKeys: string[] = Array.from(new Set(notificationTrendData.map((d: NotificationTrendEntry) => d.day)));
  const trendSeries = dayKeys.map((day) => ({
    name: day,
    value: notificationTrendData.filter((d: NotificationTrendEntry) => d.day === day).length,
  }));

  return (
    <div className="mx-auto w-full max-w-6xl flex flex-col gap-6 px-4 py-8 md:px-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Admin', href: '/admin/operations' },
          { label: 'Operations overview' },
        ]}
        eyebrow="Admin"
        title="Operations overview"
        description="Monitor approvals, notifications, and content at a glance. All counts respect Supabase RLS and audit logging."
        meta={[{ label: 'RLS enforced', tone: 'info' }, { label: 'Live metrics', tone: 'success' }]}
        helperLink={{ href: '/admin/help', label: 'View admin help' }}
        primaryAction={{ label: 'Send notification', href: '/admin/notifications' }}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">Operational KPIs</h2>
          <Badge variant="outline" className="hidden sm:inline-flex">Live</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {coreMetrics.map((card) => (
            <StatTile key={card.id} label={card.label} value={card.value} tone={card.tone} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.8fr,1.2fr]">
        <Card className="h-full">
          <CardHeader className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">Notifications (7 days)</CardTitle>
              <CardDescription>Sent and queued notifications grouped by day.</CardDescription>
            </div>
            <Badge variant="outline">{formatCount(snapshot.notifications7d)} total</Badge>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              {trendSeries.length === 0 ? (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>No notifications sent in the last week.</p>
                  <Button asChild variant="secondary" size="sm">
                    <Link href="/admin/notifications">Send a notification</Link>
                  </Button>
                </div>
              ) : (
                <NotificationsChart data={trendSeries} />
              )}
            </Suspense>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-xl">Queues</CardTitle>
            <CardDescription>Work the highest-risk items first.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <AttentionQueue
              items={[
                {
                  id: 'pending-profiles',
                  label: 'Pending profile approvals',
                  count: snapshot.pendingProfiles,
                  href: '/admin/profiles',
                  tone: snapshot.pendingProfiles > 0 ? 'warning' : 'default',
                  description: 'Profiles awaiting approval.',
                },
                {
                  id: 'pending-invites',
                  label: 'Pending org invites',
                  count: snapshot.pendingInvites,
                  href: '/admin/profiles',
                  description: 'Invites that need action.',
                },
                {
                  id: 'open-cases',
                  label: 'Open cases',
                  count: snapshot.openCases,
                  href: '/admin/appointments',
                  description: 'Cases not yet closed.',
                },
                {
                  id: 'content-review',
                  label: 'Content to review',
                  count: snapshot.resourcesPublished + snapshot.policiesPublished,
                  href: '/admin/resources',
                  description: 'Published resources and policies.',
                },
              ]}
            />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Content</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:max-w-3xl">
          {contentMetrics.map((card) => (
            <StatTile key={card.id} label={card.label} value={card.value} tone="info" />
          ))}
        </div>
      </section>
    </div>
  );
}

function sevenDaysAgoIso() {
  const now = new Date();
  now.setDate(now.getDate() - 7);
  return now.toISOString();
}
