import type { ReactNode } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Badge } from '@/components/ui/badge';
import { SplitButton } from '@/components/ui/split-button';
import { cn } from '@/lib/utils';

type HeaderAction = {
  label: string;
  href: string;
  icon?: LucideIcon;
  ariaLabel?: string;
};

type HeaderMeta = { label: string; tone?: 'info' | 'success' | 'warning' | 'neutral' };

type HeaderBreadcrumb = { label: string; href?: string };

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  primaryAction?: HeaderAction;
  secondaryAction?: HeaderAction;
  helperLink?: HeaderAction;
  meta?: HeaderMeta[];
  align?: 'start' | 'center';
  children?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: HeaderBreadcrumb[];
  useSplitActions?: boolean;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  helperLink,
  meta = [],
  align = 'start',
  children,
  actions,
  breadcrumbs = [],
  useSplitActions = true,
}: PageHeaderProps) {
  const alignment = align === 'center' ? 'items-center justify-center text-center' : 'items-start justify-between text-left';
  const widthClass = align === 'center' ? 'max-w-3xl' : 'max-w-4xl';

  return (
    <header
      className={cn(
        'flex flex-wrap gap-space-md border-b border-outline/10 pb-space-md pt-space-sm',
        alignment,
      )}
    >
      <div className={cn('flex flex-1 flex-col gap-space-xs', widthClass)}>
        {breadcrumbs.length ? (
          <nav aria-label="Breadcrumb" className="text-label-sm text-on-surface-variant">
            <ol className="flex flex-wrap items-center gap-space-2xs">
              {breadcrumbs.map((crumb, index) => (
                <li key={`${crumb.label}-${index}`} className="inline-flex items-center gap-space-2xs">
                  {crumb.href ? (
                    <Link href={crumb.href} className="hover:underline">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span aria-current="page" className="font-semibold text-on-surface">
                      {crumb.label}
                    </span>
                  )}
                  {index < breadcrumbs.length - 1 ? <span aria-hidden="true">/</span> : null}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        {eyebrow ? (
          <p className="text-label-sm font-medium text-on-surface-variant">{eyebrow}</p>
        ) : null}
        <div className="flex flex-wrap items-start gap-space-sm">
          <h1 className="text-headline-sm text-on-surface sm:text-headline-md">{title}</h1>
          {meta.length ? (
            <div className="flex flex-wrap items-center gap-space-2xs" aria-label="Page metadata">
              {meta.map((item) => (
                <Badge
                  key={item.label}
                  variant={item.tone === 'warning' ? 'secondary' : 'outline'}
                  className={cn(
                    'text-label-sm uppercase',
                    item.tone === 'info' && 'border-primary/30 text-primary',
                    item.tone === 'success' && 'border-tertiary/30 text-tertiary',
                    item.tone === 'warning' && 'border-error/30 bg-error-container text-on-error-container',
                  )}
                >
                  {item.label}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
        {description ? (
          <div className="text-body-md text-on-surface-variant sm:text-body-lg">{description}</div>
        ) : null}
        {actions ? <div className="pt-space-2xs">{actions}</div> : null}
        {children}
      </div>
      {primaryAction || secondaryAction || helperLink ? (
        <div className="flex flex-col items-end gap-space-xs">
          {primaryAction && secondaryAction && useSplitActions ? (
            <SplitButton
              primary={primaryAction}
              menuActions={[secondaryAction, ...(helperLink ? [helperLink] : [])]}
              className="w-full sm:w-auto"
            />
          ) : (
            <div className="flex flex-wrap items-center justify-end gap-space-xs">
              {primaryAction ? (
                <Button asChild className="w-full sm:w-auto">
                  <Link href={primaryAction.href} aria-label={primaryAction.ariaLabel ?? primaryAction.label}>
                    {primaryAction.icon ? <Icon icon={primaryAction.icon} size="sm" className="mr-space-2xs" /> : null}
                    {primaryAction.label}
                  </Link>
                </Button>
              ) : null}
              {secondaryAction ? (
                <Button asChild variant="secondary" className="w-full sm:w-auto">
                  <Link href={secondaryAction.href} aria-label={secondaryAction.ariaLabel ?? secondaryAction.label}>
                    {secondaryAction.icon ? <Icon icon={secondaryAction.icon} size="sm" className="mr-space-2xs" /> : null}
                    {secondaryAction.label}
                  </Link>
                </Button>
              ) : null}
              {helperLink ? (
                <Button asChild variant="ghost" size="sm" className="w-full text-label-sm sm:w-auto">
                  <Link href={helperLink.href} aria-label={helperLink.ariaLabel ?? helperLink.label}>
                    {helperLink.icon ? <Icon icon={helperLink.icon} size="sm" className="mr-space-2xs" /> : null}
                    {helperLink.label}
                  </Link>
                </Button>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </header>
  );
}
