'use client';

import type { ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useWorkspaceContext } from '@/components/providers/workspace-provider';

type ClientPreviewGuardProps = {
  children: ReactNode;
  message?: string;
};

export function ClientPreviewGuard({ children, message }: ClientPreviewGuardProps) {
  const { isClientPreview } = useWorkspaceContext();

  if (!isClientPreview) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-space-sm">
      <Alert className="border-amber-200 bg-amber-50 text-amber-900">
        <AlertTitle className="text-label-sm font-semibold uppercase">Client preview</AlertTitle>
        <AlertDescription className="text-body-sm">
          {message ?? 'Actions are disabled while you are previewing the client portal. Exit preview to continue.'}
        </AlertDescription>
      </Alert>
      {children}
      <p className="text-label-sm text-muted-foreground">
        You can exit preview from the workspace switcher or banner to re-enable actions.
      </p>
    </div>
  );
}
