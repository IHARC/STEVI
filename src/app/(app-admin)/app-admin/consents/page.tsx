import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { getPolicyBySlug } from '@/lib/policies';
import { getEffectiveConsent, listConsentOrgs, listParticipatingOrganizations, resolveConsentOrgSelections } from '@/lib/consents';
import { PageHeader } from '@shared/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Input } from '@shared/ui/input';
import { Textarea } from '@shared/ui/textarea';
import { Label } from '@shared/ui/label';
import { ConsentOverrideForm } from '@workspace/admin/consents/consent-override-form';
import { adminOverrideConsentAction, adminRenewConsentAction, adminRevokeConsentAction } from '@/lib/cases/actions';
import { approveConsentRequestAction, denyConsentRequestAction } from './actions';

export const dynamic = 'force-dynamic';

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

type RequestRow = {
  id: string;
  person_id: number;
  requesting_org_id: number;
  purpose: string;
  requested_scopes: string[] | null;
  status: string;
  requested_at: string;
  people?: { first_name?: string | null; last_name?: string | null } | null;
  organizations?: { name?: string | null } | null;
};

type PersonRow = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  preferred_contact_method: string | null;
  privacy_restrictions: string | null;
};

type ConsentRow = {
  id: string;
  scope: string;
  status: string;
  captured_method: string | null;
  created_at: string;
  updated_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
  notes: string | null;
  policy_version: string | null;
  captured_by_profile?: { display_name?: string | null } | null;
  revoked_by_profile?: { display_name?: string | null } | null;
};

export default async function AdminConsentsPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const personParam = Array.isArray(params.person) ? params.person[0] : params.person;
  const personId = parsePersonId(personParam);

  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessOpsSteviAdmin) {
    redirect(resolveLandingPath(access));
  }

  const core = supabase.schema('core');

  const [requestResult, privacyPolicy] = await Promise.all([
    core
      .from('person_consent_requests')
      .select('id, person_id, requesting_org_id, purpose, requested_scopes, status, requested_at, people(first_name,last_name), organizations(name)')
      .eq('status', 'pending')
      .order('requested_at', { ascending: true })
      .limit(40),
    getPolicyBySlug('client-privacy-notice'),
  ]);

  if (requestResult.error) {
    throw requestResult.error;
  }

  const requests = (requestResult.data ?? []) as RequestRow[];
  const policyVersion = privacyPolicy?.updatedAt ?? null;

  let person: PersonRow | null = null;
  let consentHistory: ConsentRow[] = [];
  let consentSummary: Awaited<ReturnType<typeof getEffectiveConsent>> | null = null;
  let orgSelections = [] as ReturnType<typeof resolveConsentOrgSelections>['selections'];
  let consentScope: 'all_orgs' | 'selected_orgs' | 'none' = 'all_orgs';

  if (personId) {
    const [personResult, consentResult, orgs] = await Promise.all([
      core
        .from('people')
        .select('id, first_name, last_name, email, phone, preferred_contact_method, privacy_restrictions')
        .eq('id', personId)
        .maybeSingle(),
      core
        .from('person_consents')
        .select(
          'id, scope, status, captured_method, created_at, updated_at, revoked_at, expires_at, notes, policy_version, captured_by_profile:portal.profiles(display_name), revoked_by_profile:portal.profiles(display_name)',
        )
        .eq('person_id', personId)
        .order('created_at', { ascending: false })
        .limit(10),
      listParticipatingOrganizations(supabase, { excludeOrgId: access.iharcOrganizationId }),
    ]);

    if (personResult.error) throw personResult.error;
    if (consentResult.error) throw consentResult.error;

    person = (personResult.data as PersonRow | null) ?? null;
    consentHistory = (consentResult.data ?? []) as ConsentRow[];

    consentSummary = await getEffectiveConsent(supabase, personId);
    consentScope = consentSummary?.consent?.scope ?? 'all_orgs';

    const consentOrgs = consentSummary?.consent ? await listConsentOrgs(supabase, consentSummary.consent.id) : [];
    orgSelections = resolveConsentOrgSelections(consentScope, orgs, consentOrgs).selections;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="STEVI Admin"
        title="Consent management"
        description="IHARC-only: review partner consent requests and manage client sharing preferences."
        breadcrumbs={[{ label: 'STEVI Admin', href: '/app-admin' }, { label: 'Consents' }]}
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending consent requests</CardTitle>
            <CardDescription>Approve or deny partner requests with documented consent.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending requests.</p>
            ) : (
              requests.map((request) => {
                const personName = `${request.people?.first_name ?? ''} ${request.people?.last_name ?? ''}`.trim();
                return (
                  <Card key={request.id} className="border-border/40">
                    <CardHeader className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base">{personName || `Person ${request.person_id}`}</CardTitle>
                        <Badge variant="outline">ID {request.person_id}</Badge>
                        <Badge variant="secondary">{request.organizations?.name ?? 'Requesting org'}</Badge>
                      </div>
                      <CardDescription>{request.purpose}</CardDescription>
                      <p className="text-xs text-muted-foreground">Requested {formatDate(request.requested_at)}</p>
                    </CardHeader>
                    <CardContent className="grid gap-4 lg:grid-cols-2">
                      <form action={approveConsentRequestAction} className="space-y-2">
                        <input type="hidden" name="request_id" value={request.id} />
                        <input type="hidden" name="org_allowed_ids" value={request.requesting_org_id} />
                        {policyVersion ? <input type="hidden" name="policy_version" value={policyVersion} /> : null}
                        <div className="space-y-1">
                          <Label htmlFor={`scope_${request.id}`} className="text-xs">
                            Consent scope
                          </Label>
                          <select
                            id={`scope_${request.id}`}
                            name="consent_scope"
                            defaultValue="selected_orgs"
                            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            <option value="selected_orgs">Selected orgs</option>
                            <option value="all_orgs">All participating orgs</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`method_${request.id}`} className="text-xs">
                            Consent method
                          </Label>
                          <select
                            id={`method_${request.id}`}
                            name="consent_method"
                            defaultValue="verbal"
                            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            <option value="verbal">Verbal</option>
                            <option value="documented">Documented</option>
                            <option value="staff_assisted">Staff assisted</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`consent_notes_${request.id}`} className="text-xs">
                            Consent notes
                          </Label>
                          <Textarea
                            id={`consent_notes_${request.id}`}
                            name="consent_notes"
                            rows={2}
                            placeholder="Document the consent conversation."
                          />
                        </div>
                        <div className="space-y-2 rounded-2xl border border-border/40 bg-muted/30 p-3 text-xs text-foreground">
                          <p className="font-semibold">Required attestations</p>
                          <label className="flex items-start gap-2">
                            <input type="checkbox" name="attested_by_staff" required className="mt-1 h-4 w-4" />
                            <span>I confirm the client was present and consent was explained in plain language.</span>
                          </label>
                          <label className="flex items-start gap-2">
                            <input type="checkbox" name="attested_by_client" required className="mt-1 h-4 w-4" />
                            <span>The client confirms they understand and agree to these sharing selections.</span>
                          </label>
                        </div>
                        <Button type="submit" className="w-full">
                          Approve request
                        </Button>
                      </form>

                      <form action={denyConsentRequestAction} className="space-y-2">
                        <input type="hidden" name="request_id" value={request.id} />
                        <div className="space-y-1">
                          <Label htmlFor={`decision_${request.id}`} className="text-xs">
                            Decision reason
                          </Label>
                          <Textarea
                            id={`decision_${request.id}`}
                            name="decision_reason"
                            rows={2}
                            placeholder="Optional reason for denying this request."
                          />
                        </div>
                        <Button type="submit" variant="destructive" className="w-full">
                          Deny request
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Find a client</CardTitle>
            <CardDescription>Enter a person ID to review consent history and override sharing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form method="get" className="flex gap-2">
              <Input name="person" placeholder="Person ID" defaultValue={personId ?? ''} />
              <Button type="submit" variant="secondary">
                Load
              </Button>
            </form>

            {!personId ? <p className="text-sm text-muted-foreground">No client selected.</p> : null}
            {personId && !person ? <p className="text-sm text-destructive">Client not found.</p> : null}

            {person ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-border/40 bg-muted/30 p-3 text-sm">
                  <p className="font-semibold text-foreground">{`${person.first_name ?? ''} ${person.last_name ?? ''}`.trim() || `Person ${person.id}`}</p>
                  <p className="text-muted-foreground">ID {person.id}</p>
                  <p className="text-muted-foreground">Email: {person.email ?? '—'}</p>
                  <p className="text-muted-foreground">Phone: {person.phone ?? '—'}</p>
                </div>

                <ConsentOverrideForm
                  personId={person.id}
                  consentScope={consentScope}
                  orgSelections={orgSelections}
                  preferredContactMethod={person.preferred_contact_method}
                  privacyRestrictions={person.privacy_restrictions}
                  policyVersion={policyVersion}
                  action={adminOverrideConsentAction}
                  submitLabel="Save override"
                />

                {consentSummary?.consent ? (
                  <div className="grid gap-2">
                    <form action={adminRenewConsentAction} className="space-y-2">
                      <input type="hidden" name="person_id" value={person.id} />
                      <input type="hidden" name="consent_id" value={consentSummary.consent.id} />
                      <div className="space-y-1">
                        <Label htmlFor={`renew_method_${person.id}`} className="text-xs">
                          Consent method
                        </Label>
                        <select
                          id={`renew_method_${person.id}`}
                          name="consent_method"
                          defaultValue="verbal"
                          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <option value="verbal">Verbal</option>
                          <option value="documented">Documented</option>
                          <option value="staff_assisted">Staff assisted</option>
                        </select>
                      </div>
                      <div className="space-y-2 rounded-2xl border border-border/40 bg-muted/30 p-3 text-xs text-foreground">
                        <p className="font-semibold">Required attestations</p>
                        <label className="flex items-start gap-2">
                          <input type="checkbox" name="attested_by_staff" required className="mt-1 h-4 w-4" />
                          <span>I confirm the client was present and consent was explained in plain language.</span>
                        </label>
                        <label className="flex items-start gap-2">
                          <input type="checkbox" name="attested_by_client" required className="mt-1 h-4 w-4" />
                          <span>The client confirms they understand and agree to these sharing selections.</span>
                        </label>
                      </div>
                      <Button type="submit" variant="outline" className="w-full">
                        Renew consent
                      </Button>
                    </form>
                    <form action={adminRevokeConsentAction} className="space-y-2">
                      <input type="hidden" name="person_id" value={person.id} />
                      <input type="hidden" name="consent_id" value={consentSummary.consent.id} />
                      <Button type="submit" variant="destructive" className="w-full">
                        Revoke consent
                      </Button>
                    </form>
                  </div>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Consent history</CardTitle>
          <CardDescription>Most recent consent records for the selected client.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {personId && consentHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No consent history recorded yet.</p>
          ) : null}
          {!personId ? <p className="text-sm text-muted-foreground">Select a client to view history.</p> : null}
          {consentHistory.map((row) => (
            <div key={row.id} className="rounded-2xl border border-border/40 bg-background p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={row.status === 'active' ? 'default' : row.status === 'expired' ? 'destructive' : 'secondary'}>
                  {row.status}
                </Badge>
                <Badge variant="outline">Scope: {formatScope(row.scope)}</Badge>
                <Badge variant="outline">Method: {row.captured_method ?? '—'}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Created {formatDate(row.created_at)}</p>
              {row.expires_at ? <p className="text-xs text-muted-foreground">Expires {formatDate(row.expires_at)}</p> : null}
              {row.revoked_at ? <p className="text-xs text-muted-foreground">Revoked {formatDate(row.revoked_at)}</p> : null}
              {row.notes ? <p className="mt-1 text-xs text-muted-foreground">Notes: {row.notes}</p> : null}
              <p className="mt-1 text-xs text-muted-foreground">
                Captured by {row.captured_by_profile?.display_name ?? 'Unknown'}
                {row.revoked_by_profile?.display_name ? ` · Revoked by ${row.revoked_by_profile.display_name}` : ''}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
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

function formatScope(scope: string | null) {
  if (scope === 'all_orgs') return 'All orgs';
  if (scope === 'selected_orgs') return 'Selected orgs';
  if (scope === 'none') return 'IHARC only';
  return scope ?? 'Unknown';
}
