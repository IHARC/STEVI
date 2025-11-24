import type { PortalAccess } from '@/lib/portal-access';

export type WorkspaceId = 'client' | 'admin' | 'org' | 'staff';

export type WorkspaceOption = {
  id: WorkspaceId;
  label: string;
  href: string;
  description?: string;
};

const WORKSPACE_PRIORITY: WorkspaceId[] = ['admin', 'org', 'staff', 'client'];

export function resolveWorkspaceOptions(access: PortalAccess | null): WorkspaceOption[] {
  if (!access) {
    return [clientWorkspace()];
  }

  const options: WorkspaceOption[] = [clientWorkspace()];

  if (access.canAccessAdminWorkspace) {
    options.push({ id: 'admin', label: 'Admin workspace', href: '/admin', description: 'Team tooling for moderation, content, and operations.' });
  }

  if (access.canAccessOrgWorkspace) {
    options.push({
      id: 'org',
      label: 'Organization workspace',
      href: '/org',
      description: 'Org-scoped controls for members, invites, and settings.',
    });
  }

  if (access.canAccessStaffWorkspace) {
    options.push({
      id: 'staff',
      label: 'Staff workspace',
      href: '/staff',
      description: 'IHARC staff and volunteer caseload + outreach tools.',
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
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/org')) return 'org';
  if (pathname.startsWith('/staff')) return 'staff';
  return 'client';
}

export function isClientPreview(access: PortalAccess | null, activeWorkspace: WorkspaceId): boolean {
  if (activeWorkspace !== 'client') return false;
  const options = resolveWorkspaceOptions(access);
  return options.some((option) => option.id !== 'client');
}

function clientWorkspace(): WorkspaceOption {
  return {
    id: 'client',
    label: 'Client portal',
    href: '/home',
    description: 'Client-facing navigation for neighbours using STEVI.',
  };
}
