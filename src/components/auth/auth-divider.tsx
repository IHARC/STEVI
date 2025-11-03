'use client';

import { Separator } from '@/components/ui/separator';

type AuthDividerProps = {
  label?: string;
};

export function AuthDivider({ label = 'or continue with email' }: AuthDividerProps) {
  return (
    <div className="relative py-1">
      <Separator className="bg-slate-200 dark:bg-slate-700" />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="bg-white px-3 text-xs font-medium text-muted dark:bg-slate-900">
          {label}
        </span>
      </span>
    </div>
  );
}
