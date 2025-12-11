'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@shared/ui/button';
import type { ReactNode } from 'react';

export function FormSubmit({ children, disabled, pendingLabel }: { children: ReactNode; disabled?: boolean; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={disabled || pending}>
      {pending ? pendingLabel ?? 'Saving…' : children}
    </Button>
  );
}
