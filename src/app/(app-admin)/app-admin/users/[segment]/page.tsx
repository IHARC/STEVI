import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { coerceSegment, fetchAdminUsers, fetchAdminUserSummary, parsePageParam, type AdminUserListResult, type AdminUserSummary } from '@/lib/admin-users';
import { getAffiliationStatuses, getGlobalRoles, getOrgRoleNames, toOptions, formatEnumLabel } from '@/lib/enum-values';
import { PageHeader } from '@shared/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Button } from '@shared/ui/button';
import { UserFilterBar } from '@workspace/admin/users/user-filter-bar';
import { UserSavedSearches } from '../user-saved-searches';
import { UserPeekSheet } from '../user-peek-sheet';
import { UserSegmentSwitcher } from '../user-segment-switcher';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ segment: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminUsersSegmentPage({ params, searchParams }: PageProps) {
  const { segment } = await params;
  const resolvedParams = searchParams ? await searchParams : undefined;

  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect(`/auth/start?next=/app-admin/users/${segment}`);
  }

  if (!access.canAccessOpsAdmin) {
    redirect(resolveLandingPath(access));
  }

  const coercedSegment = coerceSegment(segment);
  const segmentLabel = (
    {
      all: 'All users',
      clients: 'Clients',
      partners: 'Partners',
      staff: 'Staff',
    } satisfies Record<typeof coercedSegment, string>
  )[coercedSegment];
  const q = getString(resolvedParams, 'q');
  const status = getString(resolvedParams, 'status');
  const role = getString(resolvedParams, 'role');
  const org = getString(resolvedParams, 'org');
  const sort = getString(resolvedParams, 'sort') as 'recent' | 'name' | null;
  const page = parsePageParam(resolvedParams?.page);

  const affiliationStatus =
    status === 'pending' || status === 'approved' || status === 'revoked' ? status : null;

  const [summaryRaw, listRaw, orgRows, statusesRaw, orgRolesRaw, globalRolesRaw] = await Promise.all([
    fetchAdminUserSummary(supabase),
    fetchAdminUsers(supabase, coercedSegment, {
      search: q,
      status: affiliationStatus,
      role: role || null,
      organizationId: org ? Number.parseInt(org, 10) : null,
      sort: sort || 'recent',
      page,
    }),
    supabase.schema('core').from('organizations').select('id, name').order('name').limit(200),
    getAffiliationStatuses(supabase),
    getOrgRoleNames(supabase),
    access.isGlobalAdmin ? getGlobalRoles(supabase) : Promise.resolve([]),
  ] as const);

  const summary = summaryRaw as AdminUserSummary;
  const list = listRaw as AdminUserListResult;
  const statuses = statusesRaw as string[];
  const orgRoles = orgRolesRaw as string[];
  const globalRoles = globalRolesRaw as string[];

  if (orgRows.error) throw orgRows.error;
  const organizations = (orgRows.data ?? []).map((o: { id: number; name: string | null }) => ({
    id: o.id,
    name: o.name ?? 'Organization',
  }));

  const statusOptions = toOptions(statuses);
  const roleOptions = toOptions([...globalRoles, ...orgRoles]);

  const currentParamsString = resolvedParams ? new URLSearchParams(Object.entries(resolvedParams).flatMap(([key, value]) => {
    if (value === undefined) return [];
    if (Array.isArray(value)) return value.map((v) => [key, v]);
    return [[key, value]];
  })).toString() : '';

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="STEVI Admin"
        title="Users"
        description="Search, approve, and manage user permissions."
        breadcrumbs={[{ label: 'STEVI Admin', href: '/app-admin' }, { label: 'Users' }]}
        meta={[{ label: segmentLabel, tone: 'neutral' }]}
        actions={<UserSegmentSwitcher segment={coercedSegment} queryString={currentParamsString} />}
      >
        <div className="flex flex-wrap gap-2 text-xs">
          <span>Total {summary.total}</span>
          <span>Pending {summary.pending}</span>
          <span>Revoked {summary.revoked}</span>
          <span>Clients {summary.clients}</span>
          <span>Partners {summary.partners}</span>
          <span>Staff {summary.staff}</span>
        </div>
      </PageHeader>

      <UserFilterBar
        segment={coercedSegment}
        organizations={organizations}
        statusOptions={[{ value: '', label: 'Any status' }, ...statusOptions]}
        roleOptions={roleOptions}
        initial={{
          q: q ?? '',
          status: status ?? '',
          role: role ?? '',
          org: org ?? '',
          sort: sort ?? 'recent',
        }}
      />

      <UserSavedSearches segment={coercedSegment} currentParams={currentParamsString} />

      <section className="grid gap-3">
        {list.items.length === 0 ? (
          <Card className="border-dashed border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">No users found</CardTitle>
              <CardDescription>Try adjusting your filters.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          list.items.map((user) => {
            const combinedRoles = new Set([...(user.roles.global ?? []), ...(user.roles.org ?? [])]);
            return (
              <Card key={user.profileId} className="border-border/60">
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{user.displayName}</CardTitle>
                    <CardDescription>{user.email ?? 'No email on file'}</CardDescription>
                    <div className="flex flex-wrap gap-1 text-xs">
                      <span className="capitalize">{formatEnumLabel(user.affiliationType)}</span>
                      <span>
                        {user.affiliationStatus}
                      </span>
                      {user.organizationName ? <span>{user.organizationName}</span> : <span>No org</span>}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(combinedRoles).map((roleName) => (
                        <span key={roleName} className="capitalize text-xs">
                          {roleName.replaceAll('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <UserPeekSheet user={user} />
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/app-admin/users/profile/${user.profileId}`}>Open profile</Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Last seen {user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleString() : 'never'}
                </CardContent>
              </Card>
            );
          })
        )}
      </section>
    </div>
  );
}

function getString(params: Record<string, string | string[] | undefined> | undefined, key: string) {
  if (!params) return null;
  const raw = params[key];
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] : raw;
}
