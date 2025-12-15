import * as React from 'react';
import { cn } from '@/lib/utils';

export type NativeCheckboxProps = Omit<React.ComponentProps<'input'>, 'type'>;

export function NativeCheckbox({ className, ...props }: NativeCheckboxProps) {
  return (
    <input
      type="checkbox"
      className={cn(
        'h-4 w-4 rounded border border-input text-primary shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

