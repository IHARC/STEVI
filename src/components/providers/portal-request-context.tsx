import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { PortalAccess } from '@/lib/portal-access';
import type { WorkspaceId } from '@/lib/workspaces';

export type PortalRequestContextValue = {
  portalAccess: PortalAccess;
  defaultWorkspacePath: string;
  activeWorkspace: WorkspaceId;
};

const PortalRequestContext = createContext<PortalRequestContextValue | null>(null);

export function PortalRequestProvider({
  value,
  children,
}: {
  value: PortalRequestContextValue;
  children: ReactNode;
}) {
  return <PortalRequestContext.Provider value={value}>{children}</PortalRequestContext.Provider>;
}

export function usePortalRequestContext(): PortalRequestContextValue {
  const context = useContext(PortalRequestContext);

  if (!context) {
    throw new Error('usePortalRequestContext must be used within a PortalRequestProvider');
  }

  return context;
}

export function useOptionalPortalRequestContext(): PortalRequestContextValue | null {
  return useContext(PortalRequestContext);
}
