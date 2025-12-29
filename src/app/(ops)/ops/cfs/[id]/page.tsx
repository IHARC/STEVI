import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import type { SupabaseRSCClient } from '@/lib/supabase/types';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import {
  fetchCfsCallById,
  fetchCfsTimeline,
  fetchCfsOrgAccess,
  fetchIncidentByCfsId,
  fetchOrganizationsForSharing,
  fetchOrganizationById,
  fetchCfsPublicTrackingByCfsId,
  fetchCfsAttachments,
} from '@/lib/cfs/queries';
import { formatCfsLabel, formatReportStatus, CFS_STATUS_TONES } from '@/lib/cfs/constants';
import { PageHeader } from '@shared/layout/page-header';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { EmptyState } from '@shared/ui/empty-state';
import { CfsDetailActions } from '@/components/workspace/cfs/cfs-detail-actions';
import { CfsAttachmentsCard, type CfsAttachmentItem } from '@/components/workspace/cfs/cfs-attachments-card';

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

async function hydrateAttachments(
  supabase: Awaited<ReturnType<typeof createSupabaseRSCClient>>,
  attachments: Array<{
    id: string;
    file_name: string;
    file_type: string | null;
    file_size: number | null;
    created_at: string;
    storage_bucket: string;
    storage_path: string;
  }>,
): Promise<CfsAttachmentItem[]> {
  return Promise.all(
    attachments.map(async (attachment) => {
      const { data } = await supabase.storage
        .from(attachment.storage_bucket)
        .createSignedUrl(attachment.storage_path, 60 * 60);

      return {
        id: attachment.id,
        file_name: attachment.file_name,
        file_type: attachment.file_type,
        file_size: attachment.file_size,
        created_at: attachment.created_at,
        signedUrl: data?.signedUrl ?? null,
      };
    }),
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

export default async function CfsDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const cfsId = Number.parseInt(resolvedParams.id, 10);

  if (!Number.isFinite(cfsId)) {
    notFound();
  }

  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase as SupabaseRSCClient);

  if (!access) {
    redirect(`/auth/start?next=/ops/cfs/${cfsId}`);
  }

  if (!access.canAccessCfs) {
    redirect(resolveLandingPath(access));
  }

  const [call, timeline, sharedAccess, incident, publicTracking, attachments] = await Promise.all([
    fetchCfsCallById(supabase, cfsId),
    fetchCfsTimeline(supabase, cfsId),
    fetchCfsOrgAccess(supabase, cfsId),
    fetchIncidentByCfsId(supabase, cfsId),
    fetchCfsPublicTrackingByCfsId(supabase, cfsId),
    fetchCfsAttachments(supabase, cfsId),
  ]);

  if (!call) {
    notFound();
  }

  const [owningOrg, reportingOrg, referringOrg] = await Promise.all([
    fetchOrganizationById(supabase, call.owning_organization_id),
    fetchOrganizationById(supabase, call.reporting_organization_id),
    fetchOrganizationById(supabase, call.referring_organization_id),
  ]);

  const attachmentItems = await hydrateAttachments(supabase, attachments);

  const organizations = access.canShareCfs || access.canDispatchCfs ? await fetchOrganizationsForSharing(supabase) : [];

  const statusTone = CFS_STATUS_TONES[call.status ?? 'received'];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Calls for service"
        title={call.report_number}
        description={call.initial_report_narrative}
        primaryAction={{ label: 'Back to queue', href: '/ops/cfs' }}
        secondaryAction={incident ? { label: 'View incident', href: `/ops/incidents/${incident.id}` } : undefined}
        breadcrumbs={[{ label: 'Calls for service', href: '/ops/cfs' }, { label: call.report_number }]}
        meta={[
          { label: formatCfsLabel(call.status ?? 'received'), tone: statusTone },
          { label: formatCfsLabel(call.report_priority_assessment), tone: 'warning' },
          { label: call.public_tracking_enabled ? 'Public tracking' : 'Internal only', tone: call.public_tracking_enabled ? 'info' : 'neutral' },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-xl">Call summary</CardTitle>
              <CardDescription>Key context for triage and dispatch decisions.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <DetailItem label="Status" value={formatCfsLabel(call.status ?? 'received')} />
              <DetailItem label="Report status" value={formatReportStatus(call.report_status)} />
              <DetailItem label="Priority" value={formatCfsLabel(call.report_priority_assessment)} />
              <DetailItem label="Type hint" value={call.type_hint ? formatCfsLabel(call.type_hint) : '—'} />
              <DetailItem label="Source" value={call.source ? formatCfsLabel(call.source) : '—'} />
              <DetailItem label="Report method" value={formatCfsLabel(call.report_method)} />
              <DetailItem label="Received" value={formatTimestamp(call.report_received_at)} />
              <DetailItem label="Entered" value={formatTimestamp(call.received_at)} />
              <DetailItem label="Owning org" value={owningOrg?.name ?? '—'} />
              <DetailItem label="Reporting org" value={reportingOrg?.name ?? '—'} />
              <DetailItem label="Referring org" value={referringOrg?.name ?? '—'} />
              <DetailItem label="Report number" value={call.report_number} />
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-xl">Location</CardTitle>
              <CardDescription>Reported location data for dispatch and situational awareness.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <DetailItem label="Location description" value={call.location_text ?? '—'} />
              <DetailItem label="Reported location" value={call.reported_location ?? '—'} />
              <DetailItem label="Coordinates" value={call.reported_coordinates ?? '—'} />
              <DetailItem label="Confidence" value={call.location_confidence ?? '—'} />
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-xl">Reporter</CardTitle>
              <CardDescription>Contact details and reporter context (if provided).</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <DetailItem label="Reporter" value={call.anonymous_reporter ? 'Anonymous' : call.reporter_name ?? '—'} />
              <DetailItem label="Relationship" value={call.reporter_relationship ?? '—'} />
              <DetailItem label="Phone" value={call.reporter_phone ?? '—'} />
              <DetailItem label="Email" value={call.reporter_email ?? '—'} />
              <DetailItem label="Address" value={call.reporter_address ?? '—'} />
              <DetailItem label="Reporting person ID" value={call.reporting_person_id ? String(call.reporting_person_id) : '—'} />
              {call.anonymous_reporter && call.anonymous_reporter_details ? (
                <div className="md:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Anonymous details</p>
                  <p className="text-sm text-foreground">{call.anonymous_reporter_details}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-xl">Timeline</CardTitle>
              <CardDescription>Operational timeline of the call.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {timeline.length === 0 ? (
                <EmptyState title="No timeline entries" description="Timeline activity will appear as staff triage and resolve the call." />
              ) : (
                <div className="space-y-3">
                  {timeline.map((entry) => (
                    <div key={entry.id} className="rounded-lg border border-border/60 p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs uppercase">{formatCfsLabel(entry.phase)}</Badge>
                          <Badge variant="secondary" className="text-xs uppercase">{formatCfsLabel(entry.phase_status ?? 'completed')}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{formatTimestamp(entry.phase_started_at)}</span>
                      </div>
                      {entry.phase_notes ? <p className="mt-2 text-foreground">{entry.phase_notes}</p> : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <CfsAttachmentsCard
            cfsId={call.id}
            attachments={attachmentItems}
            canUpload={access.canUpdateCfs}
            canDelete={access.canDeleteCfs}
          />
        </div>

        <div className="space-y-6">
          <CfsDetailActions
            cfsId={call.id}
            status={call.status}
            reportPriority={call.report_priority_assessment}
            reportStatus={call.report_status}
            typeHint={call.type_hint}
            priorityHint={call.priority_hint}
            verificationStatus={call.verification_status}
            verificationMethod={call.verification_method}
            verificationNotes={call.verification_notes}
            publicTrackingEnabled={call.public_tracking_enabled}
            publicTrackingId={call.public_tracking_id}
            publicTrackingCategory={publicTracking?.category ?? null}
            publicTrackingLocation={publicTracking?.public_location_area ?? null}
            publicTrackingSummary={publicTracking?.public_summary ?? null}
            incidentId={incident?.id ?? null}
            canTriage={access.canTriageCfs}
            canUpdate={access.canUpdateCfs}
            canDispatch={access.canDispatchCfs}
            canShare={access.canShareCfs}
            canPublicTrack={access.canPublicTrackCfs}
            organizations={organizations}
            sharedAccess={sharedAccess.map((entry) => ({
              organization_id: entry.organization_id,
              access_level: entry.access_level,
              is_active: entry.is_active,
            }))}
          />

          {call.notify_opt_in ? (
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="text-lg">Notifications</CardTitle>
                <CardDescription>Reporter opted in to updates.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-foreground">
                <p>Channel: {call.notify_channel ?? 'none'}</p>
                <p>Target: {call.notify_target ?? '—'}</p>
              </CardContent>
            </Card>
          ) : null}

          {call.public_tracking_enabled && call.public_tracking_id ? (
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="text-lg">Public tracking link</CardTitle>
                <CardDescription>Share this link with the reporter for status updates.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="font-medium">Tracking ID: {call.public_tracking_id}</p>
                <Button asChild variant="outline">
                  <Link href={`/track/${call.public_tracking_id}`} target="_blank">Open public tracker</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
