'use client';

import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { usePortalLayout } from '@shared/providers/portal-layout-provider';

export function ClientPreviewBanner() {
  const { isClientPreview, clientPreviewExitPath, primaryAreaLabel } = usePortalLayout();

  if (!isClientPreview) {
    return null;
  }

  const operationsLabel = primaryAreaLabel || 'area';

  return (
    <Alert
      role="status"
      className="rounded-none border-0 border-b border-border/40 bg-muted text-foreground"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4">
        <div className="space-y-1">
          <AlertTitle className="text-xs font-semibold uppercase text-primary">Client preview</AlertTitle>
          <AlertDescription className="text-sm text-foreground/80">
            You’re viewing the client portal as an {operationsLabel.toLowerCase()} user. Some actions are limited to
            prevent accidental changes. Switch back when you’re ready to keep working.
          </AlertDescription>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={clientPreviewExitPath}>Exit preview</Link>
        </Button>
      </div>
    </Alert>
  );
}
