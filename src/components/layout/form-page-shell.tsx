import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const maxWidthMap = {
  'form-sm': 'max-w-form-sm',
  'form-md': 'max-w-form-md',
  'form-lg': 'max-w-form-lg',
  xl: 'max-w-page',
  page: 'max-w-page',
} as const;

type FormPageShellProps = {
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
  maxWidth?: keyof typeof maxWidthMap;
  align?: 'start' | 'center';
  spacing?: 'md' | 'lg';
};

export function FormPageShell({
  children,
  eyebrow,
  title,
  description,
  actions,
  maxWidth = 'form-lg',
  align = 'start',
  spacing = 'lg',
}: FormPageShellProps) {
  const alignmentClass = align === 'center' ? 'items-center text-center' : 'items-start text-left';
  const headerWidthClass = align === 'center' ? 'max-w-2xl' : 'max-w-3xl';
  const containerGap = spacing === 'md' ? 'gap-space-lg' : 'gap-space-xl';
  const hasHeader = Boolean(eyebrow || title || description || actions);

  return (
    <div className="page-shell">
      <div className={cn('mx-auto flex w-full flex-col', containerGap, maxWidthMap[maxWidth])}>
        {hasHeader ? (
          <header className={cn('flex w-full flex-col gap-space-xs', alignmentClass)}>
            {eyebrow ? (
              <p className="text-label-sm font-medium uppercase text-muted-foreground">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h1 className={cn('text-headline-lg text-on-surface sm:text-display-sm', headerWidthClass)}>
                {title}
              </h1>
            ) : null}
            {description ? (
              typeof description === 'string' ? (
                <p className={cn('text-body-md text-muted-foreground sm:text-body-lg', headerWidthClass)}>
                  {description}
                </p>
              ) : (
                <div className={cn('text-body-md text-muted-foreground sm:text-body-lg', headerWidthClass)}>
                  {description}
                </div>
              )
            ) : null}
            {actions ? <div className="flex flex-wrap gap-space-sm pt-space-sm">{actions}</div> : null}
          </header>
        ) : null}
        {children}
      </div>
    </div>
  );
}
