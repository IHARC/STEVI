import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-space-sm rounded-[var(--md-sys-shape-corner-large)] border border-outline/12 bg-surface-container-low p-space-lg text-center',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <p className="text-title-md text-on-surface">{title}</p>
      {description ? <p className="text-body-sm text-on-surface-variant">{description}</p> : null}
      {action ? <div className="flex justify-center">{action}</div> : null}
    </div>
  );
}
