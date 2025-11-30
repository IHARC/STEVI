'use client';

import { PortalNavClient } from '@/components/layout/portal-nav-client';
import { useWorkspaceContext } from '@/components/providers/workspace-provider';
import type { PortalLink } from '@/lib/portal-access';

type WorkspaceClientNavProps = {
  links: PortalLink[];
};

export function WorkspaceClientNav({ links }: WorkspaceClientNavProps) {
  const { activeWorkspace } = useWorkspaceContext();

  if (activeWorkspace !== 'client' || links.length === 0) {
    return null;
  }

  return <PortalNavClient links={links} className="lg:hidden" />;
}
