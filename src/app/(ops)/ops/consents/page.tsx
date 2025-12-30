import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { consentAllowsOrg } from '@/lib/consents';
import { logAuditEvent } from '@/lib/audit';
import { PageHeader } from '@shared/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Input } from '@shared/ui/input';
import { Textarea } from '@shared/ui/textarea';
import { Button } from '@shared/ui/button';
import { Label } from '@shared/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';
import { requestConsentAction, logConsentContactAction } from './actions';

export const dynamic = 'force-dynamic';

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

type PersonNameRow = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  person_type: string | null;
  last_service_month: string | null;
};

type PersonNameLookupRow = {
  id: number;
  first_name: string | null;
  last_name: string | null;
};

type RequestStatusRow = {
  id: string;
  person_id: number;
  requested_at: string;
  status: string;
  decision_at: string | null;
  expires_at: string | null;
};

export default async function OpsConsentRequestsPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const qRaw = params.q;
  const reasonRaw = params.reason;
  const q = Array.isArray(qRaw) ? qRaw[0] : qRaw ?? '';
  const reasonValue = Array.isArray(reasonRaw) ? reasonRaw[0] : reasonRaw ?? '';
  const searchTerm = q.trim();
  const numericId = /^\d+$/.test(searchTerm) ? Number.parseInt(searchTerm, 10) : null;
  const reason = reasonValue === 'consent_request' || reasonValue === 'service_contact' ? reasonValue : null;

  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || (!access.canAccessOpsFrontline && !access.canAccessOpsOrg && !access.canManageConsents && !access.canAccessOpsAdmin)) {
    redirect(resolveLandingPath(access));
  }

  const orgMissing = !access.organizationId;

  const core = supabase.schema('core');
  const { data: requestRows, error: requestError } = await core
    .from('person_consent_requests_status')
    .select('id, person_id, requested_at, status, decision_at, expires_at')
    .order('requested_at', { ascending: false })
    .limit(25);

  if (requestError) {
    throw requestError;
  }

  const requestStatuses = (requestRows ?? []) as RequestStatusRow[];
  const requestPersonIds = Array.from(new Set(requestStatuses.map((row) => row.person_id)));

  let requestNames = new Map<number, string>();
  if (requestPersonIds.length > 0) {
    const { data: nameRows, error: nameError } = await core
      .from('people_name_only')
      .select('id, first_name, last_name')
      .in('id', requestPersonIds);

    if (nameError) {
      throw nameError;
    }

    const safeNameRows = (nameRows ?? []) as PersonNameLookupRow[];
    safeNameRows.forEach((row) => {
      const name = `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim();
      requestNames.set(Number(row.id), name || `Person ${row.id}`);
    });
  }

  let searchError: string | null = null;
  let people: PersonNameRow[] = [];

  if (searchTerm) {
    if (!reason) {
      searchError = 'Select a reason for searching before continuing.';
    } else if (!numericId && searchTerm.length < 2) {
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

  if (searchTerm && reason && !searchError) {
    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'consent_search',
      entityType: 'core.people_name_only',
      entityRef: null,
      meta: {
        reason,
        search_type: numericId ? 'id' : 'name',
        search_term_length: searchTerm.length,
        result_count: people.length,
        organization_id: access.organizationId,
      },
    });
  }

  const consentAllowed = new Map<number, boolean>();
  if (access.organizationId && people.length > 0) {
    const results = await Promise.all(
      people.map(async (person) => [person.id, await consentAllowsOrg(supabase, person.id, access.organizationId)] as const),
    );
    results.forEach(([personId, allowed]) => consentAllowed.set(personId, allowed));
  }

  const pendingRequestByPerson = new Map<number, RequestStatusRow>();
  requestStatuses
    .filter((row) => row.status === 'pending')
    .forEach((row) => pendingRequestByPerson.set(row.person_id, row));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Consent requests"
        description="Find a person by name and request consent to share their record with your organization."
        breadcrumbs={[{ label: 'Operations', href: '/ops/today' }, { label: 'Consent requests' }]}
      />

      {orgMissing ? (
        <Alert variant="destructive">
          <AlertTitle>Acting organization required</AlertTitle>
          <AlertDescription>Select an acting organization in Ops Profile before requesting consent.</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Find a person</CardTitle>
            <CardDescription>Search by name or ID. Name searches require at least 2 characters.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="flex flex-wrap gap-2" method="get">
              <Label htmlFor="consent-search-term" className="sr-only">
                Search term
              </Label>
              <Input
                id="consent-search-term"
                name="q"
                defaultValue={searchTerm}
                placeholder="Search by name or ID"
                className="min-w-[220px] flex-1"
              />
              <Label htmlFor="consent-search-reason" className="sr-only">
                Reason for search
              </Label>
              <select
                id="consent-search-reason"
                name="reason"
                defaultValue={reason ?? ''}
                required
                className="h-9 min-w-[200px] rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="" disabled>
                  Select reason
                </option>
                <option value="consent_request">Consent request</option>
                <option value="service_contact">Service contact</option>
              </select>
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
              <p className="text-sm text-muted-foreground">Enter a name or ID to start a consent request.</p>
            ) : null}

            {people.length === 0 && searchTerm && !searchError ? (
              <p className="text-sm text-muted-foreground">No matches found.</p>
            ) : null}

            <div className="space-y-4">
              {people.map((person) => {
                const name = `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim() || `Person ${person.id}`;
                const allowed = consentAllowed.get(person.id) ?? false;
                const pending = pendingRequestByPerson.get(person.id);
                return (
                  <Card key={person.id} className="border-border/40">
                    <CardHeader className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base">{name}</CardTitle>
                        <span>ID {person.id}</span>
                        {allowed ? <span>Consent active</span> : null}
                        {pending ? <span>Request pending</span> : null}
                      </div>
                      <CardDescription>
                        {person.person_type ? `Type: ${person.person_type.replace(/_/g, ' ')}` : 'Client record'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 lg:grid-cols-2">
                      <Button asChild variant="outline" className="lg:col-span-2">
                        <Link href={`/ops/consents/record?person=${person.id}`}>Record consent with client present</Link>
                      </Button>
                      <form action={requestConsentAction} className="space-y-2">
                        <input type="hidden" name="person_id" value={person.id} />
                        <div className="space-y-1">
                          <Label htmlFor={`purpose_${person.id}`} className="text-xs">
                            Purpose of request
                          </Label>
                          <Textarea
                            id={`purpose_${person.id}`}
                            name="purpose"
                            rows={2}
                            placeholder="Short, non-sensitive purpose for requesting consent."
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`note_${person.id}`} className="text-xs">
                            Optional note
                          </Label>
                          <Textarea
                            id={`note_${person.id}`}
                            name="request_note"
                            rows={2}
                            placeholder="Optional context for IHARC staff reviewing the request."
                          />
                        </div>
                        <Button type="submit" disabled={orgMissing || allowed || Boolean(pending)} className="w-full">
                          Request consent
                        </Button>
                      </form>

                      <form action={logConsentContactAction} className="space-y-2">
                        <input type="hidden" name="person_id" value={person.id} />
                        <div className="space-y-1">
                          <Label htmlFor={`contact_${person.id}`} className="text-xs">
                            Log contact
                          </Label>
                          <Textarea
                            id={`contact_${person.id}`}
                            name="contact_summary"
                            rows={3}
                            placeholder="Document a consent-related contact attempt (non-sensitive)."
                            required
                          />
                        </div>
                        <Button type="submit" variant="outline" disabled={orgMissing} className="w-full">
                          Log consent contact
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Request history</CardTitle>
            <CardDescription>Recent consent requests submitted by you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {requestStatuses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No requests yet.</p>
            ) : (
              requestStatuses.map((row) => (
                <div key={row.id} className="rounded-2xl border border-border/40 bg-background p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{requestNames.get(row.person_id) ?? `Person ${row.person_id}`}</p>
                    <span>
                      {row.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Requested {formatDate(row.requested_at)}</p>
                  {row.decision_at ? (
                    <p className="text-xs text-muted-foreground">Decision {formatDate(row.decision_at)}</p>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return 'Unknown';
  try {
    return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return value;
  }
}
