import type { LucideIcon } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

type StatTileProps = {
  label: string;
  value: string;
  tone?: 'default' | 'warning' | 'info';
  icon?: LucideIcon;
  footnote?: string;
};

const toneClassMap: Record<NonNullable<StatTileProps['tone']>, string> = {
  default: 'border-outline/12 bg-surface-container-low text-on-surface',
  warning: 'border-primary/20 bg-primary-container text-on-primary-container',
  info: 'border-outline/12 bg-secondary-container text-on-secondary-container',
};

export function StatTile({ label, value, tone = 'default', icon, footnote }: StatTileProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-space-2xs rounded-[var(--md-sys-shape-corner-medium)] border px-space-md py-space-md shadow-level-1',
        toneClassMap[tone],
      )}
    >
      <div className="flex items-center gap-space-2xs text-label-md text-on-surface-variant">
        {icon ? <Icon icon={icon} size="sm" className="text-inherit" /> : null}
        <span>{label}</span>
      </div>
      <p className="text-headline-sm font-semibold sm:text-headline-md">{value}</p>
      {footnote ? <p className="text-label-sm text-on-surface-variant">{footnote}</p> : null}
    </div>
  );
}
