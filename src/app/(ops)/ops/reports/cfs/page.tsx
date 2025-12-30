import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import type { SupabaseRSCClient } from '@/lib/supabase/types';
import { loadPortalAccess, assertOrganizationSelected } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { fetchCfsSlaRows, type CfsSlaRow } from '@/lib/cfs/queries';
import { formatCfsLabel } from '@/lib/cfs/constants';
import { PageHeader } from '@shared/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/ui/table';

export const dynamic = 'force-dynamic';

function formatMinutes(value: number | null) {
  if (!value && value !== 0) return '—';
  if (value < 60) return `${Math.round(value)} min`;
  const hours = value / 60;
  if (hours < 24) return `${hours.toFixed(1)} hr`;
  const days = hours / 24;
  return `${days.toFixed(1)} days`;
}

function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) return '—';
  return `${Math.round(value * 100)}%`;
}

function average(values: Array<number | null>) {
  const filtered = values.filter((value): value is number => typeof value === 'number' && !Number.isNaN(value));
  if (!filtered.length) return null;
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function rate(numerator: number, denominator: number) {
  if (!denominator) return null;
  return numerator / denominator;
}

function buildSummary(rows: CfsSlaRow[]) {
  const triageRows = rows.filter((row) => typeof row.triage_minutes === 'number');
  const dispatchRows = rows.filter((row) => typeof row.dispatch_minutes === 'number');
  const resolutionRows = rows.filter((row) => typeof row.resolution_minutes === 'number');

  return {
    totalCalls: rows.length,
    avgTriage: average(rows.map((row) => row.triage_minutes)),
    avgDispatch: average(rows.map((row) => row.dispatch_minutes)),
    avgResolution: average(rows.map((row) => row.resolution_minutes)),
    triageMet: rate(triageRows.filter((row) => row.triage_met).length, triageRows.length),
    dispatchMet: rate(dispatchRows.filter((row) => row.dispatch_met).length, dispatchRows.length),
    resolutionMet: rate(resolutionRows.filter((row) => row.resolution_met).length, resolutionRows.length),
  };
}

export default async function CfsReportsPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase as SupabaseRSCClient);

  if (!access) {
    redirect('/auth/start?next=/ops/reports/cfs');
  }

  if (!access.canAccessCfs) {
    redirect(resolveLandingPath(access));
  }

  assertOrganizationSelected(access, 'Select an organization to view reports.');

  const since = new Date();
  since.setDate(since.getDate() - 90);

  const rows = await fetchCfsSlaRows(supabase, access.organizationId, since.toISOString(), 500);
  const summary = buildSummary(rows);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reports"
        title="CFS performance"
        description="Track triage, dispatch, and resolution performance for the last 90 days."
        breadcrumbs={[{ label: 'Operations', href: '/ops/today' }, { label: 'Reports' }, { label: 'CFS' }]}
        meta={[{ label: `Organization: ${access.organizationName ?? `#${access.organizationId}`}`, tone: 'neutral' }]}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase text-muted-foreground">Total calls</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{summary.totalCalls}</p>
            <p className="text-xs text-muted-foreground">Last 90 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase text-muted-foreground">Avg triage</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">{formatMinutes(summary.avgTriage)}</p>
            <p className="text-xs text-muted-foreground">SLA met: {formatPercent(summary.triageMet)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase text-muted-foreground">Avg dispatch</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">{formatMinutes(summary.avgDispatch)}</p>
            <p className="text-xs text-muted-foreground">SLA met: {formatPercent(summary.dispatchMet)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase text-muted-foreground">Avg resolution</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">{formatMinutes(summary.avgResolution)}</p>
            <p className="text-xs text-muted-foreground">SLA met: {formatPercent(summary.resolutionMet)}</p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-xl">Recent calls</CardTitle>
          <CardDescription>Shows recent calls with SLA targets and status.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No calls found for this period.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Triage</TableHead>
                  <TableHead>Dispatch</TableHead>
                  <TableHead>Resolution</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 20).map((row) => (
                  <TableRow key={row.cfs_id}>
                    <TableCell className="font-medium">{row.report_number}</TableCell>
                    <TableCell>{formatCfsLabel(row.report_priority_assessment)}</TableCell>
                    <TableCell>
                      <span className="uppercase">
                        {formatCfsLabel(row.status ?? 'received')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatMinutes(row.triage_minutes)}</div>
                      <div className="text-xs text-muted-foreground">
                        Target: {formatMinutes(row.triage_target_minutes)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatMinutes(row.dispatch_minutes)}</div>
                      <div className="text-xs text-muted-foreground">
                        Target: {formatMinutes(row.dispatch_target_minutes)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatMinutes(row.resolution_minutes)}</div>
                      <div className="text-xs text-muted-foreground">
                        Target: {formatMinutes(row.resolution_target_minutes)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
