import type { ReactNode } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@shared/ui/breadcrumb';
import { Button } from '@shared/ui/button';
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
  titleAddon?: ReactNode;
  primaryAction?: HeaderAction;
  secondaryAction?: HeaderAction;
  helperLink?: HeaderAction;
  meta?: HeaderMeta[];
  align?: 'start' | 'center';
  density?: 'default' | 'compact';
  children?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: HeaderBreadcrumb[];
};

const metaToneClasses: Record<NonNullable<HeaderMeta['tone']>, string> = {
  info: 'border-info/30 text-info',
  success: 'border-success/40 text-success',
  warning: 'border-warning/40 text-warning',
  neutral: 'border-border text-muted-foreground',
};

export function PageHeader({
  eyebrow,
  title,
  description,
  titleAddon,
  primaryAction,
  secondaryAction,
  helperLink,
  meta = [],
  align = 'start',
  density = 'default',
  children,
  actions,
  breadcrumbs = [],
}: PageHeaderProps) {
  const alignment = align === 'center' ? 'items-center justify-center text-center' : 'items-start justify-between';
  const textAlign = align === 'center' ? 'items-center text-center' : 'items-start text-left';
  const densityClasses = density === 'compact' ? 'gap-3 pb-4' : 'gap-4 pb-6';

  return (
    <header className={cn('flex flex-wrap border-b border-border/60', densityClasses, alignment)}>
      <div className={cn('flex flex-1 flex-col gap-3', textAlign)}>
        {breadcrumbs.length ? <BreadcrumbNav breadcrumbs={breadcrumbs} /> : null}
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{eyebrow}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
            {title}
          </h1>
          {meta.length ? (
            <div className="flex flex-wrap items-center gap-2" aria-label="Page metadata">
              {meta.map((item) => (
                <span
                  key={item.label}
                 
                  className={cn('text-xs font-semibold uppercase', metaToneClasses[item.tone ?? 'neutral'])}
                >
                  {item.label}
                </span>
              ))}
            </div>
          ) : null}
          {titleAddon ? <div className="flex items-center">{titleAddon}</div> : null}
        </div>
        {description ? <div className="text-base text-muted-foreground">{description}</div> : null}
        {actions ? <div className="pt-1">{actions}</div> : null}
        {children}
      </div>

      {primaryAction || secondaryAction || helperLink ? (
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap justify-end gap-2">
            {secondaryAction ? (
              <Button asChild variant="outline">
                <Link href={secondaryAction.href} aria-label={secondaryAction.ariaLabel ?? secondaryAction.label}>
                  {secondaryAction.icon ? (
                    <secondaryAction.icon className="mr-2 h-4 w-4" aria-hidden />
                  ) : null}
                  {secondaryAction.label}
                </Link>
              </Button>
            ) : null}
            {helperLink ? (
              <Button asChild variant="ghost">
                <Link href={helperLink.href} aria-label={helperLink.ariaLabel ?? helperLink.label}>
                  {helperLink.icon ? <helperLink.icon className="mr-2 h-4 w-4" aria-hidden /> : null}
                  {helperLink.label}
                </Link>
              </Button>
            ) : null}
            {primaryAction ? (
              <Button asChild>
                <Link href={primaryAction.href} aria-label={primaryAction.ariaLabel ?? primaryAction.label}>
                  {primaryAction.icon ? <primaryAction.icon className="mr-2 h-4 w-4" aria-hidden /> : null}
                  {primaryAction.label}
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}

function BreadcrumbNav({ breadcrumbs }: { breadcrumbs: HeaderBreadcrumb[] }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => (
          <BreadcrumbItem key={`${crumb.label}-${index}`}>
            {crumb.href ? (
              <BreadcrumbLink asChild>
                <Link href={crumb.href}>{crumb.label}</Link>
              </BreadcrumbLink>
            ) : (
              <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
            )}
            {index < breadcrumbs.length - 1 ? <BreadcrumbSeparator /> : null}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
