import Link from 'next/link';
import { loadClientDetailContext } from '@/lib/client-record/loaders';
import { buildClientDetailViewModel, resolveTimelineEventDetail } from '@/lib/client-record/view-model';
import { formatDate, formatDateTime } from '@/lib/formatters/datetime';
import { formatConsentScope, formatConsentStatus } from '@/lib/formatters/consent';
import { formatEnumLabel } from '@/lib/formatters/text';
import { formatTimelineCategoryLabel } from '@/lib/formatters/timeline';
import type { TimelineEvent } from '@/lib/timeline/types';
import { PageHeader } from '@shared/layout/page-header';
import { PageTabNav } from '@shared/layout/page-tab-nav';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Badge } from '@shared/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@shared/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@shared/ui/tabs';
import { CostSnapshotCard } from '@workspace/costs/cost-snapshot-card';
import { CostTimelineTable } from '@workspace/costs/cost-timeline-table';
import { OutreachQuickLogCard } from '@workspace/staff/outreach-quick-log-card';
import { MedicalEpisodesCard } from '@workspace/client-record/medical-episodes-card';
import { JusticeEpisodesCard } from '@workspace/client-record/justice-episodes-card';
import { RelationshipsCard } from '@workspace/client-record/relationships-card';
import { CharacteristicsCard } from '@workspace/client-record/characteristics-card';
import { IdentityCard } from '@workspace/client-record/identity-card';
import { SituationCard } from '@workspace/client-record/situation-card';
import { ProfileCard } from '@workspace/client-record/profile-card';
import { ChevronDown } from 'lucide-react';

type PageProps = { params: Promise<{ id: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> };

export const dynamic = 'force-dynamic';

export default async function OpsClientDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const resolvedSearch = searchParams ? await searchParams : undefined;
  const context = await loadClientDetailContext({ id, searchParams: resolvedSearch });
  const viewModel = buildClientDetailViewModel(context);
  const { data } = context;
  const {
    person,
    consentSummary,
    costEvents,
    costCategories,
    serviceCatalog,
    medicalEpisodes,
    justiceEpisodes,
    relationships,
    characteristics,
    aliases,
    latestIntake,
  } = data;

  const costEventRows = costEvents ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={viewModel.personDisplayName}
        density="compact"
        primaryAction={{ label: viewModel.orgMissing ? 'Select acting org to start Encounter' : 'New Encounter', href: viewModel.newEncounterHref }}
        breadcrumbs={[{ label: 'Clients', href: '/ops/clients?view=directory' }, { label: 'Profile' }]}
        titleAddon={
          <Alert className="w-full border-primary/20 bg-primary/5 px-3 py-2 text-xs shadow-sm sm:w-auto">
            <AlertTitle className="mb-0 text-xs font-semibold uppercase tracking-wide text-primary">
              Active alerts
            </AlertTitle>
            <AlertDescription className="text-xs text-muted-foreground">None reported</AlertDescription>
          </Alert>
        }
      />

      <PageTabNav
        tabs={viewModel.tabs}
        activeHref={viewModel.activeTabHref}
        variant="primary"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  Actions
                  <ChevronDown className="h-4 w-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {viewModel.canLogOutreach ? (
                  <OutreachQuickLogCard
                    variant="sheet"
                    trigger={
                      <DropdownMenuItem disabled={viewModel.orgMissing}>
                        Log outreach
                      </DropdownMenuItem>
                    }
                    personId={person.id}
                    orgMissing={viewModel.orgMissing}
                    showCostFields={viewModel.showCostInputs}
                    staffRoles={viewModel.staffRoleOptions}
                    costCategories={costCategories}
                    serviceCatalog={serviceCatalog}
                  />
                ) : null}
                <DropdownMenuItem asChild>
                  <Link href={viewModel.newEncounterHref}>Add note</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={viewModel.newEncounterHref}>Add referral</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/ops/clients?view=directory">Find another client</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {viewModel.isOverview ? (
        <section className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <IdentityCard person={person} aliases={aliases} canEdit={viewModel.canEditRecord} />
            <SituationCard person={person} intake={latestIntake} canEdit={viewModel.canEditRecord} />
            <ProfileCard person={person} consentLabel={viewModel.consentMeta.label} orgLabel={viewModel.orgLabel} canEdit={viewModel.canEditRecord} />
          </div>

          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">Recent activity</CardTitle>
                <CardDescription>Latest encounters, tasks, and updates tied to this person.</CardDescription>
              </div>
              {viewModel.timelineHref ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={viewModel.timelineHref}>View timeline</Link>
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-2">
              {viewModel.recentEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No timeline events yet. Start an encounter to log the next step.</p>
              ) : (
                viewModel.recentEvents.map((event) => <TimelineEventItem key={event.id} event={event} />)
              )}
            </CardContent>
          </Card>
        </section>
      ) : null}

      {viewModel.isTimeline ? (
        <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <Card>
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-xl">Journey timeline</CardTitle>
                <CardDescription>All encounters, tasks, referrals, supplies, and appointments tied to this person.</CardDescription>
              </div>
              <Tabs value={viewModel.activeFilter} className="w-full">
                <TabsList className="h-auto w-full flex-wrap justify-end gap-1 bg-transparent p-0">
                  {viewModel.timelineFilters.map((filter) => (
                    <TabsTrigger key={filter.id} value={filter.id} className="rounded-full border px-3 py-1 text-xs capitalize">
                      <Link href={filter.href}>{filter.label}</Link>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </CardHeader>
          <CardContent className="space-y-3">
            {viewModel.filteredEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No timeline events yet. Start an encounter to log the next step.</p>
            ) : (
              viewModel.filteredEvents.map((event) => <TimelineEventItem key={event.id} event={event} />)
            )}
            </CardContent>
          </Card>
          <div className="space-y-4">
            <ProfileCard person={person} consentLabel={viewModel.consentMeta.label} orgLabel={viewModel.orgLabel} />
          </div>
        </section>
      ) : null}

      {viewModel.isMedical ? (
        <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <MedicalEpisodesCard personId={person.id} caseId={viewModel.caseIdFromQuery} episodes={medicalEpisodes} formVariant="sheet" canEdit={viewModel.canEditRecord} />
          <ProfileCard person={person} consentLabel={viewModel.consentMeta.label} orgLabel={viewModel.orgLabel} canEdit={viewModel.canEditRecord} />
        </section>
      ) : null}

      {viewModel.isJustice ? (
        <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <JusticeEpisodesCard personId={person.id} caseId={viewModel.caseIdFromQuery} episodes={justiceEpisodes} formVariant="sheet" canEdit={viewModel.canEditRecord} />
          <ProfileCard person={person} consentLabel={viewModel.consentMeta.label} orgLabel={viewModel.orgLabel} canEdit={viewModel.canEditRecord} />
        </section>
      ) : null}

      {viewModel.isRelationships ? (
        <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <RelationshipsCard personId={person.id} caseId={viewModel.caseIdFromQuery} relationships={relationships} formVariant="sheet" canEdit={viewModel.canEditRecord} />
          <ProfileCard person={person} consentLabel={viewModel.consentMeta.label} orgLabel={viewModel.orgLabel} canEdit={viewModel.canEditRecord} />
        </section>
      ) : null}

      {viewModel.isCharacteristics ? (
        <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <CharacteristicsCard personId={person.id} caseId={viewModel.caseIdFromQuery} characteristics={characteristics} formVariant="sheet" canEdit={viewModel.canEditRecord} />
          <ProfileCard person={person} consentLabel={viewModel.consentMeta.label} orgLabel={viewModel.orgLabel} canEdit={viewModel.canEditRecord} />
        </section>
      ) : null}

      {viewModel.isConsents ? (
        <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-4">
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="text-lg">Consent status</CardTitle>
                <CardDescription>Current sharing scope and consent state.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={consentSummary.effectiveStatus === 'active' ? 'secondary' : 'outline'}>
                    {formatConsentStatus(consentSummary.effectiveStatus ?? null)}
                  </Badge>
                  <Badge variant="outline">{formatConsentScope(consentSummary.scope ?? null)}</Badge>
                  {consentSummary.expiresAt ? (
                    <Badge variant="outline">Expires {formatDate(consentSummary.expiresAt)}</Badge>
                  ) : null}
                </div>
                {consentSummary.consent ? (
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs uppercase text-muted-foreground">Captured method</dt>
                      <dd className="font-medium text-foreground">{formatEnumLabel(consentSummary.consent.capturedMethod)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-muted-foreground">Policy version</dt>
                      <dd className="font-medium text-foreground">{consentSummary.consent.policyVersion ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-muted-foreground">Attested</dt>
                      <dd className="font-medium text-foreground">
                        {consentSummary.consent.attestedByStaff ? 'Staff' : '—'} / {consentSummary.consent.attestedByClient ? 'Client' : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-muted-foreground">Last updated</dt>
                      <dd className="font-medium text-foreground">
                        {formatDate(consentSummary.consent.updatedAt ?? consentSummary.consent.createdAt)}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">No consent record on file.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="text-lg">Organization access</CardTitle>
                <CardDescription>Which participating orgs can view shared data.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {viewModel.consentSelections.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No participating organizations found.</p>
                ) : (
                  <div className="space-y-2">
                    {viewModel.consentSelections.map((org) => (
                      <div key={org.id} className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">{org.name ?? `Org ${org.id}`}</p>
                          <p className="text-xs text-muted-foreground">
                            {org.partnershipType ?? org.organizationType ?? 'Partner org'}
                          </p>
                        </div>
                        <Badge variant={org.allowed ? 'secondary' : 'outline'}>
                          {org.allowed ? 'Shared' : 'Not shared'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <ProfileCard person={person} consentLabel={viewModel.consentMeta.label} orgLabel={viewModel.orgLabel} canEdit={viewModel.canEditRecord} />
            {context.access.access.canManageConsents ? (
              <Card className="border-dashed border-border/70">
                <CardHeader>
                  <CardTitle className="text-lg">Record consent</CardTitle>
                  <CardDescription>Capture staff-assisted consent for this client.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild size="sm">
                    <Link href={`/ops/consents/record?person=${person.id}`}>Record consent</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed border-border/70">
                <CardHeader>
                  <CardTitle className="text-lg">Consent requests</CardTitle>
                  <CardDescription>Request or review consent in Ops.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/ops/consents">Open consent requests</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      ) : null}

      {viewModel.isCosts ? (
        <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-4">
            <CostSnapshotCard totals={viewModel.costTotals} />
            <CostTimelineTable events={costEventRows} />
          </div>
          <ProfileCard person={person} consentLabel={viewModel.consentMeta.label} orgLabel={viewModel.orgLabel} canEdit={viewModel.canEditRecord} />
        </section>
      ) : null}
    </div>
  );
}

function TimelineEventItem({ event }: { event: TimelineEvent }) {
  const detail = resolveTimelineEventDetail(event);
  const meta = event.metadata ?? {};
  const observationCategory = event.eventCategory === 'observation' && typeof meta.category === 'string' ? meta.category : null;
  const observationSource = event.eventCategory === 'observation' && typeof meta.source === 'string' ? meta.source : null;
  const observationVerification =
    event.eventCategory === 'observation' && typeof meta.verification_status === 'string'
      ? meta.verification_status
      : null;

  return (
    <article className="rounded-xl border border-border/40 bg-card p-2.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{event.summary ?? 'Timeline update'}</p>
          <p className="text-xs text-muted-foreground capitalize">{formatTimelineCategoryLabel(event.eventCategory)}</p>
          {detail ? (
            <p className="text-xs text-foreground/80">{detail}</p>
          ) : null}
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>{formatDateTime(event.eventAt)}</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
        {event.createdByOrg ? <Badge variant="outline">Created by {event.createdByOrg}</Badge> : null}
        {observationCategory ? <Badge variant="outline">{formatEnumLabel(observationCategory)}</Badge> : null}
        {observationSource ? <Badge variant="outline">{formatEnumLabel(observationSource)}</Badge> : null}
        {observationVerification ? <Badge variant="outline">{formatEnumLabel(observationVerification)}</Badge> : null}
        <Badge variant={event.visibilityScope === 'shared_via_consent' ? 'secondary' : 'outline'}>
          {event.visibilityScope === 'shared_via_consent' ? 'Shared' : 'Internal'}
        </Badge>
        {event.sensitivityLevel !== 'standard' ? <Badge variant="destructive">{event.sensitivityLevel}</Badge> : null}
      </div>
    </article>
  );
}
