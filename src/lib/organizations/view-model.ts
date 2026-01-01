import type { OrgTab, OrganizationDetailContext } from './loaders';

export type OrganizationTabLink = {
  id: OrgTab;
  label: string;
  href: string;
  isActive: boolean;
};

export type OrganizationDetailViewModel = {
  organizationId: number;
  orgName: string;
  tab: OrgTab;
  tabs: OrganizationTabLink[];
  overviewHref: string;
  selectedFeatures: OrganizationDetailContext['data']['selectedFeatures'];
  staffRoles: string[];
  access: OrganizationDetailContext['access'];
};

export function buildOrganizationTabHref(organizationId: number, tab: OrgTab): string {
  if (tab === 'overview') return `/ops/organizations/${organizationId}`;
  return `/ops/organizations/${organizationId}?tab=${tab}`;
}

export function buildOrganizationDetailViewModel(context: OrganizationDetailContext): OrganizationDetailViewModel {
  const { organizationId, tab, availableTabs, data, access } = context;
  const orgName = data.organization.name ?? 'Organization';
  const staffRoles = data.staffRates
    ? Array.from(new Set(data.staffRates.map((rate) => rate.role_name))).sort((a, b) => a.localeCompare(b))
    : [];

  const tabs = availableTabs.map((entry) => ({
    ...entry,
    href: buildOrganizationTabHref(organizationId, entry.id),
    isActive: entry.id === tab,
  }));

  return {
    organizationId,
    orgName,
    tab,
    tabs,
    overviewHref: buildOrganizationTabHref(organizationId, 'overview'),
    selectedFeatures: data.selectedFeatures,
    staffRoles,
    access,
  };
}
