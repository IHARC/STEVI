import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';
import { NotificationsChart } from './notifications-chart';

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

export default async function AdminPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/login?next=/admin');
  }

  if (!access.canAccessAdminWorkspace) {
    redirect(resolveDefaultWorkspacePath(access));
  }

  await ensurePortalProfile(supabase, access.userId);

  const portal = supabase.schema('portal');
  const caseMgmt = supabase.schema('case_mgmt');

  const [pendingProfilesCount, pendingInvitesCount, notificationsCount, openCasesCount, resourcesCount, policiesCount, notificationsTrend] =
    await Promise.all([
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

  const metricCards: MetricCard[] = [
    { id: 'pending-profiles', label: 'Pending approvals', value: formatCount(snapshot.pendingProfiles), tone: snapshot.pendingProfiles > 0 ? 'warning' : 'default' },
    { id: 'pending-invites', label: 'Open invites', value: formatCount(snapshot.pendingInvites) },
    { id: 'open-cases', label: 'Open cases', value: formatCount(snapshot.openCases) },
    { id: 'notifications', label: 'Notifications (7d)', value: formatCount(snapshot.notifications7d) },
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
    <div className="page-shell page-stack">
      <header className="flex flex-wrap items-start justify-between gap-space-md">
        <div className="space-y-space-2xs">
          <p className="text-label-sm font-semibold uppercase text-muted-foreground">Admin workspace</p>
          <h1 className="text-headline-md text-on-surface sm:text-display-sm">Operations overview</h1>
          <p className="max-w-3xl text-body-lg text-muted-foreground">
            Monitor approvals, notifications, and content at a glance. All counts respect Supabase RLS and audit logging.
          </p>
        </div>
        <div className="flex flex-wrap gap-space-xs">
          <Button asChild>
            <Link href="/admin/profiles">Review approvals</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/admin/notifications">Send notification</Link>
          </Button>
        </div>
      </header>

      <section className="grid gap-space-sm sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {metricCards.map((card) => (
          <StatTile key={card.id} label={card.label} value={card.value} tone={card.tone} />
        ))}
      </section>

      <section className="grid gap-space-md lg:grid-cols-[1.8fr,1.2fr]">
        <Card className="h-full">
          <CardHeader className="flex items-start justify-between gap-space-sm">
            <div>
              <CardTitle className="text-title-lg">Notifications (7 days)</CardTitle>
              <CardDescription>Sent and queued notifications grouped by day.</CardDescription>
            </div>
            <Badge variant="outline">{formatCount(snapshot.notifications7d)} total</Badge>
          </CardHeader>
          <CardContent>
            {trendSeries.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">No notifications sent in the last week.</p>
            ) : (
              <NotificationsChart data={trendSeries} />
            )}
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-title-lg">Attention queue</CardTitle>
            <CardDescription>Work the highest-risk items first.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-space-sm">
            <AttentionItem
              label="Pending profile approvals"
              count={snapshot.pendingProfiles}
              href="/admin/profiles"
              tone={snapshot.pendingProfiles > 0 ? 'warning' : 'default'}
            />
            <AttentionItem
              label="Pending org invites"
              count={snapshot.pendingInvites}
              href="/admin/profiles"
            />
            <AttentionItem
              label="Open cases"
              count={snapshot.openCases}
              href="/admin/appointments"
            />
            <AttentionItem
              label="Content to review"
              count={snapshot.resourcesPublished + snapshot.policiesPublished}
              href="/admin/resources"
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function AttentionItem({ label, count, href, tone = 'default' }: { label: string; count: number; href: string; tone?: 'default' | 'warning' }) {
  return (
    <div className="flex items-center justify-between gap-space-sm rounded-2xl border border-outline/12 bg-surface-container-high px-space-md py-space-sm">
      <div>
        <p className="text-body-sm text-on-surface">{label}</p>
        <p className="text-label-sm text-muted-foreground">RLS enforced in destination workspace.</p>
      </div>
      <div className="flex items-center gap-space-sm">
        <Badge variant={tone === 'warning' ? 'destructive' : 'secondary'}>{formatCount(count)}</Badge>
        <Button asChild variant="outline" size="sm">
          <Link href={href}>Open</Link>
        </Button>
      </div>
    </div>
  );
}

function sevenDaysAgoIso() {
  const now = new Date();
  now.setDate(now.getDate() - 7);
  return now.toISOString();
}

function StatTile({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'warning' | 'info' }) {
  const toneClasses =
    tone === 'warning'
      ? 'border-primary/24 bg-primary-container text-on-primary-container'
      : tone === 'info'
        ? 'border-outline/12 bg-secondary-container text-on-secondary-container'
        : 'border-outline/12 bg-surface text-on-surface';

  return (
    <div className={`rounded-xl px-space-md py-space-md shadow-level-1 ${toneClasses}`}>
      <p className="text-label-lg text-muted-foreground">{label}</p>
      <p className="text-headline-md font-semibold">{value}</p>
    </div>
  );
}
