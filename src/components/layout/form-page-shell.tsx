import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const maxWidthMap = {
  'form-sm': 'max-w-xl',
  'form-md': 'max-w-2xl',
  'form-lg': 'max-w-3xl',
  xl: 'max-w-4xl',
  page: 'max-w-6xl',
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
  maxWidth = 'form-md',
  align = 'start',
  spacing = 'lg',
}: FormPageShellProps) {
  const alignmentClass = align === 'center' ? 'items-center text-center' : 'items-start text-left';
  const headerWidthClass = align === 'center' ? 'max-w-2xl' : 'max-w-3xl';
  const containerGap = spacing === 'md' ? 'gap-6' : 'gap-8';
  const hasHeader = Boolean(eyebrow || title || description || actions);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <div className={cn('mx-auto flex w-full flex-col', containerGap, maxWidthMap[maxWidth])}>
        {hasHeader ? (
          <header className={cn('flex w-full flex-col gap-2', alignmentClass)}>
            {eyebrow ? (
              <p className="text-xs font-medium uppercase text-muted-foreground">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h1 className={cn('text-3xl text-foreground sm:text-4xl', headerWidthClass)}>
                {title}
              </h1>
            ) : null}
            {description ? (
              typeof description === 'string' ? (
                <p className={cn('text-sm text-muted-foreground sm:text-base', headerWidthClass)}>
                  {description}
                </p>
              ) : (
                <div className={cn('text-sm text-muted-foreground sm:text-base', headerWidthClass)}>
                  {description}
                </div>
              )
            ) : null}
            {actions ? <div className="flex flex-wrap gap-3 pt-3">{actions}</div> : null}
          </header>
        ) : null}
        {children}
      </div>
    </div>
  );
}
