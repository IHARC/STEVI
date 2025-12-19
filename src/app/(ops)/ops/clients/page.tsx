import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { fetchStaffCaseload } from '@/lib/staff/fetchers';
import { fetchStaffCases } from '@/lib/cases/fetchers';
import { getOnboardingStatusForPeople, type OnboardingStatus } from '@/lib/onboarding/status';
import { PERSON_CATEGORY_VALUES, PERSON_STATUS_VALUES, PERSON_TYPE_VALUES, requiresPrivacySearch } from '@/lib/clients/directory';
import type { PersonCategory, PersonStatus, PersonType } from '@/lib/clients/directory';
import type { Database } from '@/types/supabase';
import { PageHeader } from '@shared/layout/page-header';
import { PageTabNav, type PageTab } from '@shared/layout/page-tab-nav';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/ui/table';
import { ClientsDirectoryTable } from '@workspace/clients/clients-directory-table';
import { normalizeEnumParam, paramsToRecord, toSearchParams } from '@/lib/search-params';

type DirectoryItem = Database['core']['Functions']['get_people_list_with_types']['Returns'][number];
type PersonWithOnboarding = DirectoryItem & { onboarding?: OnboardingStatus | null };

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export const dynamic = 'force-dynamic';

const VIEWS = ['directory', 'caseload', 'activity'] as const;
type ViewId = (typeof VIEWS)[number];

export default async function OpsClientsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const params = toSearchParams(resolvedSearchParams);
  const { value: activeView, redirected } = normalizeEnumParam(params, 'view', VIEWS, 'directory');
  if (redirected) {
    redirect(`/ops/clients?${params.toString()}`);
  }

  const normalizedParams = paramsToRecord(params);
  const directoryQuery = parseDirectoryQuery(normalizedParams);

  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect(`/login?next=${encodeURIComponent('/ops/clients?view=directory')}`);
  }

  if (!access.canAccessOpsFrontline && !access.canManageConsents && !access.canAccessOpsAdmin) {
    redirect(resolveLandingPath(access));
  }

  const canStartVisit = access.canAccessOpsFrontline || access.canAccessOpsAdmin;
  const orgMissing = canStartVisit && !access.organizationId;
  const visitAction = canStartVisit
    ? { label: orgMissing ? 'Select acting org to start Visit' : 'New Visit', href: '/ops/visits/new' }
    : { label: 'Find or create person', href: '/ops/clients?view=directory' };

  const caseloadPromise = access.canAccessOpsFrontline ? fetchStaffCaseload(supabase, access.userId) : Promise.resolve([]);
  const casesPromise = access.canAccessOpsFrontline ? fetchStaffCases(supabase, 60) : Promise.resolve([]);
  const directoryResult = await loadDirectory(supabase, directoryQuery);

  let onboardingMap: Record<number, OnboardingStatus | null | undefined> = {};
  let onboardingError: string | null = null;

  if (directoryResult.items.length) {
    try {
      onboardingMap = await getOnboardingStatusForPeople(directoryResult.items.map((person) => person.id), supabase);
    } catch (error) {
      onboardingError = error instanceof Error ? error.message : 'Unable to load onboarding status right now.';
    }
  }

  const [caseload, cases] = await Promise.all([caseloadPromise, casesPromise]);

  const peopleWithOnboarding: PersonWithOnboarding[] = directoryResult.items.map((person) => ({
    ...person,
    onboarding: onboardingMap[person.id],
  }));

  const tabs: PageTab[] = VIEWS.map((view) => ({
    label: labelForView(view),
    href: `/ops/clients?view=${view}`,
  }));
  const activeHref = `/ops/clients?view=${activeView}`;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clients"
        description="Directory, caseload, and recent activity in one hub. Start Visits and keep referrals or supplies within the Visit context."
        density="compact"
        meta={[{ label: 'Visit-first', tone: 'info' }, { label: 'Journey timeline', tone: 'neutral' }]}
      />

      <PageTabNav
        tabs={tabs}
        activeHref={activeHref}
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="h-8">
              <Link href="/ops/clients?view=directory">Find / create person</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="h-8">
              <Link href="/ops/profile">Manage acting org</Link>
            </Button>
            <Button asChild size="sm" className="h-8">
              <Link href={visitAction.href}>{visitAction.label}</Link>
            </Button>
          </>
        }
      />

      {activeView === 'directory' ? (
        <ClientsDirectoryTable
          items={peopleWithOnboarding}
          totalCount={directoryResult.totalCount}
          query={directoryQuery}
          loadError={directoryResult.error}
          onboardingError={onboardingError}
        />
      ) : null}

      {activeView === 'caseload' ? (
        <CaseloadView caseload={caseload} />
      ) : null}

      {activeView === 'activity' ? (
        <ActivityView cases={cases} />
      ) : null}
    </div>
  );
}

function parseDirectoryQuery(params?: Record<string, string | string[] | undefined>) {
  const get = (key: string) => {
    const value = params?.[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const q = (get('q') ?? '').trim();

  const pageRaw = Number.parseInt(get('page') ?? '1', 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const pageSizeRaw = Number.parseInt(get('pageSize') ?? '25', 10);
  const pageSize = pageSizeRaw === 50 ? 50 : pageSizeRaw === 100 ? 100 : 25;

  const statusRaw = get('status');
  const status = statusRaw && PERSON_STATUS_VALUES.includes(statusRaw as PersonStatus) ? (statusRaw as PersonStatus) : 'all';

  const categoryRaw = get('category');
  const category = categoryRaw && PERSON_CATEGORY_VALUES.includes(categoryRaw as PersonCategory) ? (categoryRaw as PersonCategory) : 'all';

  const typesRaw = (get('types') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const types = typesRaw.filter((value): value is PersonType => PERSON_TYPE_VALUES.includes(value as PersonType));

  const sortByRaw = get('sortBy');
  const sortBy =
    sortByRaw === 'first_name' ||
    sortByRaw === 'last_name' ||
    sortByRaw === 'person_type' ||
    sortByRaw === 'last_service_date' ||
    sortByRaw === 'updated_at'
      ? sortByRaw
      : 'created_at';

  const sortOrderRaw = (get('sortOrder') ?? 'DESC').toUpperCase();
  const sortOrder = sortOrderRaw === 'ASC' ? 'ASC' : 'DESC';

  return { q, page, pageSize, status, category, types, sortBy, sortOrder } as const;
}

async function loadDirectory(
  supabase: Awaited<ReturnType<typeof createSupabaseRSCClient>>,
  query: ReturnType<typeof parseDirectoryQuery>,
): Promise<{ items: DirectoryItem[]; totalCount: number; error: string | null }> {
  const searchTerm = query.q.trim() || null;
  const personTypes = query.types.length ? query.types : null;

  if (personTypes && requiresPrivacySearch(personTypes) && (!searchTerm || searchTerm.length < 2)) {
    return {
      items: [],
      totalCount: 0,
      error: 'Search term of at least 2 characters is required when including community member or potential client records (privacy protection).',
    };
  }

  const core = supabase.schema('core');
  const { data, error } = await core.rpc('get_people_list_with_types', {
    p_page: query.page,
    p_page_size: query.pageSize,
    p_search_term: searchTerm,
    p_person_types: personTypes,
    p_person_category: query.category === 'all' ? null : query.category,
    p_status: query.status === 'all' ? null : query.status,
    p_sort_by: query.sortBy,
    p_sort_order: query.sortOrder,
  });

  if (error) {
    return {
      items: [],
      totalCount: 0,
      error: error.message ?? 'Unable to load directory right now.',
    };
  }

  const items = (data ?? []) as DirectoryItem[];
  const totalCount = items[0]?.total_count ? Number(items[0].total_count) : 0;
  return { items, totalCount, error: null };
}

function CaseloadView({ caseload }: { caseload: Awaited<ReturnType<typeof fetchStaffCaseload>> }) {
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-2xl border border-border/15 bg-background shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="hidden lg:table-cell">Next step</TableHead>
              <TableHead className="text-right">Open</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {caseload.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.clientName}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant={item.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  {item.nextStep ?? '—'}
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/ops/clients/${item.id}?view=directory`}>Open</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {caseload.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  No assigned caseload yet. Assign clients to yourself from a Visit to build your caseload.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ActivityView({ cases }: { cases: Awaited<ReturnType<typeof fetchStaffCases>> }) {
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-2xl border border-border/15 bg-background shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Case</TableHead>
              <TableHead className="hidden md:table-cell">Person</TableHead>
              <TableHead className="hidden lg:table-cell">Manager</TableHead>
              <TableHead className="hidden lg:table-cell">Priority</TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="text-right">Open</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cases.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="min-w-[220px]">
                  <div className="font-medium text-foreground">{item.caseType ?? 'Support case'}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Case #{item.id.toLocaleString()}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell">#{item.personId?.toLocaleString() ?? '—'}</TableCell>
                <TableCell className="hidden lg:table-cell">{item.caseManagerName}</TableCell>
                <TableCell className="hidden lg:table-cell">{item.priority ?? '—'}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant={item.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                    {item.status ?? 'active'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/ops/clients/${item.personId}?case=${item.id}&view=directory`}>Open</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {cases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  No recent activity. Log outreach, tasks, or Visits to populate the feed.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function labelForView(view: ViewId) {
  if (view === 'directory') return 'Directory';
  if (view === 'caseload') return 'My caseload';
  return 'Activity feed';
}
