'use client';

import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TableHead } from '@shared/ui/table';

export type ListSortOrder = 'ASC' | 'DESC';

function SortIcon({ active, order }: { active: boolean; order?: ListSortOrder }) {
  if (!active) return <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" aria-hidden />;
  return order === 'ASC'
    ? <ChevronUp className="h-3.5 w-3.5 opacity-70" aria-hidden />
    : <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden />;
}

export function SortableTableHead({
  label,
  active,
  order,
  onClick,
  align = 'left',
  className,
}: {
  label: string;
  active: boolean;
  order?: ListSortOrder;
  onClick: () => void;
  align?: 'left' | 'right';
  className?: string;
}) {
  const ariaSort = active ? (order === 'ASC' ? 'ascending' : 'descending') : 'none';
  return (
    <TableHead aria-sort={ariaSort} className={className}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'inline-flex items-center gap-1 rounded-sm text-left text-xs font-semibold text-muted-foreground',
          align === 'right' && 'w-full justify-end text-right',
          'hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        )}
      >
        {label}
        <SortIcon active={active} order={order} />
      </button>
    </TableHead>
  );
}
