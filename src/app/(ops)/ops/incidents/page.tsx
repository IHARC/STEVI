import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { fetchIncidentsList } from '@/lib/cfs/queries';
import { formatCfsLabel } from '@/lib/cfs/constants';
import { PageHeader } from '@shared/layout/page-header';
import { Button } from '@shared/ui/button';
import { Card, CardContent } from '@shared/ui/card';
import { EmptyState } from '@shared/ui/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/ui/table';

export const dynamic = 'force-dynamic';

function formatTimestamp(value?: string | null) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
}

export default async function IncidentsPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/auth/start?next=/ops/incidents');
  }

  if (!access.canAccessCfs) {
    redirect(resolveLandingPath(access));
  }

  const incidents = await fetchIncidentsList(supabase);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Incidents"
        description="Field response records created from calls for service."
        primaryAction={{ label: 'Back to CFS', href: '/ops/cfs' }}
        secondaryAction={{ label: 'New call', href: '/ops/cfs/new' }}
        breadcrumbs={[{ label: 'Calls for service', href: '/ops/cfs' }, { label: 'Incidents' }]}
        meta={[{ label: `${incidents.length} incidents`, tone: 'info' }]}
      />

      {incidents.length === 0 ? (
        <EmptyState
          title="No incidents yet"
          description="Convert a call for service to create an incident record."
          action={
            <Button asChild>
              <Link href="/ops/cfs">Open CFS queue</Link>
            </Button>
          }
        />
      ) : (
        <Card className="border-border/70">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Incident</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Dispatched</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Linked call</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.map((incident) => (
                  <TableRow key={incident.id}>
                    <TableCell>
                      <Link href={`/ops/incidents/${incident.id}`} className="font-semibold text-foreground hover:underline">
                        {incident.incident_number ?? `Incident ${incident.id}`}
                      </Link>
                      <div className="text-xs text-muted-foreground">{formatTimestamp(incident.created_at)}</div>
                    </TableCell>
                    <TableCell>{formatCfsLabel(incident.status ?? 'open')}</TableCell>
                    <TableCell>{incident.incident_type ? formatCfsLabel(incident.incident_type) : '—'}</TableCell>
                    <TableCell>{incident.dispatch_priority ? formatCfsLabel(incident.dispatch_priority) : '—'}</TableCell>
                    <TableCell>{formatTimestamp(incident.dispatch_at)}</TableCell>
                    <TableCell className="max-w-[220px] truncate">{incident.location ?? '—'}</TableCell>
                    <TableCell>
                      {incident.incident_report_id ? (
                        <Link href={`/ops/cfs/${incident.incident_report_id}`} className="text-sm text-primary hover:underline">
                          View call
                        </Link>
                      ) : (
                        '—'
                      )}
                    </TableCell>
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
