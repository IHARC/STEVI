'use client';

import { Label } from '@shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import { Button } from '@shared/ui/button';
import { Badge } from '@shared/ui/badge';
import { cn } from '@/lib/utils';

export type ListPageSize = 10 | 25 | 50 | 100;

type Props = {
  page: number;
  totalPages: number;
  pageSize: ListPageSize;
  pageSizeId: string;
  totalCount: number;
  showingStart: number;
  showingEnd: number;
  pageSizeOptions?: ListPageSize[];
  onPageSizeChange: (size: ListPageSize) => void;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
};

export function ListPaginationControls({
  page,
  totalPages,
  pageSize,
  pageSizeId,
  totalCount,
  showingStart,
  showingEnd,
  pageSizeOptions = [25, 50, 100],
  onPageSizeChange,
  onPrev,
  onNext,
  className,
}: Props) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-2', className)}>
      <div className="flex items-center gap-2">
        <Label htmlFor={pageSizeId} className="sr-only">Page size</Label>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => {
            const parsed = Number.parseInt(value, 10) as ListPageSize;
            if (!pageSizeOptions.includes(parsed)) return;
            onPageSizeChange(parsed);
          }}
        >
          <SelectTrigger id={pageSizeId} className="h-8 w-[130px] px-2 py-1 text-xs">
            <SelectValue placeholder="Size" />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
          <Badge variant="outline" className="px-2 py-0.5">
            {totalCount.toLocaleString()} results
          </Badge>
          <span className="tabular-nums">
            Showing {showingStart.toLocaleString()}–{showingEnd.toLocaleString()} of {totalCount.toLocaleString()}
          </span>
        </div>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          Page <span className="tabular-nums">{page.toLocaleString()}</span> of <span className="tabular-nums">{totalPages.toLocaleString()}</span>
        </span>
        <Button variant="outline" size="sm" className="h-8" disabled={page <= 1} onClick={onPrev}>
          Prev
        </Button>
        <Button variant="outline" size="sm" className="h-8" disabled={page >= totalPages} onClick={onNext}>
          Next
        </Button>
      </div>
    </div>
  );
}

