import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess, type PortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { extractOrgFeatureFlags, type OrgFeatureKey } from '@/lib/organizations';
import { fetchOrgInvites, fetchOrgMembersWithRoles, fetchOrgRoles, type OrgInviteRecord, type OrgMemberRecord, type OrgRoleRecord } from '@/lib/org/fetchers';
import { checkRateLimit, type RateLimitResult } from '@/lib/rate-limit';
import { ensurePortalProfile } from '@/lib/profile';
import { fetchCostCategories, fetchCostDimensions, fetchServiceCatalog, fetchStaffRates } from '@/lib/costs/queries';
import { fetchScopedAppointments } from '@/lib/appointments/queries';
import type { Database } from '@/types/supabase';
import { ORG_INVITE_EVENT, ORG_INVITE_RATE_LIMIT } from '@/lib/org/invites/constants';

export type OrgTab = 'overview' | 'settings' | 'members' | 'invites' | 'appointments' | 'costs';

export type OrganizationRow = Database['core']['Tables']['organizations']['Row'];

export type OrganizationDetailAccess = {
  isIharcAdmin: boolean;
  isOrgAdmin: boolean;
  isOrgRep: boolean;
  canEditFullOrgRecord: boolean;
  canEditOrgSettings: boolean;
  canManageMembers: boolean;
  canManageInvites: boolean;
  canManageAppointments: boolean;
  canManageCosts: boolean;
  canAdminCosts: boolean;
  canViewCosts: boolean;
  currentProfileId: string;
};

export type OrganizationDetailData = {
  organization: OrganizationRow;
  members: OrgMemberRecord[] | null;
  roles: OrgRoleRecord[] | null;
  invites: OrgInviteRecord[] | null;
  inviteRateLimit: RateLimitResult | null;
  appointments: Awaited<ReturnType<typeof fetchScopedAppointments>> | null;
  staffRates: Awaited<ReturnType<typeof fetchStaffRates>> | null;
  costCategories: Awaited<ReturnType<typeof fetchCostCategories>> | null;
  serviceCatalog: Awaited<ReturnType<typeof fetchServiceCatalog>> | null;
  costDimensions: Awaited<ReturnType<typeof fetchCostDimensions>> | null;
  selectedFeatures: OrgFeatureKey[];
};

export type OrganizationDetailContext = {
  access: OrganizationDetailAccess;
  accessProfile: PortalAccess;
  organizationId: number;
  tab: OrgTab;
  availableTabs: Array<{ id: OrgTab; label: string }>;
  data: OrganizationDetailData;
};

function coerceTab(value: string | string[] | undefined): OrgTab {
  const tab = Array.isArray(value) ? value[0] : value;
  switch (tab) {
    case 'settings':
    case 'members':
    case 'invites':
    case 'appointments':
    case 'costs':
      return tab;
    case 'overview':
    default:
      return 'overview';
  }
}

function buildAccess(access: PortalAccess, organizationId: number): OrganizationDetailAccess {
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
  const canManageCosts = isIharcAdmin || (isOwnOrg && (access.canManageCosts || access.canAdminCosts));

  return {
    isIharcAdmin,
    isOrgAdmin,
    isOrgRep,
    canEditFullOrgRecord,
    canEditOrgSettings,
    canManageMembers,
    canManageInvites,
    canManageAppointments,
    canManageCosts,
    canAdminCosts: access.canAdminCosts,
    canViewCosts: access.canViewCosts,
    currentProfileId: access.profile.id,
  };
}

function buildAvailableTabs(access: OrganizationDetailAccess): Array<{ id: OrgTab; label: string }> {
  const tabDefinitions = [
    { id: 'overview', label: 'Overview' },
    { id: 'settings', label: 'Settings', requires: access.canEditFullOrgRecord || access.canEditOrgSettings },
    { id: 'members', label: 'Members', requires: access.canManageMembers },
    { id: 'invites', label: 'Invites', requires: access.canManageInvites },
    { id: 'appointments', label: 'Appointments', requires: access.canManageAppointments },
    { id: 'costs', label: 'Costs', requires: access.canManageCosts },
  ] satisfies Array<{ id: OrgTab; label: string; requires?: boolean }>;

  return tabDefinitions.filter((entry) => entry.requires !== false).map(({ id, label }) => ({ id, label }));
}

export async function loadOrganizationDetailContext({
  id,
  searchParams,
}: {
  id: string;
  searchParams?: Record<string, string | string[] | undefined>;
}): Promise<OrganizationDetailContext> {
  const organizationId = Number.parseInt(id, 10);

  if (!Number.isFinite(organizationId)) {
    redirect('/ops/organizations');
  }

  const supabase = await createSupabaseRSCClient();
  const accessProfile = await loadPortalAccess(supabase);

  if (!accessProfile) {
    redirect(`/auth/start?next=/ops/organizations/${organizationId}`);
  }

  const tab = coerceTab(searchParams?.tab);
  const access = buildAccess(accessProfile, organizationId);
  const availableTabs = buildAvailableTabs(access);

  if (!availableTabs.some((entry) => entry.id === tab)) {
    redirect(tab === 'overview' ? `/ops/organizations/${organizationId}` : `/ops/organizations/${organizationId}`);
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
  const shouldLoadAppointments = tab === 'appointments' && access.canManageAppointments;
  const shouldLoadCosts = tab === 'costs' && access.canManageCosts;
  const shouldLoadStaffRates = (shouldLoadCosts || shouldLoadAppointments) && access.canViewCosts;

  const [members, roles, invites, inviteRateLimit, appointments, staffRates, costCategories, serviceCatalog, costDimensions] = await Promise.all([
    tab === 'members' && access.canManageMembers ? fetchOrgMembersWithRoles(supabase, organizationId) : Promise.resolve(null),
    tab === 'members' && access.canManageMembers ? fetchOrgRoles(supabase, organizationId) : Promise.resolve(null),
    tab === 'invites' && access.canManageInvites ? fetchOrgInvites(supabase, organizationId, 50) : Promise.resolve(null),
    tab === 'invites' && access.canManageInvites
      ? checkRateLimit({
          supabase,
          type: ORG_INVITE_EVENT,
          limit: ORG_INVITE_RATE_LIMIT.limit,
          cooldownMs: ORG_INVITE_RATE_LIMIT.cooldownMs,
        })
      : Promise.resolve(null),
    shouldLoadAppointments
      ? (async () => {
          await ensurePortalProfile(supabase, accessProfile.userId);
          return fetchScopedAppointments(supabase, accessProfile, { includeCompleted: true, targetOrgId: organizationId });
        })()
      : Promise.resolve(null),
    shouldLoadStaffRates ? fetchStaffRates(supabase, organizationId) : Promise.resolve(null),
    shouldLoadCosts ? fetchCostCategories(supabase) : Promise.resolve(null),
    shouldLoadCosts ? fetchServiceCatalog(supabase) : Promise.resolve(null),
    shouldLoadCosts ? fetchCostDimensions(supabase) : Promise.resolve(null),
  ]);

  return {
    access,
    accessProfile,
    organizationId,
    tab,
    availableTabs,
    data: {
      organization: orgRow,
      members,
      roles,
      invites,
      inviteRateLimit,
      appointments,
      staffRates,
      costCategories,
      serviceCatalog,
      costDimensions,
      selectedFeatures,
    },
  };
}
