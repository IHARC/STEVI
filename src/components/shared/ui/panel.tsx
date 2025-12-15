import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const panelVariants = cva('border', {
  variants: {
    surface: {
      card: 'bg-card text-card-foreground',
      background: 'bg-background text-foreground',
      muted: 'bg-muted text-foreground',
      soft: 'bg-muted/30 text-foreground',
      transparent: '',
    },
    borderTone: {
      subtle: 'border-border/20',
      default: 'border-border/30',
      strong: 'border-border/50',
      none: 'border-transparent',
    },
    radius: {
      '3xl': 'rounded-3xl',
      '2xl': 'rounded-2xl',
      xl: 'rounded-xl',
      lg: 'rounded-lg',
      none: 'rounded-none',
    },
    padding: {
      none: 'p-0',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    },
    elevation: {
      none: '',
      sm: 'shadow-sm',
      md: 'shadow-md',
    },
    interactive: {
      true: 'transition hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      false: '',
    },
  },
  defaultVariants: {
    surface: 'card',
    borderTone: 'default',
    radius: '2xl',
    padding: 'md',
    elevation: 'sm',
    interactive: false,
  },
});

export type PanelProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof panelVariants> & {
    asChild?: boolean;
  };

export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  ({ asChild = false, className, surface, borderTone, radius, padding, elevation, interactive, ...props }, ref) => {
    const Comp = asChild ? Slot : 'div';
    return (
      <Comp
        ref={ref}
        className={cn(panelVariants({ surface, borderTone, radius, padding, elevation, interactive }), className)}
        {...props}
      />
    );
  },
);
Panel.displayName = 'Panel';
