import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { getPolicyBySlug } from '@/lib/policies';
import { getEffectiveConsent, listConsentOrgs, listParticipatingOrganizations, resolveConsentOrgSelections } from '@/lib/consents';
import { logAuditEvent } from '@/lib/audit';
import { PageHeader } from '@shared/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Button } from '@shared/ui/button';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';
import { ConsentCaptureForm } from '@/components/ops/consents/consent-capture-form';
import { recordStaffConsentAction } from '../actions';

export const dynamic = 'force-dynamic';

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

type PersonNameRow = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  person_type: string | null;
  last_service_month: string | null;
};

type PendingRequestRow = {
  id: string;
  requested_at: string;
  status: string;
};

export default async function OpsConsentRecordPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const qRaw = params.q;
  const personRaw = params.person;
  const q = Array.isArray(qRaw) ? qRaw[0] : qRaw ?? '';
  const personParam = Array.isArray(personRaw) ? personRaw[0] : personRaw ?? '';
  const searchTerm = q.trim();
  const selectedPersonId = parsePersonId(personParam);
  const numericId = /^\d+$/.test(searchTerm) ? Number.parseInt(searchTerm, 10) : null;

  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canManageConsents) {
    redirect(resolveLandingPath(access));
  }

  const orgMissing = !access.organizationId;
  const core = supabase.schema('core');

  let searchError: string | null = null;
  let people: PersonNameRow[] = [];

  if (searchTerm) {
    if (!numericId && searchTerm.length < 2) {
      searchError = 'Search term must be at least 2 characters for privacy.';
    } else {
      let query = core
        .from('people_name_only')
        .select('id, first_name, last_name, person_type, last_service_month')
        .order('last_name')
        .limit(12);

      if (numericId) {
        query = query.eq('id', numericId);
      } else {
        query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) {
        searchError = error.message ?? 'Unable to search right now.';
      } else {
        people = (data ?? []) as PersonNameRow[];
      }
    }
  }

  if (searchTerm && !searchError) {
    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'consent_search',
      entityType: 'core.people_name_only',
      entityRef: null,
      meta: {
        reason: 'staff_assisted',
        search_type: numericId ? 'id' : 'name',
        search_term_length: searchTerm.length,
        result_count: people.length,
        organization_id: access.organizationId,
      },
    });
  }

  let selectedPerson: PersonNameRow | null = null;
  let consentScope: 'all_orgs' | 'selected_orgs' | 'none' = 'all_orgs';
  let orgSelections: ReturnType<typeof resolveConsentOrgSelections>['selections'] = [];
  let consentStatus: string | null = null;
  let consentExpiresAt: string | null = null;
  let pendingRequest: PendingRequestRow | null = null;
  const privacyPolicy = await getPolicyBySlug('client-privacy-notice');
  const policyVersion = privacyPolicy?.updatedAt ?? null;

  if (selectedPersonId) {
    const { data, error } = await core
      .from('people_name_only')
      .select('id, first_name, last_name, person_type, last_service_month')
      .eq('id', selectedPersonId)
      .maybeSingle();

    if (!error && data) {
      selectedPerson = data as PersonNameRow;

      const [effective, orgs] = await Promise.all([
        getEffectiveConsent(supabase, selectedPersonId),
        listParticipatingOrganizations(supabase, { excludeOrgId: access.iharcOrganizationId }),
      ]);

      consentScope = effective.consent?.scope ?? 'all_orgs';
      consentStatus = effective.effectiveStatus ?? null;
      consentExpiresAt = effective.expiresAt ?? null;

      const consentOrgs = effective.consent ? await listConsentOrgs(supabase, effective.consent.id) : [];
      orgSelections = resolveConsentOrgSelections(consentScope, orgs, consentOrgs).selections;

      if (access.organizationId) {
        const { data: requestRow } = await core
          .from('person_consent_requests')
          .select('id, requested_at, status')
          .eq('person_id', selectedPersonId)
          .eq('requesting_org_id', access.organizationId)
          .eq('status', 'pending')
          .order('requested_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        pendingRequest = (requestRow as PendingRequestRow | null) ?? null;
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Record consent"
        description="Capture consent with the client present. This updates sharing immediately and is fully auditable."
        breadcrumbs={[{ label: 'Operations', href: '/ops/today' }, { label: 'Consents', href: '/ops/consents' }, { label: 'Record consent' }]}
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link href="/ops/consents">Back to requests</Link>
          </Button>
        }
      />

      {orgMissing ? (
        <Alert variant="destructive">
          <AlertTitle>Acting organization required</AlertTitle>
          <AlertDescription>Select an acting organization in Ops Profile before recording consent.</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Find a person</CardTitle>
            <CardDescription>Search by name or ID. Name searches require at least 2 characters.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="flex flex-wrap gap-2" method="get">
              <Label htmlFor="consent-record-search" className="sr-only">
                Search term
              </Label>
              <Input
                id="consent-record-search"
                name="q"
                defaultValue={searchTerm}
                placeholder="Search by name or ID"
                className="min-w-[220px] flex-1"
              />
              <Button type="submit" variant="secondary">
                Search
              </Button>
            </form>

            {searchError ? (
              <Alert variant="destructive">
                <AlertTitle>Search error</AlertTitle>
                <AlertDescription>{searchError}</AlertDescription>
              </Alert>
            ) : null}

            {!searchTerm ? (
              <p className="text-sm text-muted-foreground">Enter a name or ID to record consent.</p>
            ) : null}

            {people.length === 0 && searchTerm && !searchError ? (
              <p className="text-sm text-muted-foreground">No matches found.</p>
            ) : null}

            <div className="space-y-4">
              {people.map((person) => {
                const name = `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim() || `Person ${person.id}`;
                return (
                  <Card key={person.id} className="border-border/40">
                    <CardHeader className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base">{name}</CardTitle>
                        <span>ID {person.id}</span>
                      </div>
                      <CardDescription>
                        {person.person_type ? `Type: ${person.person_type.replace(/_/g, ' ')}` : 'Client record'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button asChild className="w-full" variant="outline">
                        <Link href={`/ops/consents/record?person=${person.id}`}>Record consent</Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Consent capture</CardTitle>
            <CardDescription>Use this form when the client is present in person or on the phone.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedPerson ? (
              <p className="text-sm text-muted-foreground">Select a person to record consent.</p>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border/40 bg-muted/30 p-3 text-sm">
                  <p className="font-semibold text-foreground">
                    {`${selectedPerson.first_name ?? ''} ${selectedPerson.last_name ?? ''}`.trim() || `Person ${selectedPerson.id}`}
                  </p>
                  <p className="text-muted-foreground">ID {selectedPerson.id}</p>
                  {selectedPerson.last_service_month ? (
                    <p className="text-muted-foreground">Last service: {selectedPerson.last_service_month}</p>
                  ) : null}
                </div>

                {pendingRequest ? (
                  <Alert>
                    <AlertTitle>Pending request on file</AlertTitle>
                    <AlertDescription>
                      Recording consent will automatically approve the pending request from your organization.
                    </AlertDescription>
                  </Alert>
                ) : null}

                {consentStatus ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span>
                      {consentStatus}
                    </span>
                    {consentExpiresAt ? <span className="text-xs text-muted-foreground">Expires {formatDate(consentExpiresAt)}</span> : null}
                  </div>
                ) : null}

                {orgMissing ? (
                  <Alert variant="destructive">
                    <AlertTitle>Acting organization required</AlertTitle>
                    <AlertDescription>Select an acting organization before submitting consent.</AlertDescription>
                  </Alert>
                ) : (
                  <ConsentCaptureForm
                    personId={selectedPerson.id}
                    consentScope={consentScope}
                    orgSelections={orgSelections}
                    policyVersion={policyVersion}
                    action={recordStaffConsentAction}
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function parsePersonId(raw: string | undefined): number | null {
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return null;
  return parsed;
}

function formatDate(value: string | null) {
  if (!value) return 'Unknown';
  try {
    return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return value;
  }
}
