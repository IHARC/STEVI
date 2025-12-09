import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { fetchStaffCaseActivities } from '@/lib/cases/fetchers';
import { PageHeader } from '@shared/layout/page-header';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Separator } from '@shared/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/ui/tabs';
import type { Database } from '@/types/supabase';
import { cn } from '@/lib/utils';

type PageProps = { params: Promise<{ id: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> };

export const dynamic = 'force-dynamic';

type PersonRow = Pick<
  Database['core']['Tables']['people']['Row'],
  'id' | 'first_name' | 'last_name' | 'email' | 'phone' | 'data_sharing_consent' | 'created_at' | 'created_by'
>;

const FILTERS = ['all', 'visits', 'tasks', 'referrals', 'supplies', 'appointments'] as const;
type FilterId = (typeof FILTERS)[number];

export default async function WorkspaceClientDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const filterParam = searchParams ? await searchParams : undefined;
  const filterValue = filterParam?.filter;
  const activeFilter: FilterId = FILTERS.includes((Array.isArray(filterValue) ? filterValue[0] : filterValue) as FilterId)
    ? ((Array.isArray(filterValue) ? filterValue[0] : filterValue) as FilterId)
    : 'all';

  const personId = Number.parseInt(id, 10);
  if (!personId || Number.isNaN(personId)) notFound();

  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect(`/login?next=/workspace/clients/${id}`);
  }

  if (!access.canAccessStaffWorkspace && !access.canAccessAdminWorkspace && !access.canManageConsents) {
    redirect(resolveLandingPath(access));
  }

  const [person, activities] = await Promise.all([
    loadPerson(supabase, personId),
    fetchStaffCaseActivities(supabase, personId, 120),
  ]);

  if (!person) notFound();

  const orgLabel = access.organizationName ?? 'Unassigned org';
  const orgMissing = !access.organizationId && (access.canAccessStaffWorkspace || access.canAccessAdminWorkspace);
  const newVisitHref = orgMissing ? '/org' : `/workspace/visits/new?personId=${person.id}`;

  const filteredActivities = activities.filter((activity) => filterActivity(activity.activityType, activeFilter));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-6">
      <PageHeader
        eyebrow="Client"
        title={`${person.first_name ?? 'Person'} ${person.last_name ?? ''}`.trim() || 'Client profile'}
        description="Journey timeline shows everything that happened with this person. Start a Visit to add notes, supplies, tasks, or referrals in one place."
        primaryAction={{ label: orgMissing ? 'Select org to start Visit' : 'New Visit', href: newVisitHref }}
        secondaryAction={{ label: 'Find another client', href: '/workspace/clients' }}
        breadcrumbs={[{ label: 'Clients', href: '/workspace/clients' }, { label: 'Profile' }]}
        meta={[{ label: `Created by ${orgLabel}`, tone: 'neutral' }, { label: person.data_sharing_consent ? 'Sharing: org/partners' : 'Sharing: restricted', tone: person.data_sharing_consent ? 'info' : 'warning' }]}
      />

      <section className="grid gap-4 md:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-xl">Journey timeline</CardTitle>
              <CardDescription>All Visits, tasks, referrals, supplies, and appointments tied to this person.</CardDescription>
            </div>
            <Tabs value={activeFilter} className="md:max-w-xl">
              <TabsList className="flex flex-wrap justify-end gap-1 bg-transparent p-0">
                {FILTERS.map((filter) => (
                  <TabsTrigger key={filter} value={filter} className="rounded-full border px-3 py-1 text-xs capitalize">
                    <Link href={`/workspace/clients/${person.id}?filter=${filter}`}>{filter}</Link>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet. Start a Visit to log the next step.</p>
            ) : (
              filteredActivities.map((activity) => (
                <article key={activity.id} className="rounded-2xl border border-border/40 bg-card p-4 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-foreground">{activity.title}</p>
                      <p className="text-sm text-muted-foreground capitalize">{activity.activityType ?? 'activity'}</p>
                      {activity.description ? (
                        <p className="text-sm text-foreground/80">{activity.description}</p>
                      ) : null}
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{formatDate(activity.activityDate)}</p>
                      {activity.activityTime ? <p>{activity.activityTime}</p> : null}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {activity.createdByOrg ? (
                      <Badge variant="outline" className="border-border/70">
                        Created by {activity.createdByOrg}
                      </Badge>
                    ) : null}
                    <Badge variant={activity.visibility === 'client' ? 'secondary' : 'outline'} className="border-border/70">
                      Visibility: {activity.visibility === 'client' ? 'Shared with client' : 'Internal'}
                    </Badge>
                  </div>
                </article>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick actions</CardTitle>
              <CardDescription>Keep actions inside a Visit to preserve provenance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild className="w-full">
                <Link href={newVisitHref}>New Visit</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href={orgMissing ? '/org' : `${newVisitHref}&action=referral`}>Add referral</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href={orgMissing ? '/org' : `${newVisitHref}&action=note`}>Add note</Link>
              </Button>
              <p className="text-xs text-muted-foreground">Supplies and referrals must be logged from a Visit.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Profile</CardTitle>
              <CardDescription>Contact and consent context.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-foreground/80">
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Contact</p>
                <p>Email: {person.email ?? '—'}</p>
                <p>Phone: {person.phone ?? '—'}</p>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Sharing</p>
                <p className="text-muted-foreground">
                  {person.data_sharing_consent ? 'Sharing with org/partners' : 'Restricted sharing; get consent inside Visit.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

async function loadPerson(
  supabase: Awaited<ReturnType<typeof createSupabaseRSCClient>>,
  personId: number,
): Promise<PersonRow | null> {
  const { data, error } = await supabase
    .schema('core')
    .from('people')
    .select('id, first_name, last_name, email, phone, data_sharing_consent, created_at, created_by')
    .eq('id', personId)
    .maybeSingle();

  if (error) throw error;
  return (data as PersonRow | null) ?? null;
}

function filterActivity(activityType: string | null, filter: FilterId) {
  if (filter === 'all') return true;
  if (!activityType) return false;
  const normalized = activityType.toLowerCase();
  if (filter === 'visits') return normalized.includes('visit');
  if (filter === 'tasks') return normalized.includes('task');
  if (filter === 'referrals') return normalized.includes('referral');
  if (filter === 'supplies') return normalized.includes('supply') || normalized.includes('inventory');
  if (filter === 'appointments') return normalized.includes('appointment');
  return true;
}

function formatDate(value: string | null) {
  if (!value) return 'Unknown date';
  try {
    return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return value;
  }
}
