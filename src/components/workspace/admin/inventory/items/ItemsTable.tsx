import { Button } from '@shared/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/ui/table';
import { SortableTableHead, type ListSortOrder } from '@shared/list/sortable-table-head';
import type { InventoryItem } from '@/lib/inventory/types';
import Link from 'next/link';

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
          <TableRow key={item.id} className={!item.active ? 'opacity-60' : undefined}>
            <TableCell className="font-medium">
              <Link href={`/ops/inventory/items/${item.id}`} className="hover:underline">
                {item.name}
              </Link>
            </TableCell>
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
              <Button size="sm" variant="outline" onClick={() => onReceive(item)}>
                Receive
              </Button>
              <Button size="sm" variant="outline" onClick={() => onTransfer(item)}>
                Transfer
              </Button>
              <Button size="sm" variant="outline" onClick={() => onAdjust(item)}>
                Adjust
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link href={`/ops/inventory/items/${item.id}`}>Open</Link>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onToggle(item, !item.active)} disabled={isPending}>
                {item.active ? 'Deactivate' : 'Activate'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => onDelete(item)}
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
