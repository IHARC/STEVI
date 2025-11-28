import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
import {
  coerceSegment,
  fetchAdminUserSummary,
  fetchAdminUsers,
  parseAffiliationStatus,
  parsePageParam,
  type AdminUserSegment,
} from '@/lib/admin-users';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';
import { UserSavedSearches } from '../user-saved-searches';
import { UserPeekSheet } from '../user-peek-sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const STATUS_OPTIONS = [
  { value: '', label: 'Any status' },
  { value: 'approved', label: 'Approved' },
  { value: 'pending', label: 'Pending' },
  { value: 'revoked', label: 'Revoked' },
] as const;

const ROLE_OPTIONS = [
  'portal_admin',
  'portal_org_admin',
  'portal_org_rep',
  'portal_user',
  'iharc_admin',
  'iharc_supervisor',
  'iharc_staff',
  'iharc_volunteer',
] as const;

const SEGMENT_LABELS: Record<AdminUserSegment, string> = {
  all: 'All users',
  clients: 'Clients',
  partners: 'Partners',
  staff: 'IHARC staff & volunteers',
};

function toNumber(value: string | string[] | undefined): number | null {
  const v = Array.isArray(value) ? value[0] : value;
  if (!v) return null;
  const parsed = Number.parseInt(v, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function toStringParam(value: string | string[] | undefined): string | null {
  const v = Array.isArray(value) ? value[0] : value;
  return v ? v : null;
}

function buildHref(segment: AdminUserSegment, params: URLSearchParams) {
  const qs = params.toString();
  return `/admin/users/${segment}${qs ? `?${qs}` : ''}`;
}

function PaginationControls({
  segment,
  page,
  hasMore,
  params,
}: {
  segment: AdminUserSegment;
  page: number;
  hasMore: boolean;
  params: URLSearchParams;
}) {
  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = hasMore ? page + 1 : null;

  const prevParams = new URLSearchParams(params);
  if (prevPage) prevParams.set('page', String(prevPage));
  else prevParams.delete('page');

  const nextParams = new URLSearchParams(params);
  if (nextPage) nextParams.set('page', String(nextPage));

  return (
    <div className="flex items-center justify-between gap-space-sm rounded-2xl border border-outline/20 bg-surface-container p-space-sm text-body-sm">
      <span className="text-muted-foreground">Page {page}{hasMore ? ' • more available' : ''}</span>
      <div className="flex items-center gap-space-xs">
        <Button asChild variant="outline" size="sm" disabled={!prevPage}>
          <Link href={prevPage ? buildHref(segment, prevParams) : '#'}>← Prev</Link>
        </Button>
        <Button asChild variant="outline" size="sm" disabled={!nextPage}>
          <Link href={nextPage ? buildHref(segment, nextParams) : '#'}>Next →</Link>
        </Button>
      </div>
    </div>
  );
}

type RouteParams = { segment: string };

export default async function AdminUsersSegmentPage({
  params,
  searchParams,
}: {
  params: Promise<RouteParams>;
  searchParams?: SearchParams;
}) {
  const resolvedParams = await params;
  const rawSegment = resolvedParams.segment;
  const segment = coerceSegment(rawSegment);
  if (!segment) {
    redirect('/admin/users/all');
  }

  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect(`/login?next=/admin/users/${rawSegment}`);
  }
  if (!access.canAccessAdminWorkspace) {
    redirect(resolveDefaultWorkspacePath(access));
  }

  await ensurePortalProfile(supabase, access.userId);

  const resolvedSearch = searchParams ? await searchParams : {};
  const page = parsePageParam(resolvedSearch.page);
  const status = toStringParam(resolvedSearch.status);
  const role = toStringParam(resolvedSearch.role);
  const organizationId = toNumber(resolvedSearch.org);
  const q = toStringParam(resolvedSearch.q);
  const sort = toStringParam(resolvedSearch.sort) === 'name' ? 'name' : 'recent';
  const statusFilter = parseAffiliationStatus(status);

  const [summary, listResult, orgOptions] = await Promise.all([
    fetchAdminUserSummary(supabase),
      fetchAdminUsers(supabase, segment, {
        page,
        pageSize: 25,
        status: statusFilter,
        role,
        organizationId: organizationId ?? undefined,
        search: q,
        sort,
      }),
    supabase
      .schema('core')
      .from('organizations')
      .select('id, name')
      .order('name'),
  ]);

  if (orgOptions.error) {
    throw orgOptions.error;
  }

  const organizations =
    (orgOptions.data ?? []).map((org: { id: number; name: string }) => ({
      id: org.id,
      name: org.name,
    })) ?? [];

  const paramsForLinks = new URLSearchParams();
  if (status) paramsForLinks.set('status', status);
  if (role) paramsForLinks.set('role', role);
  if (organizationId) paramsForLinks.set('org', String(organizationId));
  if (q) paramsForLinks.set('q', q);
  if (sort === 'name') paramsForLinks.set('sort', 'name');
  paramsForLinks.set('page', String(page));
  const paramsString = paramsForLinks.toString();

  return (
    <div className="page-shell page-stack">
      <header className="flex flex-col gap-space-xs">
        <p className="text-label-sm font-medium uppercase text-muted-foreground">Admin · Access</p>
        <div className="flex flex-col gap-space-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-space-2xs">
            <h1 className="text-headline-lg text-on-surface sm:text-display-sm">User management</h1>
            <p className="max-w-3xl text-body-md text-muted-foreground sm:text-body-lg">
              Review clients, partners, and IHARC staff at scale. Filter, paginate, and jump into detail pages for profile updates, roles, and history.
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/profiles">Open verification & invites</Link>
          </Button>
        </div>
      </header>

      <section className="grid gap-space-sm md:grid-cols-4">
        <SummaryCard label="Total users" value={summary.total} />
        <SummaryCard label="Clients" value={summary.clients} />
        <SummaryCard label="Partners" value={summary.partners} />
        <SummaryCard label="Staff & volunteers" value={summary.staff} />
        <SummaryCard label="Pending" value={summary.pending} tone="outline" />
        <SummaryCard label="Revoked" value={summary.revoked} tone="secondary" />
      </section>

      <SegmentTabs active={segment} params={paramsForLinks} />

      <UserSavedSearches segment={segment} currentParams={paramsString} />

      <FilterBar
        segment={segment}
        organizations={organizations}
        params={paramsForLinks}
      />

      <Card className="border-outline/20 bg-surface-container">
        <CardHeader className="flex flex-col gap-space-2xs sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-title-md">Users</CardTitle>
            <CardDescription>Compact list with pagination and role context.</CardDescription>
          </div>
          <Badge variant="outline" className="text-label-sm">
            {listResult.total} total
          </Badge>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last seen</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listResult.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No users match these filters.
                  </TableCell>
                </TableRow>
              ) : (
                listResult.items.map((user: Awaited<ReturnType<typeof fetchAdminUsers>>['items'][number]) => (
                  <TableRow key={user.profileId}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-on-surface">{user.displayName}</span>
                        {user.positionTitle ? (
                          <span className="text-xs text-muted-foreground">{user.positionTitle}</span>
                        ) : null}
                        <span className="text-xs text-muted-foreground">{user.email ?? 'No email'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">
                      {user.affiliationType.replace('_', ' ')}
                    </TableCell>
                    <TableCell>
                      {user.organizationName ? (
                        <span className="text-on-surface">{user.organizationName}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-space-2xs">
                        {user.roles.portal.map((role: string) => (
                          <Badge key={role} variant="outline" className="capitalize">
                            {role.replace('portal_', '')}
                          </Badge>
                        ))}
                        {user.roles.iharc.map((role: string) => (
                          <Badge key={role} variant="secondary" className="capitalize">
                            {role.replace('iharc_', '')}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.affiliationStatus === 'approved' ? 'default' : user.affiliationStatus === 'pending' ? 'outline' : 'secondary'}>
                        {user.affiliationStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                    </TableCell>
                    <TableCell className="flex justify-end gap-space-xs">
                      <UserPeekSheet user={user} />
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/users/${user.profileId}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PaginationControls
        segment={segment}
        page={listResult.page}
        hasMore={listResult.hasMore}
        params={paramsForLinks}
      />
    </div>
  );
}

function SummaryCard({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'outline' | 'secondary' }) {
  return (
    <Card className="border-outline/20">
      <CardHeader className="flex flex-row items-center justify-between gap-space-xs">
        <CardTitle className="text-title-sm text-muted-foreground">{label}</CardTitle>
        <Badge variant={tone}>{value}</Badge>
      </CardHeader>
    </Card>
  );
}

function SegmentTabs({ active, params }: { active: AdminUserSegment; params: URLSearchParams }) {
  const entries: AdminUserSegment[] = ['all', 'clients', 'partners', 'staff'];
  return (
    <div className="flex flex-wrap gap-space-xs">
      {entries.map((segment) => {
        const href = buildHref(segment, params);
        const isActive = segment === active;
        return (
          <Button
            key={segment}
            asChild
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            className="capitalize"
          >
            <Link href={href}>{SEGMENT_LABELS[segment]}</Link>
          </Button>
        );
      })}
    </div>
  );
}

function FilterBar({
  segment,
  organizations,
  params,
}: {
  segment: AdminUserSegment;
  organizations: { id: number; name: string }[];
  params: URLSearchParams;
}) {
  const currentStatus = params.get('status') ?? '';
  const currentRole = params.get('role') ?? '';
  const currentOrg = params.get('org') ?? '';
  const currentSearch = params.get('q') ?? '';
  const currentSort = params.get('sort') ?? 'recent';

  return (
    <form className="grid gap-space-sm rounded-2xl border border-outline/20 bg-surface-container p-space-sm md:grid-cols-5" action={`/admin/users/${segment}`}>
      <div className="md:col-span-2 space-y-space-2xs">
        <Label htmlFor="q">Search</Label>
        <Input id="q" name="q" placeholder="Name or email" defaultValue={currentSearch} />
      </div>
      <div className="space-y-space-2xs">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          name="status"
          defaultValue={currentStatus}
          className="w-full rounded-lg border border-outline/30 bg-surface px-space-sm py-space-2xs text-body-sm"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value || 'any'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-space-2xs">
        <Label htmlFor="role">Role</Label>
        <select
          id="role"
          name="role"
          defaultValue={currentRole}
          className="w-full rounded-lg border border-outline/30 bg-surface px-space-sm py-space-2xs text-body-sm capitalize"
        >
          <option value="">Any role</option>
          {ROLE_OPTIONS.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-space-2xs">
        <Label htmlFor="org">Organization</Label>
        <select
          id="org"
          name="org"
          defaultValue={currentOrg}
          className="w-full rounded-lg border border-outline/30 bg-surface px-space-sm py-space-2xs text-body-sm"
        >
          <option value="">Any org</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-space-2xs">
        <Label htmlFor="sort">Sort</Label>
        <select
          id="sort"
          name="sort"
          defaultValue={currentSort}
          className="w-full rounded-lg border border-outline/30 bg-surface px-space-sm py-space-2xs text-body-sm"
        >
          <option value="recent">Recent activity</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>
      <div className="md:col-span-5 flex flex-wrap justify-end gap-space-xs">
        <Button type="submit" variant="default">
          Apply
        </Button>
        <Button type="reset" variant="ghost">
          Reset
        </Button>
      </div>
    </form>
  );
}
