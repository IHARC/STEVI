import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { PageHeader } from '@shared/layout/page-header';
import type { Database } from '@/types/supabase';
import { CreateOrganizationDialog } from './create-organization-dialog';
import { createOrganizationAction } from './actions';
import { OrganizationsList } from '@workspace/organizations/organizations-list';

type OrganizationRow = Pick<
  Database['core']['Tables']['organizations']['Row'],
  | 'id'
  | 'name'
  | 'website'
  | 'organization_type'
  | 'partnership_type'
  | 'status'
  | 'is_active'
  | 'services_tags'
  | 'updated_at'
>;

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type ListPageSize = 25 | 50 | 100;
type ListSortOrder = 'ASC' | 'DESC';
type SortKey = 'name' | 'organization_type' | 'partnership_type' | 'updated_at' | 'status';
type StatusFilter = 'all' | 'active' | 'inactive' | 'pending' | 'under_review';

function getString(params: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = params?.[key];
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0] ?? null;
  return null;
}

function parsePage(value: string | null) {
  const parsed = Number.parseInt(value ?? '1', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function parsePageSize(value: string | null): ListPageSize {
  const parsed = Number.parseInt(value ?? '25', 10);
  return parsed === 50 ? 50 : parsed === 100 ? 100 : 25;
}

function parseSortOrder(value: string | null): ListSortOrder {
  return value === 'ASC' ? 'ASC' : 'DESC';
}

function parseSortKey(value: string | null): SortKey {
  if (value === 'name' || value === 'organization_type' || value === 'partnership_type' || value === 'status' || value === 'updated_at') {
    return value;
  }
  return 'updated_at';
}

function parseStatusFilter(value: string | null): StatusFilter {
  if (value === 'active' || value === 'inactive' || value === 'pending' || value === 'under_review') return value;
  return 'all';
}

export default async function OpsOrganizationsPage({ searchParams }: PageProps) {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/login?next=/ops/organizations');
  }

  if (!access.canAccessOpsFrontline && !access.canAccessOpsOrg && !access.canAccessOpsAdmin && !access.canAccessOpsSteviAdmin) {
    redirect(resolveLandingPath(access));
  }

  const isInternalIharc = access.iharcRoles.length > 0;
  const canManageOrganizations = access.canAccessOpsSteviAdmin;
  const orgScopedViewer = !canManageOrganizations && !isInternalIharc;
  const visibleOrgId = orgScopedViewer ? access.organizationId : null;
  const resolvedParams = searchParams ? await searchParams : undefined;
  const query = {
    q: (getString(resolvedParams, 'q') ?? '').trim(),
    status: parseStatusFilter(getString(resolvedParams, 'status')),
    page: parsePage(getString(resolvedParams, 'page')),
    pageSize: parsePageSize(getString(resolvedParams, 'pageSize')),
    sortBy: parseSortKey(getString(resolvedParams, 'sortBy')),
    sortOrder: parseSortOrder(getString(resolvedParams, 'sortOrder')),
  } as const;

  const { organizations, totalCount } = visibleOrgId === null && orgScopedViewer
    ? { organizations: [] as OrganizationRow[], totalCount: 0 }
    : await fetchOrganizationsPage(supabase, visibleOrgId, query);
  const canOpenOrganizations = canManageOrganizations || isInternalIharc || access.canAccessOpsOrg;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Organizations"
        description="Browse partner organizations. IHARC admins can create, update, and retire organizations."
      />

      <OrganizationsList
        key={`${query.q}|${query.status}|${query.page}|${query.pageSize}|${query.sortBy}|${query.sortOrder}`}
        organizations={organizations}
        totalCount={totalCount}
        query={query}
        canOpenOrganizations={canOpenOrganizations}
        createAction={canManageOrganizations ? <CreateOrganizationDialog action={createOrganizationAction} /> : undefined}
      />
    </div>
  );
}

async function fetchOrganizationsPage(
  supabase: Awaited<ReturnType<typeof createSupabaseRSCClient>>,
  onlyOrganizationId: number | null,
  query: {
    q: string;
    status: StatusFilter;
    page: number;
    pageSize: ListPageSize;
    sortBy: SortKey;
    sortOrder: ListSortOrder;
  },
): Promise<{ organizations: OrganizationRow[]; totalCount: number }> {
  const core = supabase.schema('core');
  let builder = core
    .from('organizations')
    .select('id, name, website, organization_type, partnership_type, status, is_active, services_tags, updated_at', {
      count: 'exact',
    });

  if (onlyOrganizationId !== null) {
    builder = builder.eq('id', onlyOrganizationId);
  }

  if (query.status !== 'all') {
    builder = builder.eq('status', query.status);
  }

  const searchTerm = query.q.trim().replaceAll(',', ' ');
  if (searchTerm) {
    builder = builder.or(`name.ilike.%${searchTerm}%,website.ilike.%${searchTerm}%`);
  }

  builder = builder.order(query.sortBy, { ascending: query.sortOrder === 'ASC' });
  const from = (query.page - 1) * query.pageSize;
  const to = from + query.pageSize - 1;
  const { data, error, count } = await builder.range(from, to);

  if (error) throw error;
  return {
    organizations: (data ?? []) as OrganizationRow[],
    totalCount: count ?? 0,
  };
}
