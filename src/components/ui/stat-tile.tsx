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
  default: 'border-outline/10 bg-surface-container text-on-surface',
  warning: 'border-primary/24 bg-primary-container text-on-primary-container',
  info: 'border-secondary-container/40 bg-secondary-container text-on-secondary-container',
};

export function StatTile({ label, value, tone = 'default', icon, footnote }: StatTileProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-space-xs rounded-[var(--md-sys-shape-corner-small)] border px-space-md py-space-md shadow-level-1',
        toneClassMap[tone],
      )}
    >
      <div className="flex items-center gap-space-2xs text-label-md text-on-surface-variant">
        {icon ? <Icon icon={icon} size="sm" className="text-inherit" /> : null}
        <span>{label}</span>
      </div>
      <p className="text-4xl font-semibold leading-tight sm:text-5xl">{value}</p>
      {footnote ? <p className="text-label-sm text-on-surface-variant">{footnote}</p> : null}
    </div>
  );
}
