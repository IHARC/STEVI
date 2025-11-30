import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  align?: 'start' | 'center';
  padded?: boolean;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  align = 'start',
  padded = false,
}: PageHeaderProps) {
  const alignment = align === 'center' ? 'items-center text-center' : 'items-start text-left';
  const width = align === 'center' ? 'max-w-3xl' : 'max-w-4xl';

  return (
    <header
      className={cn(
        'flex w-full flex-col gap-space-2xs',
        alignment,
        padded ? 'rounded-2xl border border-outline/10 bg-surface px-space-lg py-space-md shadow-level-1' : null,
      )}
    >
      {eyebrow ? (
        <p className="inline-flex items-center gap-space-2xs rounded-full bg-surface-container-low px-space-sm py-space-3xs text-label-sm font-semibold uppercase tracking-label-uppercase text-primary">
          {eyebrow}
        </p>
      ) : null}
      <h1 className={cn('text-headline-lg text-on-surface sm:text-display-sm', width)}>{title}</h1>
      {description ? (
        <div className={cn('text-body-md text-muted-foreground sm:text-body-lg', width)}>
          {description}
        </div>
      ) : null}
      {actions ? <div className="flex flex-wrap gap-space-sm pt-space-sm">{actions}</div> : null}
    </header>
  );
}
