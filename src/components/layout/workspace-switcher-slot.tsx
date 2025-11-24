'use client';

import { useOptionalWorkspaceContext } from '@/components/providers/workspace-provider';
import { WorkspaceSwitcher } from '@/components/layout/workspace-switcher';

export function WorkspaceSwitcherSlot() {
  const workspace = useOptionalWorkspaceContext();

  if (!workspace || workspace.availableWorkspaces.length <= 1) {
    return null;
  }

  return (
    <WorkspaceSwitcher
      activeWorkspace={workspace.activeWorkspace}
      options={workspace.availableWorkspaces}
      defaultPath={workspace.defaultPath}
      previewExitPath={workspace.previewExitPath}
      isClientPreview={workspace.isClientPreview}
    />
  );
}
