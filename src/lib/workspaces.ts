import type { PortalAccess } from '@/lib/portal-access';
import { getWorkspaceNavBlueprint } from '@/lib/workspace-nav-blueprints';
import type { WorkspaceId as WorkspaceIdentifier } from '@/lib/workspace-types';
import { stripRouteGroups } from '@/lib/paths';

export type WorkspaceId = WorkspaceIdentifier;

export type WorkspaceOption = {
  id: WorkspaceId;
  label: string;
  href: string;
  description?: string;
  roleLabel?: string;
  statusLabel?: string;
  statusTone?: 'success' | 'warning' | 'critical' | 'neutral';
};

export type WorkspaceQuickAction = {
  id: string;
  label: string;
  href: string;
  description?: string;
  icon?: string;
  disabled?: boolean;
};

const WORKSPACE_PRIORITY: WorkspaceId[] = ['admin', 'org', 'staff', 'client'];

function workspaceEntryPath(workspaceId: WorkspaceId): string {
  const blueprint = getWorkspaceNavBlueprint(workspaceId);
  if (blueprint?.defaultRoute) {
    return blueprint.defaultRoute;
  }

  switch (workspaceId) {
    case 'admin':
      return '/admin';
    case 'org':
      return '/org';
    case 'staff':
      return '/staff';
    case 'client':
    default:
      return '/home';
  }
}

export function resolveWorkspaceOptions(access: PortalAccess | null): WorkspaceOption[] {
  if (!access) {
    return [clientWorkspace()];
  }

  const options: WorkspaceOption[] = [
    clientWorkspace({
      roleLabel: resolveRoleLabel(access, 'client'),
      statusLabel: resolveStatusLabel(access),
      statusTone: resolveStatusTone(access),
    }),
  ];

  if (access.canAccessAdminWorkspace) {
    options.push({
      id: 'admin',
      label: 'Admin workspace',
      href: workspaceEntryPath('admin'),
      description: 'Team tooling for moderation, content, and operations.',
      roleLabel: resolveRoleLabel(access, 'admin'),
      statusLabel: resolveStatusLabel(access),
      statusTone: resolveStatusTone(access),
    });
  }

  if (access.canAccessOrgWorkspace) {
    options.push({
      id: 'org',
      label: 'Organization workspace',
      href: workspaceEntryPath('org'),
      description: 'Org-scoped controls for members, invites, and settings.',
      roleLabel: resolveRoleLabel(access, 'org'),
      statusLabel: resolveStatusLabel(access),
      statusTone: resolveStatusTone(access),
    });
  }

  if (access.canAccessStaffWorkspace) {
    options.push({
      id: 'staff',
      label: 'Staff workspace',
      href: workspaceEntryPath('staff'),
      description: 'IHARC staff and volunteer caseload + outreach tools.',
      roleLabel: resolveRoleLabel(access, 'staff'),
      statusLabel: resolveStatusLabel(access),
      statusTone: resolveStatusTone(access),
    });
  }

  return options;
}

export function resolveDefaultWorkspace(access: PortalAccess | null): WorkspaceOption {
  const options = resolveWorkspaceOptions(access);
  const priority = WORKSPACE_PRIORITY.find((id) => options.some((option) => option.id === id));

  if (priority) {
    const match = options.find((option) => option.id === priority);
    if (match) return match;
  }

  return clientWorkspace();
}

export function resolveDefaultWorkspacePath(access: PortalAccess | null): string {
  return resolveDefaultWorkspace(access).href;
}

export function inferWorkspaceFromPath(pathname: string): WorkspaceId {
  const normalizedPath = stripRouteGroups(pathname);

  if (normalizedPath.startsWith('/admin')) return 'admin';
  if (normalizedPath.startsWith('/org')) return 'org';
  if (normalizedPath.startsWith('/staff')) return 'staff';
  return 'client';
}

export function isClientPreview(access: PortalAccess | null, activeWorkspace: WorkspaceId): boolean {
  if (activeWorkspace !== 'client') return false;
  const options = resolveWorkspaceOptions(access);
  return options.some((option) => option.id !== 'client');
}

export function resolveWorkspaceQuickActions(
  access: PortalAccess | null,
  workspace: WorkspaceId,
  { isPreview }: { isPreview?: boolean } = {},
): WorkspaceQuickAction[] {
  if (!access) return [];

  const previewDisabled = Boolean(isPreview);

  if (workspace === 'client') {
    return [
      {
        id: 'client-request-appointment',
        label: 'Request appointment',
        href: '/appointments#request-form',
        description: 'Share availability with outreach staff',
        icon: 'calendar',
        disabled: previewDisabled,
      },
      {
        id: 'client-message-support',
        label: 'Message the team',
        href: '/support#message-tray',
        description: 'Ask for help or updates',
        icon: 'chat',
        disabled: previewDisabled,
      },
      {
        id: 'client-view-documents',
        label: 'View secure documents',
        href: '/documents',
        description: 'Check shared files and expiry',
        icon: 'file',
        disabled: false,
      },
    ];
  }

  if (workspace === 'staff') {
    return [
      {
        id: 'staff-add-outreach',
        label: 'Log outreach note',
        href: '/staff/outreach',
        description: 'Capture quick outreach details',
        icon: 'chat',
        disabled: previewDisabled,
      },
      {
        id: 'staff-new-case-note',
        label: 'Add case note',
        href: '/staff/cases',
        description: 'Open cases and add updates',
        icon: 'file',
        disabled: previewDisabled,
      },
    ];
  }

  if (workspace === 'org') {
    return [
      {
        id: 'org-new-invite',
        label: 'Invite member',
        href: '/org/invites',
        description: 'Send an organization invite',
        icon: 'chat',
        disabled: previewDisabled,
      },
      {
        id: 'org-add-profile',
        label: 'Update org profile',
        href: '/org/settings',
        description: 'Edit details and contacts',
        icon: 'file',
        disabled: previewDisabled,
      },
    ];
  }

  if (workspace === 'admin') {
    return [
      {
        id: 'admin-invite-user',
        label: 'Invite user',
        href: '/admin/profiles',
        description: 'Send portal invite',
        icon: 'chat',
        disabled: previewDisabled,
      },
      {
        id: 'admin-new-notification',
        label: 'Send notification',
        href: '/admin/notifications',
        description: 'Queue SMS or email',
        icon: 'file',
        disabled: previewDisabled,
      },
    ];
  }

  return [];
}

function clientWorkspace(overrides: Partial<WorkspaceOption> = {}): WorkspaceOption {
  return {
    id: 'client',
    label: 'Client portal',
    href: workspaceEntryPath('client'),
    description: 'Client-facing navigation for neighbours using STEVI.',
    roleLabel: 'Client',
    statusLabel: 'Approved',
    statusTone: 'neutral',
    ...overrides,
  };
}

function resolveRoleLabel(access: PortalAccess, workspace: WorkspaceId): string {
  switch (workspace) {
    case 'admin':
      if (access.portalRoles.includes('portal_admin')) return 'Portal admin';
      if (access.iharcRoles.includes('iharc_admin')) return 'IHARC admin';
      if (access.portalRoles.includes('portal_org_admin')) return 'Org admin';
      return 'Admin';
    case 'org':
      if (access.portalRoles.includes('portal_org_admin')) return 'Org admin';
      if (access.portalRoles.includes('portal_org_rep')) return 'Org rep';
      return 'Organization';
    case 'staff':
      if (access.iharcRoles.includes('iharc_supervisor')) return 'IHARC supervisor';
      if (access.iharcRoles.includes('iharc_staff')) return 'IHARC staff';
      if (access.iharcRoles.includes('iharc_volunteer')) return 'Volunteer';
      return 'Staff';
    case 'client':
    default:
      return 'Client';
  }
}

function resolveStatusLabel(access: PortalAccess): string {
  const status = access.profile.affiliation_status;
  if (status === 'approved') return 'Approved';
  if (status === 'pending') return 'Pending review';
  if (status === 'revoked') return 'Suspended';
  return 'Unknown';
}

function resolveStatusTone(access: PortalAccess): WorkspaceOption['statusTone'] {
  const status = access.profile.affiliation_status;
  if (status === 'approved') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'revoked') return 'critical';
  return 'neutral';
}
