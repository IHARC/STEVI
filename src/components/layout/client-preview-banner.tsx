'use client';

import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { usePortalLayout } from '@/components/providers/portal-layout-provider';

export function ClientPreviewBanner() {
  const { isClientPreview, clientPreviewExitPath, primaryAreaLabel } = usePortalLayout();

  if (!isClientPreview) {
    return null;
  }

  const workspaceLabel = primaryAreaLabel || 'area';

  return (
    <Alert
      role="status"
      className="rounded-none border-0 border-b border-outline/20 bg-surface-container-low text-on-surface"
    >
      <div className="mx-auto flex w-full max-w-page flex-wrap items-center justify-between gap-space-sm px-space-md">
        <div className="space-y-space-2xs">
          <AlertTitle className="text-label-sm font-semibold uppercase text-primary">Client preview</AlertTitle>
          <AlertDescription className="text-body-sm text-on-surface/80">
            You’re viewing the client portal as a {workspaceLabel.toLowerCase()}. Some actions are limited to prevent
            accidental changes. Switch back when you’re ready to keep working.
          </AlertDescription>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={clientPreviewExitPath}>Exit preview</Link>
        </Button>
      </div>
    </Alert>
  );
}
