'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@shared/ui/card';
import { Button } from '@shared/ui/button';
import { Dialog, DialogTrigger } from '@shared/ui/dialog';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import { useInventoryActions } from './useInventoryActions';
import { ItemsTable } from './ItemsTable';
import { AdjustStockDialog, BulkReceiveDialog, ReceiveStockDialog, TransferStockDialog } from './StockDialogs';
import type { InventoryItem, InventoryLocation, InventoryOrganization } from '@/lib/inventory/types';
import { ListPaginationControls, type ListPageSize } from '@shared/list/pagination-controls';
import type { ListSortOrder } from '@shared/list/sortable-table-head';

type InventoryItemsSectionProps = {
  items: InventoryItem[];
  locations: InventoryLocation[];
  organizations: InventoryOrganization[];
  actorProfileId: string;
};

type StatusFilter = 'all' | 'active' | 'inactive';
type ItemsSortKey = 'name' | 'category' | 'unitType' | 'onHandQuantity' | 'minimumThreshold' | 'active';

function getParam(params: URLSearchParams, key: string) {
  return params.get(key) ?? '';
}

function parsePage(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function parsePageSize(value: string): ListPageSize {
  const parsed = Number.parseInt(value, 10);
  return parsed === 50 ? 50 : parsed === 100 ? 100 : 25;
}

function parseSortOrder(value: string): ListSortOrder {
  return value === 'ASC' ? 'ASC' : 'DESC';
}

function buildUrl(pathname: string, base: URLSearchParams, next: Record<string, string | number | null | undefined>) {
  const params = new URLSearchParams(base.toString());
  for (const [key, value] of Object.entries(next)) {
    if (value === null || value === undefined) {
      params.delete(key);
      continue;
    }
    const asString = String(value);
    if (!asString) {
      params.delete(key);
      continue;
    }
    params.set(key, asString);
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function compareStrings(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

export function InventoryItemsSection({ items, locations, organizations, actorProfileId }: InventoryItemsSectionProps) {
  const [itemToReceive, setItemToReceive] = useState<InventoryItem | null>(null);
  const [itemToTransfer, setItemToTransfer] = useState<InventoryItem | null>(null);
  const [itemToAdjust, setItemToAdjust] = useState<InventoryItem | null>(null);
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  const { isPending, receiveStock, transferStock, adjustStock, toggleItem, deleteItem, bulkReceive } =
    useInventoryActions({ actorProfileId });

  const activeOrganizations = useMemo(() => organizations.filter((org) => org.isActive), [organizations]);

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base font-semibold">Inventory items</CardTitle>
        <div className="flex items-center gap-2">
          <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Bulk receive</Button>
            </DialogTrigger>
            <BulkReceiveDialog
              isPending={isPending}
              onSubmit={(formData) => bulkReceive(formData, () => setIsBulkOpen(false)).then(() => undefined)}
              actorProfileId={actorProfileId}
              items={items}
              locations={locations}
              organizations={activeOrganizations}
            />
          </Dialog>
          <Button asChild>
            <Link href="/ops/inventory/items/new?view=items">Create item</Link>
          </Button>
        </div>
      </CardHeader>
      <InventoryItemsList
        items={items}
        isPending={isPending}
        onReceive={setItemToReceive}
        onTransfer={setItemToTransfer}
        onAdjust={setItemToAdjust}
        onToggle={(item, next) => toggleItem(item, next)}
        onDelete={(item) => deleteItem(item)}
      />
      <CardFooter className="text-xs text-muted-foreground">
        Manage stock levels using receive, transfer, or adjust actions. Deactivating an item hides it from operational workflows without
        deleting historic transactions.
      </CardFooter>

      <ReceiveStockDialog
        item={itemToReceive}
        locations={locations}
        organizations={activeOrganizations}
        isPending={isPending}
        onClose={() => setItemToReceive(null)}
        onSubmit={(formData) => receiveStock(formData, () => setItemToReceive(null)).then(() => undefined)}
        actorProfileId={actorProfileId}
      />

      <TransferStockDialog
        item={itemToTransfer}
        locations={locations}
        isPending={isPending}
        onClose={() => setItemToTransfer(null)}
        onSubmit={(formData) => transferStock(formData, () => setItemToTransfer(null)).then(() => undefined)}
        actorProfileId={actorProfileId}
      />

      <AdjustStockDialog
        item={itemToAdjust}
        locations={locations}
        isPending={isPending}
        onClose={() => setItemToAdjust(null)}
        onSubmit={(formData) => adjustStock(formData, () => setItemToAdjust(null)).then(() => undefined)}
        actorProfileId={actorProfileId}
      />
    </Card>
  );
}

type InventoryItemsListProps = {
  items: InventoryItem[];
  isPending: boolean;
  onReceive: (item: InventoryItem) => void;
  onTransfer: (item: InventoryItem) => void;
  onAdjust: (item: InventoryItem) => void;
  onToggle: (item: InventoryItem, nextActive: boolean) => void;
  onDelete: (item: InventoryItem) => void;
};

function InventoryItemsList(props: InventoryItemsListProps) {
  const searchParams = useSearchParams();
  const key = searchParams?.toString() ?? '';
  return <InventoryItemsListBody key={key} {...props} />;
}

function InventoryItemsListBody({ items, isPending, onReceive, onTransfer, onAdjust, onToggle, onDelete }: InventoryItemsListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const baseParams = new URLSearchParams(searchParams?.toString());

  const initialQ = getParam(baseParams, 'items_q');
  const initialStatusRaw = getParam(baseParams, 'items_status');
  const initialStatus: StatusFilter = initialStatusRaw === 'active' || initialStatusRaw === 'inactive' ? initialStatusRaw : 'all';
  const initialCategory = getParam(baseParams, 'items_category') || 'all';
  const initialPage = parsePage(getParam(baseParams, 'items_page'));
  const initialPageSize = parsePageSize(getParam(baseParams, 'items_pageSize'));
  const initialSortBy = (getParam(baseParams, 'items_sortBy') as ItemsSortKey) || 'name';
  const sortOrderRaw = getParam(baseParams, 'items_sortOrder');
  const initialSortOrder: ListSortOrder = sortOrderRaw ? parseSortOrder(sortOrderRaw) : 'ASC';

  const [q, setQ] = useState(initialQ);
  const [status, setStatus] = useState<StatusFilter>(initialStatus);
  const [category, setCategory] = useState<string>(initialCategory);
  const [pageSize, setPageSize] = useState<ListPageSize>(initialPageSize);
  const [sortBy, setSortBy] = useState<ItemsSortKey>(initialSortBy);
  const [sortOrder, setSortOrder] = useState<ListSortOrder>(initialSortOrder);

  const categoryOptions = useMemo(() => {
    const unique = new Set<string>();
    items.forEach((item) => {
      if (item.category) unique.add(item.category);
    });
    return Array.from(unique).sort(compareStrings);
  }, [items]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((item) => {
      if (status === 'active' && !item.active) return false;
      if (status === 'inactive' && item.active) return false;
      if (category && category !== 'all' && (item.category ?? '—') !== category) return false;
      if (!term) return true;
      return [item.name, item.category ?? '', item.unitType ?? '']
        .some((value) => value.toLowerCase().includes(term));
    });
  }, [category, items, q, status]);

  const sorted = useMemo(() => {
    const sortedItems = [...filtered];
    const direction = sortOrder === 'ASC' ? 1 : -1;
    sortedItems.sort((a, b) => {
      const aCategory = a.category ?? '';
      const bCategory = b.category ?? '';
      const aUnit = a.unitType ?? '';
      const bUnit = b.unitType ?? '';

      if (sortBy === 'name') return direction * compareStrings(a.name, b.name);
      if (sortBy === 'category') return direction * compareStrings(aCategory, bCategory);
      if (sortBy === 'unitType') return direction * compareStrings(aUnit, bUnit);
      if (sortBy === 'onHandQuantity') return direction * (a.onHandQuantity - b.onHandQuantity);
      if (sortBy === 'minimumThreshold') return direction * ((a.minimumThreshold ?? -1) - (b.minimumThreshold ?? -1));
      if (sortBy === 'active') return direction * (Number(a.active) - Number(b.active));
      return 0;
    });
    return sortedItems;
  }, [filtered, sortBy, sortOrder]);

  const totalCount = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = Math.min(Math.max(initialPage, 1), totalPages);
  const showingStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingEnd = totalCount === 0 ? 0 : Math.min(totalCount, page * pageSize);
  const pageItems = useMemo(() => sorted.slice(showingStart - 1, showingEnd), [showingEnd, showingStart, sorted]);

  const apply = (next: { q?: string; status?: StatusFilter; category?: string; page?: number; pageSize?: ListPageSize; sortBy?: ItemsSortKey; sortOrder?: ListSortOrder }) => {
    const merged = {
      q: next.q ?? q,
      status: next.status ?? status,
      category: next.category ?? category,
      page: next.page ?? 1,
      pageSize: next.pageSize ?? pageSize,
      sortBy: next.sortBy ?? sortBy,
      sortOrder: next.sortOrder ?? sortOrder,
    };
    router.replace(
      buildUrl(pathname, baseParams, {
        items_q: merged.q || null,
        items_status: merged.status === 'all' ? null : merged.status,
        items_category: merged.category === 'all' ? null : merged.category,
        items_page: merged.page,
        items_pageSize: merged.pageSize,
        items_sortBy: merged.sortBy,
        items_sortOrder: merged.sortOrder,
      }),
    );
  };

  const clearFilters = () => {
    setQ('');
    setStatus('all');
    setCategory('all');
    setSortBy('name');
    setSortOrder('ASC');
    setPageSize(25);
    apply({ q: '', status: 'all', category: 'all', page: 1, pageSize: 25, sortBy: 'name', sortOrder: 'ASC' });
  };

  const handleSort = (key: ItemsSortKey) => {
    const nextOrder = sortBy === key ? (sortOrder === 'ASC' ? 'DESC' : 'ASC') : (key === 'onHandQuantity' || key === 'minimumThreshold' ? 'DESC' : 'ASC');
    setSortBy(key);
    setSortOrder(nextOrder);
    apply({ sortBy: key, sortOrder: nextOrder, page: 1 });
  };

  return (
    <CardContent className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-[260px] flex-1 items-center gap-2">
          <Label htmlFor="inventory-items-search" className="sr-only">Search items</Label>
          <Input
            id="inventory-items-search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') apply({ q, page: 1 });
            }}
            placeholder="Search items"
            className="h-8"
          />
          <Button variant="secondary" size="sm" className="h-8" onClick={() => apply({ q, page: 1 })}>
            Apply
          </Button>
        </div>

        <div className="min-w-[140px]">
          <Label htmlFor="inventory-items-status" className="sr-only">Status</Label>
          <Select
            value={status}
            onValueChange={(value) => {
              const next: StatusFilter = value === 'active' || value === 'inactive' ? value : 'all';
              setStatus(next);
              apply({ status: next, page: 1 });
            }}
          >
            <SelectTrigger id="inventory-items-status" className="h-8 px-2 py-1 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[180px]">
          <Label htmlFor="inventory-items-category" className="sr-only">Category</Label>
          <Select
            value={category}
            onValueChange={(value) => {
              const next = value || 'all';
              setCategory(next);
              apply({ category: next, page: 1 });
            }}
          >
            <SelectTrigger id="inventory-items-category" className="h-8 px-2 py-1 text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categoryOptions.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8" onClick={clearFilters}>
            Clear
          </Button>
        </div>
      </div>

      <div className="border-t border-border/10 pt-2">
        <ListPaginationControls
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          pageSizeId="inventory-items-page-size-top"
          totalCount={totalCount}
          showingStart={showingStart}
          showingEnd={showingEnd}
          onPageSizeChange={(size) => {
            setPageSize(size);
            apply({ pageSize: size, page: 1 });
          }}
          onPrev={() => apply({ page: Math.max(1, page - 1) })}
          onNext={() => apply({ page: Math.min(totalPages, page + 1) })}
        />
      </div>

      <div className="overflow-x-auto">
        <ItemsTable
          items={pageItems}
          isPending={isPending}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          onReceive={onReceive}
          onTransfer={onTransfer}
          onAdjust={onAdjust}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      </div>

      <div className="border-t border-border/10 pt-2">
        <ListPaginationControls
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          pageSizeId="inventory-items-page-size-bottom"
          totalCount={totalCount}
          showingStart={showingStart}
          showingEnd={showingEnd}
          onPageSizeChange={(size) => {
            setPageSize(size);
            apply({ pageSize: size, page: 1 });
          }}
          onPrev={() => apply({ page: Math.max(1, page - 1) })}
          onNext={() => apply({ page: Math.min(totalPages, page + 1) })}
        />
      </div>
    </CardContent>
  );
}
