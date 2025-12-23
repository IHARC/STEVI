import type { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { extractOrgFeatureFlags, ORG_FEATURE_OPTIONS } from '@/lib/organizations';
import { fetchOrgInvites, fetchOrgMembersWithRoles, fetchOrgRoles, type OrgInviteRecord } from '@/lib/org/fetchers';
import { checkRateLimit, type RateLimitResult } from '@/lib/rate-limit';
import { ensurePortalProfile } from '@/lib/profile';
import { PageHeader } from '@shared/layout/page-header';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { NativeCheckbox } from '@shared/ui/native-checkbox';
import { NativeSelect } from '@shared/ui/native-select';
import { Separator } from '@shared/ui/separator';
import { Textarea } from '@shared/ui/textarea';
import type { Database } from '@/types/supabase';
import { OrgMembersTable } from '../../org/members/org-members-table';
import { InviteSheet } from '../../org/invites/invite-sheet';
import { ORG_INVITE_EVENT, ORG_INVITE_RATE_LIMIT } from '../../org/invites/constants';
import { OrgContactSettingsForm, OrgNotesSettingsForm } from '../../org/settings/org-settings-form';
import { attachOrgMemberAction, deleteOrganizationAction, updateOrganizationAction } from '../actions';
import { confirmAppointment, cancelAppointmentAsStaff } from '@/lib/appointments/actions';
import { fetchScopedAppointments } from '@/lib/appointments/queries';
import type { AppointmentWithRelations } from '@/lib/appointments/types';
import { toLocalDateTimeInput } from '@/lib/datetime';
import { AvailabilityPicker } from '@workspace/appointments/availability-picker';
import { generateAvailabilitySlots } from '@/lib/appointments/slots';
import { ProfileSearch } from '@workspace/appointments/profile-search';
import { CancelAppointmentForm } from '@shared/appointments/cancel-appointment-form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';

export const dynamic = 'force-dynamic';

type OrganizationRow = Database['core']['Tables']['organizations']['Row'];

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type OrgTab = 'overview' | 'settings' | 'members' | 'invites' | 'appointments';

const STATUS_OPTIONS: Array<OrganizationRow['status']> = ['active', 'inactive', 'pending', 'under_review'];
const ORG_TYPE_OPTIONS: Array<NonNullable<OrganizationRow['organization_type']>> = [
  'addiction',
  'crisis_support',
  'food_services',
  'housing',
  'mental_health',
  'multi_service',
  'healthcare',
  'government',
  'non_profit',
  'faith_based',
  'community_center',
  'legal_services',
  'other',
];

const PARTNERSHIP_OPTIONS: Array<NonNullable<OrganizationRow['partnership_type']>> = [
  'referral_partner',
  'service_provider',
  'funding_partner',
  'collaborative_partner',
  'resource_partner',
  'other',
];

const STATUS_BADGE: Record<string, 'default' | 'secondary' | 'outline'> = {
  active: 'default',
  pending: 'outline',
  under_review: 'outline',
  inactive: 'secondary',
};

const INVITE_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short' });
const APPOINTMENT_FORMATTER = new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short' });

function coerceTab(value: string | string[] | undefined): OrgTab {
  const tab = Array.isArray(value) ? value[0] : value;
  switch (tab) {
    case 'settings':
    case 'members':
    case 'invites':
    case 'appointments':
      return tab;
    case 'overview':
    default:
      return 'overview';
  }
}

function formatInviteDate(value: string) {
  try {
    return INVITE_DATE_FORMATTER.format(new Date(value));
  } catch {
    return value;
  }
}

function formatAppointmentDate(value: string | null) {
  if (!value) return 'Not scheduled yet';
  try {
    return APPOINTMENT_FORMATTER.format(new Date(value));
  } catch {
    return value;
  }
}

function tabHref(orgId: number, tab: OrgTab) {
  if (tab === 'overview') return `/ops/organizations/${orgId}`;
  return `/ops/organizations/${orgId}?tab=${tab}`;
}

export default async function OrganizationDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const organizationId = Number.parseInt(id, 10);

  if (!Number.isFinite(organizationId)) {
    redirect('/ops/organizations');
  }

  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect(`/auth/start?next=/ops/organizations/${organizationId}`);
  }

  const resolvedSearch = searchParams ? await searchParams : undefined;
  const tab = coerceTab(resolvedSearch?.tab);

  const isIharcAdmin = access.isGlobalAdmin;
  const isInternalIharc = access.isIharcMember || access.isGlobalAdmin;
  const isAgencyPartner = access.profile.affiliation_type === 'agency_partner';
  const isOwnOrg = access.organizationId !== null && access.organizationId === organizationId;
  const orgRoleNames = access.orgRoles.map((role) => role.name);
  const isOrgAdmin = orgRoleNames.includes('org_admin');
  const isOrgRep = orgRoleNames.includes('org_rep');

  const canViewThisOrg = isIharcAdmin || isInternalIharc || (access.isProfileApproved && isAgencyPartner && isOwnOrg);
  if (!canViewThisOrg) {
    redirect(resolveLandingPath(access));
  }

  const canEditFullOrgRecord = isIharcAdmin;
  const canEditOrgSettings = isIharcAdmin || (isOwnOrg && access.canManageOrgUsers);
  const canManageMembers = isIharcAdmin || (isOwnOrg && access.canManageOrgUsers);
  const canManageInvites = isIharcAdmin || (isOwnOrg && access.canManageOrgInvites);
  const canManageAppointments = isIharcAdmin || (isOwnOrg && (access.canAccessOpsOrg || access.canAccessOpsFrontline));

  const tabDefinitions = [
    { id: 'overview', label: 'Overview' },
    { id: 'settings', label: 'Settings', requires: canEditFullOrgRecord || canEditOrgSettings },
    { id: 'members', label: 'Members', requires: canManageMembers },
    { id: 'invites', label: 'Invites', requires: canManageInvites },
    { id: 'appointments', label: 'Appointments', requires: canManageAppointments },
  ] satisfies Array<{ id: OrgTab; label: string; requires?: boolean }>;

  const availableTabs = tabDefinitions.filter((entry) => entry.requires !== false);

  if (!availableTabs.some((entry) => entry.id === tab)) {
    redirect(tabHref(organizationId, 'overview'));
  }

  const { data: orgRow, error: orgError } = await supabase
    .schema('core')
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .maybeSingle();

  if (orgError) throw orgError;
  if (!orgRow) {
    redirect('/ops/organizations');
  }

  const selectedFeatures = extractOrgFeatureFlags(orgRow.services_tags);

  const [members, roles, invites, inviteRateLimit, appointments] = await Promise.all([
    tab === 'members' && canManageMembers ? fetchOrgMembersWithRoles(supabase, organizationId) : Promise.resolve(null),
    tab === 'members' && canManageMembers ? fetchOrgRoles(supabase, organizationId) : Promise.resolve(null),
    tab === 'invites' && canManageInvites ? fetchOrgInvites(supabase, organizationId, 50) : Promise.resolve(null),
    tab === 'invites' && canManageInvites
      ? checkRateLimit({
          supabase,
          type: ORG_INVITE_EVENT,
          limit: ORG_INVITE_RATE_LIMIT.limit,
          cooldownMs: ORG_INVITE_RATE_LIMIT.cooldownMs,
        })
      : Promise.resolve(null),
    tab === 'appointments' && canManageAppointments
      ? (async () => {
          await ensurePortalProfile(supabase, access.userId);
          return fetchScopedAppointments(supabase, access, { includeCompleted: true, targetOrgId: organizationId });
        })()
      : Promise.resolve(null),
  ]);

  const orgName = orgRow.name ?? 'Organization';

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Operations"
        title={orgName}
        description="Organization details, membership, invites, and org-scoped workflows. Access is scoped by role and Supabase RLS."
        breadcrumbs={[
          { label: 'Operations', href: '/ops/today' },
          { label: 'Organizations', href: '/ops/organizations' },
          { label: orgName },
        ]}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={STATUS_BADGE[orgRow.status ?? 'active'] ?? 'outline'} className="capitalize">
            {(orgRow.status ?? 'active').replaceAll('_', ' ')}
          </Badge>
          <Badge variant={orgRow.is_active ? 'secondary' : 'outline'}>{orgRow.is_active ? 'Active' : 'Inactive'}</Badge>
          {isIharcAdmin ? <Badge variant="outline">IHARC admin</Badge> : null}
          {!isIharcAdmin && isOrgAdmin ? <Badge variant="outline">Org admin</Badge> : null}
          {!isIharcAdmin && !isOrgAdmin && isOrgRep ? <Badge variant="outline">Org rep</Badge> : null}
        </div>
      </PageHeader>

      <nav className="flex flex-wrap gap-2">
        {availableTabs.map((entry) => (
          <Button key={entry.id} asChild size="sm" variant={entry.id === tab ? 'default' : 'outline'}>
            <Link href={tabHref(organizationId, entry.id)}>{entry.label}</Link>
          </Button>
        ))}
      </nav>

      {tab === 'overview' ? <OverviewTab organization={orgRow} /> : null}
      {tab === 'settings' ? (
        <SettingsTab
          organization={orgRow}
          selectedFeatures={selectedFeatures}
          organizationId={organizationId}
          canEditFullOrgRecord={canEditFullOrgRecord}
          canEditOrgSettings={canEditOrgSettings}
        />
      ) : null}
      {tab === 'members' ? (
        <MembersTab
          members={members}
          roles={roles}
          organizationId={organizationId}
          currentProfileId={access.profile.id}
          canEditFullOrgRecord={canEditFullOrgRecord}
        />
      ) : null}
      {tab === 'invites' ? (
        <InvitesTab
          invites={invites}
          rateLimit={inviteRateLimit}
          organizationId={organizationId}
        />
      ) : null}
      {tab === 'appointments' ? (
        <AppointmentsTab
          appointments={appointments}
          organizationId={organizationId}
        />
      ) : null}
    </div>
  );
}

function OverviewTab({ organization }: { organization: OrganizationRow }) {
  return (
    <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-xl">Organization overview</CardTitle>
          <CardDescription>Reference details for coordination, referrals, and operational context.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-foreground/80 sm:grid-cols-2">
          <Fact label="Type">{organization.organization_type?.replaceAll('_', ' ') ?? 'Not set'}</Fact>
          <Fact label="Partnership">{organization.partnership_type?.replaceAll('_', ' ') ?? 'Not set'}</Fact>
          <Fact label="Website">
            {organization.website ? (
              <a href={organization.website} className="text-primary underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
                {organization.website}
              </a>
            ) : (
              '—'
            )}
          </Fact>
          <Fact label="Contact">
            {organization.contact_person ? `${organization.contact_person}${organization.contact_title ? `, ${organization.contact_title}` : ''}` : 'Not set'}
            <br />
            {organization.contact_email ?? '—'}
            <br />
            {organization.contact_phone ?? '—'}
          </Fact>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-xl">Notes</CardTitle>
          <CardDescription>Operational notes used during coordination.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-foreground/80">
          <Fact label="Referral process">{organization.referral_process ?? '—'}</Fact>
          <Fact label="Availability notes">{organization.availability_notes ?? '—'}</Fact>
          <Fact label="Special requirements">{organization.special_requirements ?? '—'}</Fact>
        </CardContent>
      </Card>
    </section>
  );
}

function SettingsTab({
  organization,
  selectedFeatures,
  organizationId,
  canEditFullOrgRecord,
  canEditOrgSettings,
}: {
  organization: OrganizationRow;
  selectedFeatures: Array<(typeof ORG_FEATURE_OPTIONS)[number]['value']>;
  organizationId: number;
  canEditFullOrgRecord: boolean;
  canEditOrgSettings: boolean;
}) {
  if (!canEditFullOrgRecord && !canEditOrgSettings) {
    return (
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-xl">Settings</CardTitle>
          <CardDescription>You do not have permission to edit settings for this organization.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!canEditFullOrgRecord) {
    return (
      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <OrgContactSettingsForm
            organizationId={organizationId}
            initialValues={{
              contact_person: organization.contact_person ?? '',
              contact_title: organization.contact_title ?? '',
              contact_email: organization.contact_email ?? '',
              contact_phone: organization.contact_phone ?? '',
              website: organization.website ?? '',
            }}
          />
          <OrgNotesSettingsForm
            organizationId={organizationId}
            initialValues={{
              referral_process: organization.referral_process ?? '',
              availability_notes: organization.availability_notes ?? '',
              special_requirements: organization.special_requirements ?? '',
            }}
          />
        </div>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-xl">Snapshot</CardTitle>
            <CardDescription>Status and taxonomy are managed by IHARC admins.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-foreground/80">
            <Fact label="Status">{organization.status?.replaceAll('_', ' ') ?? 'active'}</Fact>
            <Fact label="Type">{organization.organization_type?.replaceAll('_', ' ') ?? 'Not set'}</Fact>
            <Fact label="Partnership">{organization.partnership_type?.replaceAll('_', ' ') ?? 'Not set'}</Fact>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-xl">Organization details</CardTitle>
          <CardDescription>Edit partner details, feature flags, and contact details. All changes are audit logged.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={updateOrganizationAction} className="space-y-4">
            <input type="hidden" name="organization_id" value={organizationId} />

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Name" id="name">
                <Input id="name" name="name" defaultValue={organization.name ?? ''} required />
              </Field>
              <Field label="Website" id="website">
                <Input id="website" name="website" type="url" defaultValue={organization.website ?? ''} />
              </Field>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Status" id="status">
                <NativeSelect id="status" name="status" defaultValue={organization.status ?? 'active'}>
                  {STATUS_OPTIONS.map((value) => (
                    <option key={value} value={value ?? ''}>
                      {value?.replaceAll('_', ' ') ?? 'active'}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Organization type" id="organization_type">
                <NativeSelect id="organization_type" name="organization_type" defaultValue={organization.organization_type ?? ''}>
                  <option value="">Not set</option>
                  {ORG_TYPE_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {value.replaceAll('_', ' ')}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Partnership type" id="partnership_type">
                <NativeSelect id="partnership_type" name="partnership_type" defaultValue={organization.partnership_type ?? ''}>
                  <option value="">Not set</option>
                  {PARTNERSHIP_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {value.replaceAll('_', ' ')}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>

            <div className="flex items-center gap-2">
              <NativeCheckbox id="is_active" name="is_active" defaultChecked={organization.is_active ?? false} />
              <Label htmlFor="is_active">Active</Label>
            </div>

            <Separator />

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Address" id="address" className="md:col-span-2">
                <Input id="address" name="address" defaultValue={organization.address ?? ''} />
              </Field>
              <Field label="City" id="city">
                <Input id="city" name="city" defaultValue={organization.city ?? ''} />
              </Field>
              <Field label="Province" id="province">
                <Input id="province" name="province" defaultValue={organization.province ?? ''} />
              </Field>
              <Field label="Postal code" id="postal_code">
                <Input id="postal_code" name="postal_code" defaultValue={organization.postal_code ?? ''} />
              </Field>
            </div>

            <Separator />

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Contact person" id="contact_person">
                <Input id="contact_person" name="contact_person" defaultValue={organization.contact_person ?? ''} />
              </Field>
              <Field label="Contact title" id="contact_title">
                <Input id="contact_title" name="contact_title" defaultValue={organization.contact_title ?? ''} />
              </Field>
              <Field label="Contact email" id="contact_email">
                <Input id="contact_email" name="contact_email" type="email" defaultValue={organization.contact_email ?? ''} />
              </Field>
              <Field label="Contact phone" id="contact_phone">
                <Input id="contact_phone" name="contact_phone" defaultValue={organization.contact_phone ?? ''} />
              </Field>
            </div>

            <Separator />

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Operating hours" id="operating_hours">
                <Input id="operating_hours" name="operating_hours" defaultValue={organization.operating_hours ?? ''} />
              </Field>
              <Field label="Phone" id="phone">
                <Input id="phone" name="phone" defaultValue={organization.phone ?? ''} />
              </Field>
              <Field label="Email" id="email">
                <Input id="email" name="email" type="email" defaultValue={organization.email ?? ''} />
              </Field>
              <Field label="Description" id="description">
                <Textarea id="description" name="description" defaultValue={organization.description ?? ''} rows={3} />
              </Field>
            </div>

            <Separator />

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Services provided" id="services_provided">
                <Textarea id="services_provided" name="services_provided" defaultValue={organization.services_provided ?? ''} rows={3} />
              </Field>
              <Field label="Referral process" id="referral_process">
                <Textarea id="referral_process" name="referral_process" defaultValue={organization.referral_process ?? ''} rows={3} />
              </Field>
              <Field label="Special requirements" id="special_requirements">
                <Textarea id="special_requirements" name="special_requirements" defaultValue={organization.special_requirements ?? ''} rows={3} />
              </Field>
              <Field label="Availability notes" id="availability_notes">
                <Textarea id="availability_notes" name="availability_notes" defaultValue={organization.availability_notes ?? ''} rows={3} />
              </Field>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Features</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {ORG_FEATURE_OPTIONS.map((feature) => (
                  <label key={feature.value} className="flex items-center gap-2 text-sm">
                    <NativeCheckbox name="features" value={feature.value} defaultChecked={selectedFeatures.includes(feature.value)} />
                    <span>{feature.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes">Notes (internal)</Label>
              <Textarea id="notes" name="notes" defaultValue={organization.notes ?? ''} rows={3} />
            </div>

            <div className="flex justify-end">
              <Button type="submit">Save changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border border-destructive/40">
        <CardHeader>
          <CardTitle className="text-xl text-destructive">Delete organization</CardTitle>
          <CardDescription>Permanently remove this organization after clearing all memberships and links.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={deleteOrganizationAction} className="space-y-3">
            <input type="hidden" name="organization_id" value={organizationId} />
            <div className="space-y-1">
              <Label htmlFor="confirm_name">Type the organization name to confirm</Label>
              <Input id="confirm_name" name="confirm_name" placeholder={organization.name ?? 'Organization name'} />
            </div>
            <Button type="submit" variant="destructive">
              Delete organization
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

function MembersTab({
  members,
  roles,
  organizationId,
  currentProfileId,
  canEditFullOrgRecord,
}: {
  members: Awaited<ReturnType<typeof fetchOrgMembersWithRoles>> | null;
  roles: Awaited<ReturnType<typeof fetchOrgRoles>> | null;
  organizationId: number;
  currentProfileId: string;
  canEditFullOrgRecord: boolean;
}) {
  if (!members || !roles) {
    return (
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-xl">Members</CardTitle>
          <CardDescription>You do not have permission to manage members for this organization.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const roleOptions = roles.map((role) => ({
    id: role.id,
    name: role.name,
    displayName: role.display_name ?? null,
  }));

  return (
    <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-xl">Members & roles</CardTitle>
          <CardDescription>Membership changes are audit logged and scoped by Supabase row-level security.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <OrgMembersTable
            members={members}
            roles={roleOptions}
            currentProfileId={currentProfileId}
            organizationId={organizationId}
          />
        </CardContent>
      </Card>

      {canEditFullOrgRecord ? (
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-xl">Attach member (IHARC admin)</CardTitle>
            <CardDescription>Link an existing profile and optionally grant org roles.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={attachOrgMemberAction} className="space-y-3">
              <input type="hidden" name="organization_id" value={organizationId} />
              <div className="space-y-1">
                <Label htmlFor="profile_id">Profile ID</Label>
                <Input id="profile_id" name="profile_id" placeholder="profile UUID" required />
                <p className="text-xs text-muted-foreground">Find profile IDs from the STEVI Admin Users list.</p>
              </div>
              <div className="flex flex-col gap-2 text-sm">
                {roleOptions.map((role) => (
                  <label key={role.id} className="flex items-center gap-2">
                    <NativeCheckbox name="role_ids" value={role.id} defaultChecked={role.name === 'org_rep'} />
                    <span>{role.displayName ?? role.name.replaceAll('_', ' ')}</span>
                  </label>
                ))}
              </div>
              <Button type="submit">Attach member</Button>
              <p className="text-xs text-muted-foreground">Membership changes are audit logged and refresh user claims.</p>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}

function InvitesTab({
  invites,
  rateLimit,
  organizationId,
}: {
  invites: OrgInviteRecord[] | null;
  rateLimit: RateLimitResult | null;
  organizationId: number;
}) {
  if (!invites || !rateLimit) {
    return (
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-xl">Invites</CardTitle>
          <CardDescription>You do not have permission to view invites for this organization.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow="Organization"
        title="Invites"
        description="Invitations stay locked to this org by Supabase RLS. Rate limits keep accidental resends in check."
        actions={<InviteSheet rateLimit={rateLimit} organizationId={organizationId} />}
      />

      <Card className="border-border/60">
        <CardHeader className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Recent invites</CardTitle>
            <CardDescription>Showing the last 50 invitations tied to this organization.</CardDescription>
          </div>
          <Badge variant={rateLimit.allowed ? 'secondary' : 'destructive'} className="capitalize">
            {rateLimit.allowed ? 'Limit clear' : 'Rate limited'}
          </Badge>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Sent</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((invite) => (
                <tr key={invite.id} className="border-b border-border/30">
                  <td className="py-3 pr-4 text-foreground">{invite.email}</td>
                  <td className="py-3 pr-4">{invite.display_name ?? '—'}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{invite.position_title ?? '—'}</td>
                  <td className="py-3 pr-4">
                    <Badge variant={invite.status === 'pending' ? 'secondary' : 'default'} className="capitalize">
                      {invite.status}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">{formatInviteDate(invite.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </section>
  );
}

function ConfirmForm({
  appointment,
  onConfirm,
}: {
  appointment: AppointmentWithRelations;
  onConfirm: (formData: FormData) => Promise<void>;
}) {
  const quickSlots = generateAvailabilitySlots();

  return (
    <form action={onConfirm} className="space-y-2 rounded-lg border border-border/40 p-3">
      <input type="hidden" name="appointment_id" value={appointment.id} />
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          type="datetime-local"
          name="occurs_at"
          id={`occurs-${appointment.id}`}
          required
          defaultValue={toLocalDateTimeInput(appointment.occurs_at)}
          className="sm:w-full"
        />
        <Input name="location" placeholder="Meeting room or link" defaultValue={appointment.location ?? ''} className="sm:w-full" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Select name="location_type" defaultValue={appointment.location_type ?? 'in_person'}>
          <SelectTrigger>
            <SelectValue placeholder="Meeting type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="in_person">In person</SelectItem>
            <SelectItem value="phone">Phone</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="field">Field / outreach</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Input name="meeting_url" placeholder="Meeting link / phone (optional)" defaultValue={appointment.meeting_url ?? ''} />
      </div>
      <AvailabilityPicker slots={quickSlots} targetInputId={`occurs-${appointment.id}`} />
      <ProfileSearch
        name="staff_profile_id"
        label="Assign staff (optional)"
        scope="staff"
        defaultValue={appointment.staff_profile_id ?? ''}
        placeholder="Search staff"
        helperText="Leave blank to stay unassigned."
      />
      <Textarea name="notes" placeholder="Include prep notes or access info" defaultValue={appointment.reschedule_note ?? ''} rows={2} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="sm">
          Confirm
        </Button>
        <CancelAppointmentForm action={cancelAppointmentAsStaff} appointmentId={appointment.id} />
      </div>
    </form>
  );
}

function AppointmentsTab({
  appointments,
  organizationId,
}: {
  appointments: Awaited<ReturnType<typeof fetchScopedAppointments>> | null;
  organizationId: number;
}) {
  if (!appointments) {
    return (
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-xl">Appointments</CardTitle>
          <CardDescription>You do not have permission to view appointments for this organization.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleConfirm = async (formData: FormData) => {
    await confirmAppointment(formData);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Organization"
        title="Appointments"
        description="Manage appointment requests linked to this organization and confirm times with clients."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={tabHref(organizationId, 'overview')}>Back to overview</Link>
          </Button>
        }
      />

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-xl">Pending</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {appointments.upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending appointments.</p>
          ) : (
            appointments.upcoming.map((appointment) => (
              <article key={appointment.id} className="rounded-xl border border-border/40 bg-muted p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{appointment.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {appointment.client?.display_name ?? 'Client'} · {appointment.requested_window ?? 'no window provided'}
                    </p>
                  </div>
                  <Badge className="capitalize">{appointment.status.replaceAll('_', ' ')}</Badge>
                </div>
                <p className="text-sm text-foreground/80">Preferred time: {appointment.requested_window ?? 'unspecified'}</p>
                {appointment.meeting_url ? (
                  <p className="text-sm text-primary">
                    <a className="underline-offset-4 hover:underline" href={appointment.meeting_url} target="_blank" rel="noreferrer">
                      Open meeting link
                    </a>
                  </p>
                ) : null}
                <div className="mt-4 space-y-3">
                  <ConfirmForm appointment={appointment} onConfirm={handleConfirm} />
                </div>
              </article>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-xl">History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-foreground/80">
          {appointments.past.length === 0 ? (
            <p className="text-sm text-muted-foreground">No past appointments.</p>
          ) : (
            <ul className="divide-y divide-border/20">
              {appointments.past.map((appointment) => (
                <li key={appointment.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium text-foreground">{appointment.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {appointment.client?.display_name ?? 'Client'} · {formatAppointmentDate(appointment.occurs_at)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {appointment.status.replaceAll('_', ' ')}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ id, label, children, className }: { id: string; label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className ?? 'space-y-1'}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-foreground">{children}</div>
    </div>
  );
}
