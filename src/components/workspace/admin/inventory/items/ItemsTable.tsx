'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@shared/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/ui/table';
import { SortableTableHead, type ListSortOrder } from '@shared/list/sortable-table-head';
import type { InventoryItem } from '@/lib/inventory/types';
import { cn } from '@/lib/utils';

export type ItemsTableHandlers = {
  onReceive: (item: InventoryItem) => void;
  onTransfer: (item: InventoryItem) => void;
  onAdjust: (item: InventoryItem) => void;
  onToggle: (item: InventoryItem, nextActive: boolean) => void;
  onDelete: (item: InventoryItem) => void;
};

type ItemsTableProps = {
  items: InventoryItem[];
  isPending: boolean;
  sortBy: 'name' | 'category' | 'unitType' | 'onHandQuantity' | 'minimumThreshold' | 'active';
  sortOrder: ListSortOrder;
  onSort: (key: ItemsTableProps['sortBy']) => void;
} & ItemsTableHandlers;

export function ItemsTable({
  items,
  isPending,
  sortBy,
  sortOrder,
  onSort,
  onReceive,
  onTransfer,
  onAdjust,
  onToggle,
  onDelete,
}: ItemsTableProps) {
  const router = useRouter();

  const openItem = (itemId: string) => {
    router.push(`/ops/inventory/items/${itemId}?view=items`);
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableTableHead
            label="Item"
            active={sortBy === 'name'}
            order={sortBy === 'name' ? sortOrder : undefined}
            onClick={() => onSort('name')}
          />
          <SortableTableHead
            label="Category"
            active={sortBy === 'category'}
            order={sortBy === 'category' ? sortOrder : undefined}
            onClick={() => onSort('category')}
          />
          <SortableTableHead
            label="Unit"
            active={sortBy === 'unitType'}
            order={sortBy === 'unitType' ? sortOrder : undefined}
            onClick={() => onSort('unitType')}
          />
          <SortableTableHead
            label="On hand"
            active={sortBy === 'onHandQuantity'}
            order={sortBy === 'onHandQuantity' ? sortOrder : undefined}
            onClick={() => onSort('onHandQuantity')}
            align="right"
          />
          <SortableTableHead
            label="Threshold"
            active={sortBy === 'minimumThreshold'}
            order={sortBy === 'minimumThreshold' ? sortOrder : undefined}
            onClick={() => onSort('minimumThreshold')}
            align="right"
          />
          <SortableTableHead
            label="Status"
            active={sortBy === 'active'}
            order={sortBy === 'active' ? sortOrder : undefined}
            onClick={() => onSort('active')}
            align="right"
          />
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow
            key={item.id}
            role="link"
            tabIndex={0}
            aria-label={`Open ${item.name} inventory item`}
            onClick={() => openItem(item.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openItem(item.id);
              }
            }}
            className={cn(
              !item.active && 'opacity-60',
              'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            )}
          >
            <TableCell className="font-medium">{item.name}</TableCell>
            <TableCell>{item.category ?? '—'}</TableCell>
            <TableCell>{item.unitType ?? '—'}</TableCell>
            <TableCell className="text-right">{item.onHandQuantity.toLocaleString()}</TableCell>
            <TableCell className="text-right">
              {item.minimumThreshold === null ? '—' : item.minimumThreshold.toLocaleString()}
            </TableCell>
            <TableCell className="text-right">
              <span className={item.active ? 'text-primary' : 'text-muted-foreground'}>
                {item.active ? 'Active' : 'Inactive'}
              </span>
            </TableCell>
            <TableCell className="space-x-2 text-right">
              <Button
                size="sm"
                variant="outline"
                onClick={(event) => {
                  event.stopPropagation();
                  onReceive(item);
                }}
              >
                Receive
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(event) => {
                  event.stopPropagation();
                  onTransfer(item);
                }}
              >
                Transfer
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(event) => {
                  event.stopPropagation();
                  onAdjust(item);
                }}
              >
                Adjust
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggle(item, !item.active);
                }}
                disabled={isPending}
              >
                {item.active ? 'Deactivate' : 'Activate'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(item);
                }}
                disabled={isPending}
              >
                Delete
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
