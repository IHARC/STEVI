'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@shared/ui/form';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/ui/table';
import { useToast } from '@shared/ui/use-toast';
import { ListPaginationControls, type ListPageSize } from '@shared/list/pagination-controls';
import { SortableTableHead, type ListSortOrder } from '@shared/list/sortable-table-head';
import { updateInventoryTransactionSourceAction } from '@/app/(app-admin)/app-admin/inventory/actions';
import type { InventoryOrganization, InventoryReceipt } from '@/lib/inventory/types';

type InventoryReceiptsSectionProps = {
  receipts: InventoryReceipt[];
  organizations: InventoryOrganization[];
  actorProfileId: string;
};

type ReceiptSortKey = 'itemName' | 'locationName' | 'source' | 'qty' | 'createdAt';

function compareStrings(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

function parsePage(value: string | null) {
  const parsed = Number.parseInt(value ?? '1', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function parsePageSize(value: string | null): ListPageSize {
  const parsed = Number.parseInt(value ?? '25', 10);
  return parsed === 50 ? 50 : parsed === 100 ? 100 : 25;
}

function parseSortOrder(value: string | null): ListSortOrder {
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

export function InventoryReceiptsSection({ receipts, organizations, actorProfileId }: InventoryReceiptsSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const baseParams = useMemo(() => new URLSearchParams(searchParams?.toString()), [searchParams]);

  const query = useMemo(() => {
    const q = baseParams.get('receipts_q') ?? '';
    const page = parsePage(baseParams.get('receipts_page'));
    const pageSize = parsePageSize(baseParams.get('receipts_pageSize'));
    const sortBy = (baseParams.get('receipts_sortBy') as ReceiptSortKey) ?? 'createdAt';
    const sortOrder = parseSortOrder(baseParams.get('receipts_sortOrder')) ?? 'DESC';
    return { q, page, pageSize, sortBy, sortOrder } as const;
  }, [baseParams]);

  const [search, setSearch] = useState(query.q);
  const [pageSize, setPageSize] = useState<ListPageSize>(query.pageSize);
  const [sortBy, setSortBy] = useState<ReceiptSortKey>(query.sortBy);
  const [sortOrder, setSortOrder] = useState<ListSortOrder>(query.sortOrder);
  const [selectedReceipt, setSelectedReceipt] = useState<InventoryReceipt | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const apply = (next: Partial<typeof query>) => {
    const merged = {
      q: next.q ?? search,
      page: next.page ?? 1,
      pageSize: next.pageSize ?? pageSize,
      sortBy: next.sortBy ?? sortBy,
      sortOrder: next.sortOrder ?? sortOrder,
    };

    router.replace(
      buildUrl(pathname, baseParams, {
        receipts_q: merged.q || null,
        receipts_page: merged.page,
        receipts_pageSize: merged.pageSize,
        receipts_sortBy: merged.sortBy,
        receipts_sortOrder: merged.sortOrder,
      }),
    );
  };

  const clearFilters = () => {
    setSearch('');
    setPageSize(25);
    setSortBy('createdAt');
    setSortOrder('DESC');
    apply({ q: '', page: 1, pageSize: 25, sortBy: 'createdAt', sortOrder: 'DESC' });
  };

  const handleSort = (key: ReceiptSortKey, defaultOrder: ListSortOrder) => {
    const nextOrder = sortBy === key ? (sortOrder === 'ASC' ? 'DESC' : 'ASC') : defaultOrder;
    setSortBy(key);
    setSortOrder(nextOrder);
    apply({ sortBy: key, sortOrder: nextOrder, page: 1 });
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return receipts;
    return receipts.filter((receipt) =>
      [receipt.itemName, receipt.locationName ?? '', receipt.providerOrgName ?? '', receipt.notes ?? '']
        .some((value) => value.toLowerCase().includes(term)),
    );
  }, [receipts, search]);

  const sorted = useMemo(() => {
    const direction = sortOrder === 'ASC' ? 1 : -1;
    const list = [...filtered];
    list.sort((a, b) => {
      const aLocation = a.locationName ?? '';
      const bLocation = b.locationName ?? '';
      const aSource = a.providerOrgName ?? a.refType ?? '';
      const bSource = b.providerOrgName ?? b.refType ?? '';
      if (sortBy === 'itemName') return direction * compareStrings(a.itemName, b.itemName);
      if (sortBy === 'locationName') return direction * compareStrings(aLocation, bLocation);
      if (sortBy === 'source') return direction * compareStrings(aSource, bSource);
      if (sortBy === 'qty') return direction * (a.qty - b.qty);
      if (sortBy === 'createdAt') return direction * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      return 0;
    });
    return list;
  }, [filtered, sortBy, sortOrder]);

  const totalCount = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = Math.min(Math.max(query.page, 1), totalPages);
  const showingStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingEnd = totalCount === 0 ? 0 : Math.min(totalCount, page * pageSize);
  const pageReceipts = useMemo(() => sorted.slice(showingStart - 1, showingEnd), [showingEnd, showingStart, sorted]);

  const submitUpdateSource = async (formData: FormData) => {
    formData.set('actor_profile_id', actorProfileId);
    const result = await updateInventoryTransactionSourceAction(formData);
    if (!result.success) {
      toast({ title: 'Receipt error', variant: 'destructive', description: result.error ?? 'Failed to update receipt.' });
      return;
    }
    toast({ title: 'Receipt updated', description: 'Receipt source updated.' });
    setSelectedReceipt(null);
    startTransition(() => router.refresh());
  };

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Receipts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-[260px] flex-1 items-center gap-2">
            <Label htmlFor="inventory-receipts-search" className="sr-only">Search receipts</Label>
            <Input
              id="inventory-receipts-search"
              className="h-8"
              placeholder="Search receipts"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') apply({ q: search, page: 1 });
              }}
            />
            <Button variant="secondary" size="sm" className="h-8" onClick={() => apply({ q: search, page: 1 })}>
              Apply
            </Button>
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
            pageSizeId="inventory-receipts-page-size-top"
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
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead
                  label="Item"
                  active={sortBy === 'itemName'}
                  order={sortBy === 'itemName' ? sortOrder : undefined}
                  onClick={() => handleSort('itemName', 'ASC')}
                />
                <SortableTableHead
                  label="Location"
                  active={sortBy === 'locationName'}
                  order={sortBy === 'locationName' ? sortOrder : undefined}
                  onClick={() => handleSort('locationName', 'ASC')}
                />
                <SortableTableHead
                  label="Source"
                  active={sortBy === 'source'}
                  order={sortBy === 'source' ? sortOrder : undefined}
                  onClick={() => handleSort('source', 'ASC')}
                />
                <SortableTableHead
                  label="Quantity"
                  active={sortBy === 'qty'}
                  order={sortBy === 'qty' ? sortOrder : undefined}
                  onClick={() => handleSort('qty', 'DESC')}
                  align="right"
                />
                <SortableTableHead
                  label="Received"
                  active={sortBy === 'createdAt'}
                  order={sortBy === 'createdAt' ? sortOrder : undefined}
                  onClick={() => handleSort('createdAt', 'DESC')}
                  align="right"
                />
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageReceipts.map((receipt) => (
                <TableRow key={receipt.id}>
                  <TableCell className="font-medium">{receipt.itemName}</TableCell>
                  <TableCell>{receipt.locationName ?? '—'}</TableCell>
                  <TableCell>{receipt.providerOrgName ?? receipt.refType ?? '—'}</TableCell>
                  <TableCell className="text-right">{receipt.qty.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {new Date(receipt.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => setSelectedReceipt(receipt)}>
                      Update source
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {pageReceipts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    No receipts match your search.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        <div className="border-t border-border/10 pt-2">
          <ListPaginationControls
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            pageSizeId="inventory-receipts-page-size-bottom"
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

      <UpdateSourceDialog
        receipt={selectedReceipt}
        organizations={organizations}
        actorProfileId={actorProfileId}
        isPending={isPending}
        onClose={() => setSelectedReceipt(null)}
        onSubmit={submitUpdateSource}
      />
    </Card>
  );
}

type UpdateSourceDialogProps = {
  receipt: InventoryReceipt | null;
  organizations: InventoryOrganization[];
  actorProfileId: string;
  isPending: boolean;
  onSubmit: (formData: FormData) => Promise<void>;
  onClose: () => void;
};

function UpdateSourceDialog({ receipt, organizations, actorProfileId, isPending, onSubmit, onClose }: UpdateSourceDialogProps) {
  const form = useForm<{
    actor_profile_id: string;
    transaction_id: string;
    source_type: string;
    provider_org_id: string;
    notes: string;
  }>({
    defaultValues: {
      actor_profile_id: actorProfileId,
      transaction_id: receipt?.id ?? '',
      source_type: receipt?.refType ?? '',
      provider_org_id: receipt?.providerOrgId ? receipt.providerOrgId.toString() : '',
      notes: receipt?.notes ?? '',
    },
  });

  useEffect(() => {
    form.reset({
      actor_profile_id: actorProfileId,
      transaction_id: receipt?.id ?? '',
      source_type: receipt?.refType ?? '',
      provider_org_id: receipt?.providerOrgId ? receipt.providerOrgId.toString() : '',
      notes: receipt?.notes ?? '',
    });
  }, [actorProfileId, form, receipt]);

  return (
    <Dialog open={Boolean(receipt)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Update receipt source</DialogTitle>
          <DialogDescription>Attach or correct the provider for this receipt. This keeps reporting accurate across teams.</DialogDescription>
        </DialogHeader>
	        {receipt ? (
	          <Form {...form}>
	            <form action={onSubmit} className="space-y-4">
	              <input type="hidden" {...form.register('actor_profile_id')} />
	              <input type="hidden" {...form.register('transaction_id')} />
	              <div className="grid gap-1">
	                <Label>Item</Label>
	                <p className="text-sm font-medium text-foreground">{receipt.itemName}</p>
	              </div>
              <FormField
                control={form.control}
                name="source_type"
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel htmlFor="receipt_source_type">Source type</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <SelectTrigger id="receipt_source_type">
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Unset</SelectItem>
                          <SelectItem value="donation">Donation</SelectItem>
                          <SelectItem value="purchase">Purchase</SelectItem>
                          <SelectItem value="transfer_in">Transfer in</SelectItem>
                          <SelectItem value="adjustment">Adjustment</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="provider_org_id"
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel htmlFor="receipt_provider">Provider organisation</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                        <SelectTrigger id="receipt_provider">
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {organizations.map((org) => (
                            <SelectItem key={org.id} value={String(org.id)}>
                              {org.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel htmlFor="receipt_notes">Notes</FormLabel>
                    <FormControl>
                      <Input id="receipt_notes" placeholder="Optional comments" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  Save changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
