'use client';

import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { PortalAccess } from '@/lib/portal-access';

const PortalAccessContext = createContext<PortalAccess | null>(null);

type PortalAccessProviderProps = {
  access: PortalAccess | null;
  children: ReactNode;
};

export function PortalAccessProvider({ access, children }: PortalAccessProviderProps) {
  return <PortalAccessContext.Provider value={access}>{children}</PortalAccessContext.Provider>;
}

export function usePortalAccess() {
  return useContext(PortalAccessContext);
}
