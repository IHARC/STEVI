'use client';

import type { ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { usePortalLayout } from '@/components/providers/portal-layout-provider';

type ClientPreviewGuardProps = {
  children: ReactNode;
  message?: string;
};

export function ClientPreviewGuard({ children, message }: ClientPreviewGuardProps) {
  const { isClientPreview } = usePortalLayout();

  if (!isClientPreview) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-3">
      <Alert className="border-primary/30 bg-primary/10 text-foreground">
        <AlertTitle className="text-xs font-semibold uppercase">Client preview</AlertTitle>
        <AlertDescription className="text-sm">
          {message ?? 'Actions are disabled while you are previewing the client portal. Exit preview to continue.'}
        </AlertDescription>
      </Alert>
      {children}
      <p className="text-xs text-muted-foreground">
        Use the navigation links or the banner to exit preview and re-enable actions.
      </p>
    </div>
  );
}
