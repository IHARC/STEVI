import { notFound, redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import {
  adminCreateGrantAction,
  adminOverrideConsentAction,
  adminRevokeGrantAction,
} from '@/lib/cases/actions';
import { fetchPersonGrants, type PersonGrant } from '@/lib/cases/grants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { resolveLandingPath } from '@/lib/portal-navigation';
import type { Database } from '@/types/supabase';
import { getOnboardingStatus, type OnboardingStatus } from '@/lib/onboarding/status';
import { resetOnboardingAction, resendOnboardingLinkAction } from '../onboarding-actions';
import { Badge } from '@/components/ui/badge';
import { getGrantScopes } from '@/lib/enum-values';
import { ConsentOverrideForm } from '@/components/admin/consents/consent-override-form';
import { PersonGrantForm } from '@/components/admin/clients/person-grant-form';

async function resetOnboardingFormAction(formData: FormData) {
  'use server';
  await resetOnboardingAction(formData);
}

async function resendOnboardingFormAction(formData: FormData) {
  'use server';
  await resendOnboardingLinkAction(formData);
}

type PersonRow = Pick<
  Database['core']['Tables']['people']['Row'],
  | 'id'
  | 'first_name'
  | 'last_name'
  | 'email'
  | 'phone'
  | 'data_sharing_consent'
  | 'preferred_contact_method'
  | 'privacy_restrictions'
  | 'created_at'
  | 'created_by'
  | 'updated_at'
>;

type OrganizationOption = {
  id: number;
  name: string;
};

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ personId: string }> };

export default async function AdminPersonDetailPage({ params }: PageProps) {
  const { personId } = await params;
  const id = Number.parseInt(personId, 10);
  if (!id || Number.isNaN(id)) notFound();

  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);
  if (!access) redirect('/login?next=/admin/clients');
  if (!access.canManageConsents) redirect(resolveLandingPath(access));

  const person = await loadPerson(supabase, id);
  if (!person) notFound();

  const [grants, organizations, onboardingStatus, grantScopes] = await Promise.all([
    fetchPersonGrants(supabase, id),
    loadOrganizations(supabase),
    getOnboardingStatus({ personId: id }, supabase),
    getGrantScopes(supabase),
  ]);
  const onboardingHistory = await loadOnboardingHistory(supabase, person, onboardingStatus.profileId);

  return (
    <div className="mx-auto w-full max-w-6xl flex flex-col gap-6 px-4 py-8 md:px-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Client access</p>
        <h1 className="text-xl text-foreground sm:text-2xl">
          {person.first_name ?? 'Person'} {person.last_name ?? ''}
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
          Manage consents and granular access grants. All actions are audited.
        </p>
      </header>

      <OnboardingStatusCard personId={person.id} onboardingStatus={onboardingStatus} />
      <OnboardingHistoryCard events={onboardingHistory} />

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Consent overrides</CardTitle>
            <CardDescription>Adjust sharing and contact preferences with client approval.</CardDescription>
          </CardHeader>
          <CardContent>
            <ConsentOverrideForm
              personId={person.id}
              dataSharingConsent={Boolean(person.data_sharing_consent ?? false)}
              preferredContactMethod={person.preferred_contact_method}
              privacyRestrictions={person.privacy_restrictions}
              action={adminOverrideConsentAction}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Access grants</CardTitle>
            <CardDescription>Grant orgs or users scoped access; revoke when no longer needed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PersonGrantForm personId={person.id} organizations={organizations} scopes={grantScopes} action={adminCreateGrantAction} />
            <GrantList grants={grants} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function loadPerson(supabase: Awaited<ReturnType<typeof createSupabaseRSCClient>>, id: number) {
  const { data, error } = await supabase
    .schema('core')
    .from('people')
    .select(
      'id, first_name, last_name, email, phone, data_sharing_consent, preferred_contact_method, privacy_restrictions, created_at, created_by, updated_at',
    )
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as PersonRow | null;
}

async function loadOrganizations(
  supabase: Awaited<ReturnType<typeof createSupabaseRSCClient>>,
): Promise<OrganizationOption[]> {
  const { data, error } = await supabase.schema('core').from('organizations').select('id, name').order('name');
  if (error) throw error;
  return (data ?? []).map((org: { id: number; name: string }) => ({ id: org.id, name: org.name }));
}

type OnboardingEvent = {
  at: string;
  label: string;
  detail?: string;
  source: string;
};

async function loadOnboardingHistory(
  supabase: Awaited<ReturnType<typeof createSupabaseRSCClient>>,
  person: PersonRow,
  profileId: string | null,
): Promise<OnboardingEvent[]> {
  const caseMgmt = supabase.schema('case_mgmt');
  const core = supabase.schema('core');
  const portal = supabase.schema('portal');

  const [intakesResult, linksResult, registrationResult] = await Promise.all([
    caseMgmt
      .from('client_intakes')
      .select('id, consent_confirmed, privacy_acknowledged, created_at, intake_worker')
      .eq('person_id', person.id)
      .order('created_at', { ascending: false })
      .limit(10),
    core
      .from('user_people')
      .select('profile_id, user_id, linked_at')
      .eq('person_id', person.id)
      .order('linked_at', { ascending: false })
      .limit(5),
    profileId
      ? portal
          .from('registration_flows')
          .select('id, status, flow_type, updated_at, created_at')
          .eq('profile_id', profileId)
          .order('updated_at', { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (intakesResult.error) throw intakesResult.error;
  if (linksResult.error) throw linksResult.error;
  if ('error' in registrationResult && registrationResult.error) throw registrationResult.error;

  const events: OnboardingEvent[] = [];

  if (person.created_at) {
    events.push({
      at: person.created_at,
      label: 'Person record created',
      detail: person.created_by ? `Created by ${person.created_by}` : undefined,
      source: 'core.people',
    });
  }

  if (person.updated_at && person.updated_at !== person.created_at) {
    events.push({
      at: person.updated_at,
      label: 'Person record updated',
      detail: person.privacy_restrictions ? 'Privacy notes present' : undefined,
      source: 'core.people',
    });
  }

  for (const row of (intakesResult.data ?? []) as Array<{
    id: number;
    consent_confirmed: boolean | null;
    privacy_acknowledged: boolean | null;
    created_at: string;
    intake_worker: string | null;
  }>) {
    events.push({
      at: row.created_at,
      label: 'Consent captured',
      detail: `Service: ${row.consent_confirmed ? 'accepted' : 'pending'} • Privacy: ${row.privacy_acknowledged ? 'acknowledged' : 'pending'}${row.intake_worker ? ` • Worker: ${row.intake_worker}` : ''}`,
      source: 'case_mgmt.client_intakes',
    });
  }

  for (const row of (linksResult.data ?? []) as Array<{ profile_id: string | null; user_id: string | null; linked_at: string | null }>) {
    if (!row.linked_at) continue;
    events.push({
      at: row.linked_at,
      label: 'Account linked',
      detail: `${row.profile_id ? `Profile ${row.profile_id}` : 'Profile unknown'}${row.user_id ? ` • User ${row.user_id}` : ''}`,
      source: 'core.user_people',
    });
  }

  const registrationRows = (registrationResult as { data?: unknown[] }).data ?? [];
  for (const row of registrationRows as Array<{ id: string; status: string | null; flow_type: string | null; updated_at: string | null; created_at: string | null }>) {
    const timestamp = row.updated_at ?? row.created_at;
    if (!timestamp) continue;
    events.push({
      at: timestamp,
      label: 'Registration updated',
      detail: `${row.flow_type ?? 'client_onboarding'} • ${row.status ?? 'in_progress'}`,
      source: 'portal.registration_flows',
    });
  }

  return events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

function GrantList({ grants }: { grants: PersonGrant[] }) {
  if (grants.length === 0) {
    return <p className="text-sm text-muted-foreground">No active grants.</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Active grants</p>
      <ul className="space-y-1">
        {grants.map((grant) => (
          <li key={grant.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/30 bg-card p-3 text-sm">
            <div className="space-y-0.5">
              <p className="font-medium text-foreground">{grant.scope}</p>
              <p className="text-muted-foreground">
                {grant.granteeUserId ? `User ${grant.granteeUserId}` : grant.orgName ? grant.orgName : `Org ${grant.granteeOrgId}`}
              </p>
            </div>
            <form action={adminRevokeGrantAction}>
              <input type="hidden" name="grant_id" value={grant.id} />
              <Button variant="ghost" size="sm">Revoke</Button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OnboardingStatusCard({
  personId,
  onboardingStatus,
}: {
  personId: number;
  onboardingStatus: OnboardingStatus;
}) {
  const lastUpdated = onboardingStatus.lastUpdatedAt
    ? new Date(onboardingStatus.lastUpdatedAt).toLocaleString()
    : 'Not recorded';

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg">Onboarding status</CardTitle>
        <CardDescription>Audit the consent checklist and trigger resets or reminders.</CardDescription>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={onboardingStatus.status === 'COMPLETED' ? 'default' : 'secondary'}>
            {onboardingStatus.status.toLowerCase()}
          </Badge>
          <p className="text-xs text-muted-foreground">Last touch: {lastUpdated}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-1 text-sm text-foreground/80">
          <StatusItem done={onboardingStatus.hasPerson}>Active person record</StatusItem>
          <StatusItem done={onboardingStatus.hasServiceAgreementConsent}>Service agreement captured</StatusItem>
          <StatusItem done={onboardingStatus.hasPrivacyAcknowledgement}>Privacy acknowledgement captured</StatusItem>
          <StatusItem done={onboardingStatus.hasDataSharingPreference}>
            Sharing preference: {onboardingStatus.hasDataSharingPreference ? 'set' : 'missing'}
          </StatusItem>
        </ul>

        <div className="flex flex-wrap gap-3">
          <form action={resetOnboardingFormAction}>
            <input type="hidden" name="person_id" value={personId} />
            <Button type="submit" variant="secondary">Reset onboarding</Button>
          </form>
          <form action={resendOnboardingFormAction}>
            <input type="hidden" name="person_id" value={personId} />
            <Button type="submit" variant="outline">Resend onboarding link</Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusItem({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-1">
      <span
        className={`inline-flex h-4 w-4 items-center justify-center rounded-full ${done ? 'bg-primary text-primary-foreground' : 'bg-border/30 text-foreground'}`}
        aria-hidden
      >
        {done ? '✓' : ''}
      </span>
      <span className={done ? 'text-foreground' : 'text-muted-foreground'}>{children}</span>
    </li>
  );
}

function OnboardingHistoryCard({ events }: { events: OnboardingEvent[] }) {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg">Onboarding history</CardTitle>
        <CardDescription>Recent consent, sharing, and account-link events for this client.</CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No onboarding activity recorded yet.</p>
        ) : (
          <ul className="space-y-3">
            {events.map((event, index) => (
              <li
                key={`${event.source}-${event.at}-${index}`}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border/40 bg-muted p-3"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">{event.label}</p>
                  {event.detail ? <p className="text-sm text-muted-foreground">{event.detail}</p> : null}
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{event.source}</p>
                </div>
                <p className="text-sm text-muted-foreground">{new Date(event.at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
