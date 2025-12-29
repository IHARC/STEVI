import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { fetchMyOpenShift, fetchMyTimecards, fetchOrgTimecards, type TimeEntryWithProfile } from '@/lib/time/queries';
import { PageHeader } from '@shared/layout/page-header';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Input } from '@shared/ui/input';
import { TimeClockCard } from '@workspace/time/time-clock-card';
import { TimecardsTable } from '@workspace/time/timecards-table';

export const dynamic = 'force-dynamic';

type SearchParams = {
  from?: string;
  to?: string;
  status?: string;
};

function toStartOfDay(value: string | undefined) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function toEndOfDay(value: string | undefined) {
  if (!value) return null;
  const parsed = new Date(`${value}T23:59:59.999`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export default async function TimeTrackingPage({ searchParams }: { searchParams?: SearchParams }) {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/auth/start?next=/ops/time');
  }

  if (!access.canTrackTime && !access.canViewAllTime && !access.canManageTime) {
    redirect(resolveLandingPath(access));
  }

  if (!access.organizationId) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Operations"
          title="Time tracking"
          description="Select an acting organization to manage timecards."
          breadcrumbs={[{ label: 'Operations', href: '/ops/today' }, { label: 'Time tracking' }]}
        />
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-xl">Organization required</CardTitle>
            <CardDescription>Select an organization before starting a shift.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm">
              <Link href="/ops/profile">Select organization</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!access.organizationFeatures.includes('time_tracking')) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Operations"
          title="Time tracking"
          description="Time tracking is disabled for this organization."
          breadcrumbs={[{ label: 'Operations', href: '/ops/today' }, { label: 'Time tracking' }]}
        />
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-xl">Enable time tracking</CardTitle>
            <CardDescription>Ask an org admin to enable time tracking to start using timecards.</CardDescription>
          </CardHeader>
          <CardContent>
            {access.canManageOrgUsers ? (
              <Button asChild size="sm" variant="outline">
                <Link href={`/ops/organizations/${access.organizationId}?tab=settings`}>Open org settings</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  const from = toStartOfDay(searchParams?.from);
  const to = toEndOfDay(searchParams?.to);
  const status = searchParams?.status && ['open', 'closed'].includes(searchParams.status) ? searchParams.status : null;

  const [openShift, myTimecards, orgTimecards] = await Promise.all([
    fetchMyOpenShift(supabase, access.organizationId, access.userId),
    fetchMyTimecards(supabase, access.organizationId, access.userId, { limit: 20 }),
    access.canViewAllTime || access.canManageTime
      ? fetchOrgTimecards(supabase, access.organizationId, { from, to, status, limit: 120 })
      : Promise.resolve([]),
  ]);
  const myTimecardsWithProfile: TimeEntryWithProfile[] = myTimecards.map((row) => ({ ...row, profile: null }));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Time tracking"
        description="Track shifts, breaks, and time costs for your organization."
        breadcrumbs={[{ label: 'Operations', href: '/ops/today' }, { label: 'Time tracking' }]}
        meta={[
          {
            label: `Organization: ${access.organizationName ?? `#${access.organizationId}`}`,
            tone: 'neutral',
          },
        ]}
      />

      <section className="grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
        <TimeClockCard
          openShift={openShift}
          roles={access.orgRoles}
          orgMissing={!access.organizationId}
        />
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-lg">My recent timecards</CardTitle>
            <CardDescription>Latest shifts recorded under your profile.</CardDescription>
          </CardHeader>
          <CardContent>
            <TimecardsTable rows={myTimecardsWithProfile} />
          </CardContent>
        </Card>
      </section>

      {access.canViewAllTime || access.canManageTime ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Team timecards</h2>
              <p className="text-sm text-muted-foreground">Review shifts for all staff and volunteers.</p>
            </div>
            <form method="get" className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="from-date">From</label>
                <Input id="from-date" name="from" type="date" defaultValue={searchParams?.from ?? ''} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="to-date">To</label>
                <Input id="to-date" name="to" type="date" defaultValue={searchParams?.to ?? ''} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="status-filter">Status</label>
                <select
                  id="status-filter"
                  name="status"
                  defaultValue={status ?? 'all'}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                >
                  <option value="all">All</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <Button type="submit" size="sm" variant="outline">
                Filter
              </Button>
            </form>
          </div>
          <Card className="border-border/70">
            <CardContent className="pt-6">
              <TimecardsTable rows={orgTimecards} showProfile />
            </CardContent>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
