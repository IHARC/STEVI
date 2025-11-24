'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import type { PortalAccess } from '@/lib/portal-access';
import {
  inferWorkspaceFromPath,
  isClientPreview,
  resolveWorkspaceOptions,
} from '@/lib/workspaces';
import { WorkspaceProvider } from '@/components/providers/workspace-provider';

type WorkspaceContextProviderProps = {
  access: PortalAccess | null;
  defaultPath: string;
  children: ReactNode;
};

export function WorkspaceContextProvider({ access, defaultPath, children }: WorkspaceContextProviderProps) {
  const pathname = usePathname() ?? '/';
  const activeWorkspace = inferWorkspaceFromPath(pathname);
  const availableWorkspaces = useMemo(() => resolveWorkspaceOptions(access), [access]);

  const value = useMemo(
    () => ({
      activeWorkspace,
      availableWorkspaces,
      defaultPath,
      previewExitPath: defaultPath,
      isClientPreview: isClientPreview(access, activeWorkspace),
    }),
    [access, activeWorkspace, availableWorkspaces, defaultPath],
  );

  return <WorkspaceProvider value={value}>{children}</WorkspaceProvider>;
}
