import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { toSearchParams, normalizeEnumParam } from '@/lib/search-params';
import { fetchCfsQueue } from '@/lib/cfs/queries';
import {
  CFS_SOURCE_OPTIONS,
  CFS_STATUS_OPTIONS,
  CFS_STATUS_TONES,
  REPORT_PRIORITY_OPTIONS,
  formatCfsLabel,
} from '@/lib/cfs/constants';
import { PageHeader } from '@shared/layout/page-header';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Card, CardContent } from '@shared/ui/card';
import { EmptyState } from '@shared/ui/empty-state';
import { Input } from '@shared/ui/input';
import { NativeSelect } from '@shared/ui/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/ui/table';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const STATUS_FILTERS = ['all', ...CFS_STATUS_OPTIONS] as const;
const PRIORITY_FILTERS = ['all', ...REPORT_PRIORITY_OPTIONS] as const;
const SOURCE_FILTERS = ['all', ...CFS_SOURCE_OPTIONS] as const;
const SCOPE_FILTERS = ['all', 'owned', 'shared'] as const;

function formatTimestamp(value?: string | null) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
}

export default async function CfsQueuePage({ searchParams }: PageProps) {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/auth/start?next=/ops/cfs');
  }

  if (!access.canAccessCfs) {
    redirect(resolveLandingPath(access));
  }

  const resolvedParams = searchParams ? await searchParams : undefined;
  const params = toSearchParams(resolvedParams);
  const { value: statusFilter, redirected: statusRedirect } = normalizeEnumParam(params, 'status', STATUS_FILTERS, 'all');
  const { value: priorityFilter, redirected: priorityRedirect } = normalizeEnumParam(params, 'priority', PRIORITY_FILTERS, 'all');
  const { value: sourceFilter, redirected: sourceRedirect } = normalizeEnumParam(params, 'source', SOURCE_FILTERS, 'all');
  const { value: scopeFilter, redirected: scopeRedirect } = normalizeEnumParam(params, 'scope', SCOPE_FILTERS, 'all');

  if (statusRedirect || priorityRedirect || sourceRedirect || scopeRedirect) {
    redirect(`/ops/cfs?${params.toString()}`);
  }

  const searchQuery = params.get('search');

  const queue = await fetchCfsQueue(supabase, {
    status: statusFilter,
    priority: priorityFilter,
    source: sourceFilter,
    ownerScope: scopeFilter,
    organizationId: access.organizationId,
    search: searchQuery,
  });

  const orgMissing = !access.organizationId;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Calls for service"
        description="Track outreach requests, triage community reports, and coordinate dispatch across partner teams."
        primaryAction={{ label: 'New call', href: '/ops/cfs/new' }}
        secondaryAction={{ label: 'Today', href: '/ops/today' }}
        breadcrumbs={[{ label: 'Today', href: '/ops/today' }, { label: 'Calls for service' }]}
        meta={[
          { label: orgMissing ? 'Org required' : access.organizationName ?? 'Organization', tone: orgMissing ? 'warning' : 'neutral' },
          { label: `${queue.length} active`, tone: 'info' },
        ]}
      />

      {orgMissing ? (
        <EmptyState
          title="Select an acting organization"
          description="Calls for service are tied to an organization. Choose an acting org before dispatching or sharing calls."
          action={
            <Button asChild>
              <Link href="/ops/profile">Select organization</Link>
            </Button>
          }
        />
      ) : null}

      <Card className="border-border/70">
        <CardContent className="space-y-4">
          <form className="grid gap-3 md:grid-cols-5" method="get">
            <div className="md:col-span-2">
              <Input name="search" placeholder="Search report # or location" defaultValue={searchQuery ?? ''} />
            </div>
            <NativeSelect name="status" defaultValue={statusFilter}>
              {STATUS_FILTERS.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? 'All statuses' : formatCfsLabel(option)}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect name="priority" defaultValue={priorityFilter}>
              {PRIORITY_FILTERS.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? 'All priorities' : formatCfsLabel(option)}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect name="source" defaultValue={sourceFilter}>
              {SOURCE_FILTERS.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? 'All sources' : formatCfsLabel(option)}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect name="scope" defaultValue={scopeFilter}>
              {SCOPE_FILTERS.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? 'All access' : option === 'owned' ? 'Owned by my org' : 'Shared with my org'}
                </option>
              ))}
            </NativeSelect>
            <div className="md:col-span-5 flex justify-end">
              <Button type="submit" variant="outline">Apply filters</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {queue.length === 0 ? (
        <EmptyState
          title="No calls found"
          description="Adjust filters or create a new call to start tracking outreach requests."
          action={
            <Button asChild>
              <Link href="/ops/cfs/new">Create call</Link>
            </Button>
          }
        />
      ) : (
        <Card className="border-border/70">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Owner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queue.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Link href={`/ops/cfs/${item.id}`} className="font-semibold text-foreground hover:underline">
                        {item.report_number}
                      </Link>
                      <div className="text-xs text-muted-foreground">{item.report_status ? formatCfsLabel(item.report_status) : 'Active'}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs uppercase ${CFS_STATUS_TONES[item.status ?? 'received'] === 'success' ? 'border-success/40 text-success' : CFS_STATUS_TONES[item.status ?? 'received'] === 'warning' ? 'border-warning/40 text-warning' : CFS_STATUS_TONES[item.status ?? 'received'] === 'info' ? 'border-info/40 text-info' : 'border-border text-muted-foreground'}`}>
                        {formatCfsLabel(item.status ?? 'received')}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCfsLabel(item.report_priority_assessment)}</TableCell>
                    <TableCell>{item.type_hint ? formatCfsLabel(item.type_hint) : '—'}</TableCell>
                    <TableCell className="max-w-[220px] truncate">{item.location_text ?? item.reported_location ?? '—'}</TableCell>
                    <TableCell>{item.source ? formatCfsLabel(item.source) : '—'}</TableCell>
                    <TableCell>{formatTimestamp(item.report_received_at)}</TableCell>
                    <TableCell>{item.owning_organization_name ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
