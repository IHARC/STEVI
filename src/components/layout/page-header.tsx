import type { ReactNode } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

type HeaderAction = {
  label: string;
  href: string;
  icon?: LucideIcon;
  ariaLabel?: string;
};

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  primaryAction?: HeaderAction;
  secondaryAction?: HeaderAction;
  align?: 'start' | 'center';
  children?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  align = 'start',
  children,
  actions,
}: PageHeaderProps) {
  const alignment = align === 'center' ? 'items-center justify-center text-center' : 'items-start justify-between text-left';
  const widthClass = align === 'center' ? 'max-w-3xl' : 'max-w-4xl';

  return (
    <header
      className={cn(
        'flex flex-wrap gap-space-md border-b border-outline/12 pb-space-md pt-space-sm',
        alignment,
      )}
    >
      <div className={cn('space-y-space-2xs', widthClass)}>
        {eyebrow ? (
          <p className="text-label-sm font-medium text-on-surface-variant">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-headline-sm text-on-surface sm:text-headline-md">{title}</h1>
        {description ? (
          <div className="text-body-md text-on-surface-variant sm:text-body-lg">{description}</div>
        ) : null}
        {actions ? <div className="pt-space-2xs">{actions}</div> : null}
        {children}
      </div>
      {primaryAction || secondaryAction ? (
        <div className="flex flex-wrap items-center gap-space-xs">
          {primaryAction ? (
            <Button asChild>
              <Link href={primaryAction.href} aria-label={primaryAction.ariaLabel ?? primaryAction.label}>
                {primaryAction.icon ? <Icon icon={primaryAction.icon} size="sm" className="mr-space-2xs" /> : null}
                {primaryAction.label}
              </Link>
            </Button>
          ) : null}
          {secondaryAction ? (
            <Button asChild variant="secondary">
              <Link href={secondaryAction.href} aria-label={secondaryAction.ariaLabel ?? secondaryAction.label}>
                {secondaryAction.icon ? <Icon icon={secondaryAction.icon} size="sm" className="mr-space-2xs" /> : null}
                {secondaryAction.label}
              </Link>
            </Button>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
