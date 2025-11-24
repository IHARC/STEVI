'use client';

import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { WorkspaceId, WorkspaceOption } from '@/lib/workspaces';

export type WorkspaceContextValue = {
  activeWorkspace: WorkspaceId;
  availableWorkspaces: WorkspaceOption[];
  defaultPath: string;
  previewExitPath: string;
  isClientPreview: boolean;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

type WorkspaceProviderProps = {
  value: WorkspaceContextValue;
  children: ReactNode;
};

export function WorkspaceProvider({ value, children }: WorkspaceProviderProps) {
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspaceContext(): WorkspaceContextValue {
  const value = useContext(WorkspaceContext);

  if (!value) {
    throw new Error('useWorkspaceContext must be used within a WorkspaceProvider');
  }

  return value;
}
