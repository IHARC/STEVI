'use client';

import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { PortalArea } from '@/lib/portal-navigation';

export type PortalLayoutContextValue = {
  activeArea: PortalArea;
  landingPath: string;
  isClientPreview: boolean;
  clientPreviewExitPath: string;
  primaryAreaLabel: string;
};

const PortalLayoutContext = createContext<PortalLayoutContextValue | null>(null);

type PortalLayoutProviderProps = {
  value: PortalLayoutContextValue;
  children: ReactNode;
};

export function PortalLayoutProvider({ value, children }: PortalLayoutProviderProps) {
  return <PortalLayoutContext.Provider value={value}>{children}</PortalLayoutContext.Provider>;
}

export function usePortalLayout(): PortalLayoutContextValue {
  const value = useContext(PortalLayoutContext);

  if (!value) {
    throw new Error('usePortalLayout must be used within a PortalLayoutProvider');
  }

  return value;
}

export function useOptionalPortalLayout(): PortalLayoutContextValue | null {
  return useContext(PortalLayoutContext);
}
