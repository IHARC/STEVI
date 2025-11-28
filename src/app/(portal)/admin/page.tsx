import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts';

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

  const shortcuts = [
    { label: 'Approve profiles', href: '/admin/profiles', badge: snapshot.pendingProfiles ? `${snapshot.pendingProfiles} pending` : null },
    { label: 'User management', href: '/admin/users', badge: 'Search + peek' },
    { label: 'Resources', href: '/admin/resources', badge: `${snapshot.resourcesPublished} live` },
    { label: 'Policies', href: '/admin/policies', badge: `${snapshot.policiesPublished} live` },
    { label: 'Notifications', href: '/admin/notifications', badge: 'Templates + test' },
  ];

  return (
    <div className="page-shell page-stack">
      <header className="flex flex-col gap-space-xs">
        <p className="text-label-sm font-medium uppercase text-muted-foreground">Operations</p>
        <h1 className="text-headline-lg text-on-surface sm:text-display-sm">Admin workspace overview</h1>
        <p className="max-w-4xl text-body-md text-muted-foreground sm:text-body-lg">
          Track approvals, notifications, and content at a glance. All counts respect Supabase RLS and audit logging.
        </p>
        <div className="flex flex-wrap gap-space-sm">
          {shortcuts.map((item) => (
            <Button key={item.href} asChild variant="outline" size="sm" className="gap-space-2xs">
              <Link href={item.href}>
                <span>{item.label}</span>
                {item.badge ? <Badge variant="secondary" className="ml-space-2xs">{item.badge}</Badge> : null}
              </Link>
            </Button>
          ))}
        </div>
      </header>

      <section className="grid gap-space-md md:grid-cols-3 lg:grid-cols-6">
        {metricCards.map((card) => (
          <Card
            key={card.id}
            className={card.tone === 'warning' ? 'border-amber-400/60 bg-amber-50 text-amber-900' : 'border-outline/20'}
          >
            <CardHeader className="space-y-space-3xs">
              <CardTitle className="text-label-sm font-medium uppercase text-muted-foreground">{card.label}</CardTitle>
              <p className="text-headline-sm font-semibold text-on-surface">{card.value}</p>
            </CardHeader>
          </Card>
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
              <ChartContainer
                config={{ notifications: { label: 'Notifications', color: 'rgb(var(--md-sys-color-primary))' } }}
                className="h-64"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid-color)" />
                    <XAxis dataKey="name" stroke="var(--chart-axis-color)" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} stroke="var(--chart-axis-color)" tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="var(--color-notifications)" radius={[6, 6, 6, 6]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
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
    <div className="flex items-center justify-between gap-space-sm rounded-2xl border border-outline/20 bg-surface-container-low px-space-md py-space-sm">
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
