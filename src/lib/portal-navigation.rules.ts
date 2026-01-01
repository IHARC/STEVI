import type { PortalAccess } from '@/lib/portal-access';
import type { NavRuleKey } from '@/lib/portal-navigation.data';

export type NavRule = (access: PortalAccess) => boolean;

export const NAV_RULES: Record<NavRuleKey, NavRule> = {
  frontline_access: (access) => access.canAccessOpsFrontline,
  clients_access: (access) => access.canAccessOpsFrontline || access.canManageConsents,
  programs_access: (access) => access.canAccessOpsFrontline || access.canAccessOpsAdmin,
  inventory_access: (access) => access.canAccessInventoryOps,
  fundraising_access: (access) => access.canAccessOpsSteviAdmin,
  reports_access: (access) =>
    access.canReportCosts ||
    access.canViewMetrics ||
    (access.organizationFeatures.includes('calls_for_service') && access.canAccessCfs),
  time_tracking_access: (access) =>
    access.organizationFeatures.includes('time_tracking') &&
    (access.canTrackTime || access.canViewAllTime || access.canManageTime),
  cfs_access: (access) => access.organizationFeatures.includes('calls_for_service') && access.canAccessCfs,
  organizations_access: (access) =>
    access.canAccessOpsFrontline || access.canAccessOpsOrg || access.canAccessOpsAdmin || access.canAccessOpsSteviAdmin,
  org_scoped_organizations_access: (access) =>
    access.canAccessOpsOrg &&
    access.profile.affiliation_type === 'agency_partner' &&
    !access.isIharcMember &&
    !access.isGlobalAdmin,
  manage_consents: (access) => access.canManageConsents,
  preview_client_portal: (access) => access.canAccessOpsFrontline || access.canAccessOpsAdmin || access.canAccessOpsOrg,
  report_costs: (access) => access.canReportCosts,
};

export function checkNavRule(access: PortalAccess, requires?: NavRuleKey | NavRuleKey[]): boolean {
  if (!requires) return true;
  if (Array.isArray(requires)) {
    return requires.every((ruleKey) => NAV_RULES[ruleKey](access));
  }
  return NAV_RULES[requires](access);
}
