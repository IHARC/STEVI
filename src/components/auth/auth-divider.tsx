'use client';

import { Separator } from '@/components/ui/separator';

type AuthDividerProps = {
  label?: string;
};

export function AuthDivider({ label = 'or continue with email' }: AuthDividerProps) {
  return (
    <div className="relative py-space-2xs">
      <Separator className="bg-outline/30" />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="bg-surface px-space-sm text-label-sm font-medium text-muted-foreground">
          {label}
        </span>
      </span>
    </div>
  );
}
