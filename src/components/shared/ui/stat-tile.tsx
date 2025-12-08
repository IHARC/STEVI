import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from './card';

type StatTileProps = {
  label: string;
  value: string;
  tone?: 'default' | 'warning' | 'info';
  icon?: LucideIcon;
  footnote?: string;
};

const toneClassMap: Record<NonNullable<StatTileProps['tone']>, string> = {
  default: 'border-border/70 bg-card text-foreground',
  warning:
    'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-50',
  info:
    'border-primary/30 bg-primary/10 text-primary dark:border-primary/40 dark:bg-primary/15 dark:text-primary-foreground',
};

export function StatTile({ label, value, tone = 'default', icon: Icon, footnote }: StatTileProps) {
  return (
    <Card className={cn('border', toneClassMap[tone])}>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          {Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
          <span>{label}</span>
        </div>
        <p className="text-3xl font-semibold leading-tight tracking-tight">{value}</p>
        {footnote ? <p className="text-xs text-muted-foreground">{footnote}</p> : null}
      </CardContent>
    </Card>
  );
}
