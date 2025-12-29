import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import type { SupabaseRSCClient } from '@/lib/supabase/types';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { fetchIncidentById, fetchCfsCallById } from '@/lib/cfs/queries';
import { formatCfsLabel } from '@/lib/cfs/constants';
import { PageHeader } from '@shared/layout/page-header';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { IncidentDetailForm } from '@/components/workspace/incidents/incident-detail-form';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatTimestamp(value?: string | null) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
}

export default async function IncidentDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const incidentId = Number.parseInt(resolvedParams.id, 10);

  if (!Number.isFinite(incidentId)) {
    notFound();
  }

  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase as SupabaseRSCClient);

  if (!access) {
    redirect(`/auth/start?next=/ops/incidents/${incidentId}`);
  }

  if (!access.canAccessCfs) {
    redirect(resolveLandingPath(access));
  }

  const incident = await fetchIncidentById(supabase, incidentId);
  if (!incident) {
    notFound();
  }

  const call = incident.incident_report_id ? await fetchCfsCallById(supabase, incident.incident_report_id) : null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Incidents"
        title={incident.incident_number ?? `Incident ${incident.id}`}
        description={incident.description ?? 'Incident response details'}
        primaryAction={{ label: 'Back to incidents', href: '/ops/incidents' }}
        secondaryAction={incident.incident_report_id ? { label: 'View call', href: `/ops/cfs/${incident.incident_report_id}` } : undefined}
        breadcrumbs={[{ label: 'Calls for service', href: '/ops/cfs' }, { label: 'Incidents', href: '/ops/incidents' }, { label: incident.incident_number ?? `Incident ${incident.id}` }]}
        meta={[
          { label: formatCfsLabel(incident.status ?? 'open'), tone: 'info' },
          { label: incident.dispatch_priority ? formatCfsLabel(incident.dispatch_priority) : 'Priority', tone: 'neutral' },
        ]}
      />

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-xl">Incident summary</CardTitle>
          <CardDescription>High-level overview of the incident and linked call.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Status</p>
            <p className="text-sm font-medium">{formatCfsLabel(incident.status ?? 'open')}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Dispatch priority</p>
            <p className="text-sm font-medium">{incident.dispatch_priority ? formatCfsLabel(incident.dispatch_priority) : '—'}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Dispatch time</p>
            <p className="text-sm font-medium">{formatTimestamp(incident.dispatch_at)}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Location</p>
            <p className="text-sm font-medium">{incident.location ?? '—'}</p>
          </div>
          {call ? (
            <div className="md:col-span-2">
              <Badge variant="outline" className="text-xs uppercase">Linked call</Badge>
              <div className="mt-2 flex items-center justify-between rounded-lg border border-border/60 p-3 text-sm">
                <div>
                  <p className="font-medium">{call.report_number}</p>
                  <p className="text-xs text-muted-foreground">{call.location_text ?? call.reported_location ?? '—'}</p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/ops/cfs/${call.id}`}>Open call</Link>
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <IncidentDetailForm incident={incident} />
    </div>
  );
}
