import { cva, type VariantProps } from 'class-variance-authority';

export const choiceCardVariants = cva(
  [
    'flex cursor-pointer border shadow-sm transition-colors',
    'focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background',
    'has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60',
    'has-[[data-state=checked]]:border-primary/60 has-[[data-state=checked]]:bg-muted/60',
  ].join(' '),
  {
    variants: {
      layout: {
        row: 'items-start gap-3 text-left',
        column: 'flex-col gap-2 text-left',
      },
      surface: {
        card: 'bg-card text-card-foreground',
        background: 'bg-background text-foreground',
        cardSoft: 'bg-card/80 text-card-foreground',
      },
      borderTone: {
        default: 'border-border/40',
        subtle: 'border-border/30',
      },
      radius: {
        xl: 'rounded-xl',
        lg: 'rounded-lg',
      },
      padding: {
        sm: 'p-3',
        md: 'p-4',
        compact: 'px-3 py-3',
        stack: 'px-4 py-3',
      },
      typography: {
        default: 'text-sm font-medium',
        none: '',
      },
      hover: {
        default: 'hover:border-primary/60 hover:bg-muted',
        border: 'hover:border-primary/50',
        none: '',
      },
    },
    defaultVariants: {
      layout: 'row',
      surface: 'card',
      borderTone: 'default',
      radius: 'xl',
      padding: 'sm',
      typography: 'default',
      hover: 'default',
    },
  },
);

export type ChoiceCardVariantProps = VariantProps<typeof choiceCardVariants>;

