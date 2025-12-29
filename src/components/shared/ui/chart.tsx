'use client';

import * as React from 'react';
import * as Recharts from 'recharts';
import { cn } from '@/lib/utils';

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    color?: ChartColorToken;
  }
>;

export type ChartColorToken =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'accent'
  | 'destructive'
  | 'info'
  | 'success'
  | 'warning';

function resolveChartColor(token: ChartColorToken): string {
  return `hsl(var(--${token}))`;
}

type ChartContainerProps = Omit<React.ComponentProps<'div'>, 'style'> & {
  config?: ChartConfig;
  children: React.ReactElement;
};

const baseStyles: React.CSSProperties = {
  '--chart-axis-color': 'hsl(var(--muted-foreground))',
  '--chart-grid-color': 'hsl(var(--border))',
  '--chart-cursor-color': 'hsl(var(--primary) / 0.35)',
  '--chart-cursor-fill': 'hsl(var(--primary) / 0.14)',
} as React.CSSProperties;

export const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ className, config = {}, children, ...props }, ref) => {
    const colorVars = Object.entries(config).reduce<Record<string, string>>((acc, [key, value]) => {
      if (value.color) {
        acc[`--color-${key}`] = resolveChartColor(value.color);
      }
      return acc;
    }, {});

    return (
      <div
        ref={ref}
        className={cn(
          'h-full w-full text-xs text-muted-foreground [&_.recharts-cartesian-axis-tick_text]:fill-[var(--chart-axis-color)] [&_.recharts-cartesian-grid_line]:stroke-[var(--chart-grid-color)] [&_.recharts-curve.recharts-tooltip-cursor]:stroke-[var(--chart-cursor-color)] [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-[var(--chart-cursor-fill)] [&_.recharts-layer]:outline-none [&_.recharts-surface]:outline-none',
          className,
        )}
        style={{ ...baseStyles, ...colorVars }}
        {...props}
      >
        <Recharts.ResponsiveContainer>{children}</Recharts.ResponsiveContainer>
      </div>
    );
  },
);
ChartContainer.displayName = 'ChartContainer';

export const ChartTooltip = Recharts.Tooltip;

export const ChartTooltipContent = ({
  active,
  payload,
  label,
}: Recharts.TooltipProps<number, string>) => {
  if (!active || !payload?.length) return null;
  const [item] = payload;

  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs text-foreground shadow-md">
      <p className="font-semibold text-sm">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-muted-foreground">{item.name || 'Value'}</span>
        <span className="font-semibold text-foreground">{item.value?.toLocaleString()}</span>
      </div>
    </div>
  );
};
