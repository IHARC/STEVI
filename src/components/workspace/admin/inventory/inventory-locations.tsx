'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@shared/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@shared/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@shared/ui/form';
import { Input } from '@shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/ui/table';
import { useToast } from '@shared/ui/use-toast';
import { Checkbox } from '@shared/ui/checkbox';
import { ListPaginationControls, type ListPageSize } from '@shared/list/pagination-controls';
import { SortableTableHead, type ListSortOrder } from '@shared/list/sortable-table-head';
import {
  createInventoryLocationAction,
  deleteInventoryLocationAction,
  toggleInventoryLocationAction,
  updateInventoryLocationAction,
} from '@/app/(app-admin)/app-admin/inventory/actions';
import type { InventoryLocation } from '@/lib/inventory/types';

type InventoryLocationsSectionProps = {
  locations: InventoryLocation[];
  actorProfileId: string;
  canManageLocations: boolean;
};

type StatusFilter = 'all' | 'active' | 'inactive';
type LocationSortKey = 'name' | 'code' | 'type' | 'active';

function compareStrings(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
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

export function InventoryLocationsSection({ locations, actorProfileId, canManageLocations }: InventoryLocationsSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const baseParams = useMemo(() => new URLSearchParams(searchParams?.toString()), [searchParams]);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryLocation | null>(null);
  const [isPending, startTransition] = useTransition();

  const query = useMemo(() => {
    const q = baseParams.get('locations_q') ?? '';
    const status = (baseParams.get('locations_status') as StatusFilter) ?? 'all';
    const page = parsePage(baseParams.get('locations_page'));
    const pageSize = parsePageSize(baseParams.get('locations_pageSize'));
    const sortBy = (baseParams.get('locations_sortBy') as LocationSortKey) ?? 'name';
    const sortOrderRaw = baseParams.get('locations_sortOrder');
    const sortOrder = sortOrderRaw ? parseSortOrder(sortOrderRaw) : 'ASC';
    return {
      q,
      status: status === 'active' || status === 'inactive' ? status : 'all',
      page,
      pageSize,
      sortBy,
      sortOrder,
    } as const;
  }, [baseParams]);

  const [q, setQ] = useState(query.q);
  const [status, setStatus] = useState<StatusFilter>(query.status);
  const [pageSize, setPageSize] = useState<ListPageSize>(query.pageSize);
  const [sortBy, setSortBy] = useState<LocationSortKey>(query.sortBy);
  const [sortOrder, setSortOrder] = useState<ListSortOrder>(query.sortOrder);

  const apply = (next: Partial<typeof query>) => {
    const merged = {
      q: next.q ?? q,
      status: next.status ?? status,
      page: next.page ?? 1,
      pageSize: next.pageSize ?? pageSize,
      sortBy: next.sortBy ?? sortBy,
      sortOrder: next.sortOrder ?? sortOrder,
    };

    router.replace(
      buildUrl(pathname, baseParams, {
        locations_q: merged.q || null,
        locations_status: merged.status === 'all' ? null : merged.status,
        locations_page: merged.page,
        locations_pageSize: merged.pageSize,
        locations_sortBy: merged.sortBy,
        locations_sortOrder: merged.sortOrder,
      }),
    );
  };

  const clearFilters = () => {
    setQ('');
    setStatus('all');
    setSortBy('name');
    setSortOrder('ASC');
    setPageSize(25);
    apply({ q: '', status: 'all', page: 1, pageSize: 25, sortBy: 'name', sortOrder: 'ASC' });
  };

  const handleSort = (key: LocationSortKey, defaultOrder: ListSortOrder) => {
    const nextOrder = sortBy === key ? (sortOrder === 'ASC' ? 'DESC' : 'ASC') : defaultOrder;
    setSortBy(key);
    setSortOrder(nextOrder);
    apply({ sortBy: key, sortOrder: nextOrder, page: 1 });
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return locations.filter((location) => {
      if (status === 'active' && !location.active) return false;
      if (status === 'inactive' && location.active) return false;
      if (!term) return true;
      return [location.name, location.code ?? '', location.type ?? '']
        .some((value) => value.toLowerCase().includes(term));
    });
  }, [locations, q, status]);

  const sorted = useMemo(() => {
    const direction = sortOrder === 'ASC' ? 1 : -1;
    const list = [...filtered];
    list.sort((a, b) => {
      const aCode = a.code ?? '';
      const bCode = b.code ?? '';
      const aType = a.type ?? '';
      const bType = b.type ?? '';
      if (sortBy === 'name') return direction * compareStrings(a.name, b.name);
      if (sortBy === 'code') return direction * compareStrings(aCode, bCode);
      if (sortBy === 'type') return direction * compareStrings(aType, bType);
      if (sortBy === 'active') return direction * (Number(a.active) - Number(b.active));
      return 0;
    });
    return list;
  }, [filtered, sortBy, sortOrder]);

  const totalCount = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = Math.min(Math.max(query.page, 1), totalPages);
  const showingStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingEnd = totalCount === 0 ? 0 : Math.min(totalCount, page * pageSize);
  const pageLocations = useMemo(() => sorted.slice(showingStart - 1, showingEnd), [showingEnd, showingStart, sorted]);

  const handleResult = (result: { success: boolean; error?: string }, message: string, onClose?: () => void) => {
    if (!result.success) {
      toast({ title: 'Location error', variant: 'destructive', description: result.error ?? 'Action failed.' });
      return;
    }
    if (onClose) {
      onClose();
    }
    toast({ title: 'Location updated', description: message });
    startTransition(() => router.refresh());
  };

  const submitCreate = async (formData: FormData) => {
    formData.set('actor_profile_id', actorProfileId);
    const result = await createInventoryLocationAction(formData);
    handleResult(result, 'Location created.', () => setOpen(false));
  };

  const submitUpdate = async (formData: FormData) => {
    formData.set('actor_profile_id', actorProfileId);
    const result = await updateInventoryLocationAction(formData);
    handleResult(result, 'Location updated.', () => setEditing(null));
  };

  const submitToggle = async (location: InventoryLocation, nextActive: boolean) => {
    const formData = new FormData();
    formData.set('actor_profile_id', actorProfileId);
    formData.set('location_id', location.id);
    formData.set('active', String(nextActive));
    const result = await toggleInventoryLocationAction(formData);
    handleResult(result, nextActive ? 'Location activated.' : 'Location deactivated.');
  };

  const submitDelete = async (location: InventoryLocation) => {
    const formData = new FormData();
    formData.set('actor_profile_id', actorProfileId);
    formData.set('location_id', location.id);
    const result = await deleteInventoryLocationAction(formData);
    handleResult(result, 'Location deleted.');
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base font-semibold">Locations</CardTitle>
          <p className="text-sm text-muted-foreground">Warehouses, outreach lockers, and mobile units that hold inventory.</p>
          {!canManageLocations ? (
            <p className="text-xs text-warning">
              Viewing only: only IHARC admins can add or edit locations.
            </p>
          ) : null}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={!canManageLocations}>Create location</Button>
          </DialogTrigger>
          <LocationDialogContent
            title="Create location"
            actionLabel="Create location"
            actorProfileId={actorProfileId}
            onSubmit={submitCreate}
            isPending={isPending}
            canManageLocations={canManageLocations}
          />
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-[260px] flex-1 items-center gap-2">
            <FormLabel htmlFor="inventory-locations-search" className="sr-only">Search locations</FormLabel>
            <Input
              id="inventory-locations-search"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') apply({ q, page: 1 });
              }}
              placeholder="Search locations"
              className="h-8"
            />
            <Button variant="secondary" size="sm" className="h-8" onClick={() => apply({ q, page: 1 })}>
              Apply
            </Button>
          </div>

          <div className="min-w-[140px]">
            <FormLabel htmlFor="inventory-locations-status" className="sr-only">Status</FormLabel>
            <Select
              value={status}
              onValueChange={(value) => {
                const next = (value as StatusFilter) ?? 'all';
                setStatus(next);
                apply({ status: next, page: 1 });
              }}
            >
              <SelectTrigger id="inventory-locations-status" className="h-8 px-2 py-1 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
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
            pageSizeId="inventory-locations-page-size-top"
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
                  label="Name"
                  active={sortBy === 'name'}
                  order={sortBy === 'name' ? sortOrder : undefined}
                  onClick={() => handleSort('name', 'ASC')}
                />
                <SortableTableHead
                  label="Code"
                  active={sortBy === 'code'}
                  order={sortBy === 'code' ? sortOrder : undefined}
                  onClick={() => handleSort('code', 'ASC')}
                />
                <SortableTableHead
                  label="Type"
                  active={sortBy === 'type'}
                  order={sortBy === 'type' ? sortOrder : undefined}
                  onClick={() => handleSort('type', 'ASC')}
                />
                <SortableTableHead
                  label="Status"
                  active={sortBy === 'active'}
                  order={sortBy === 'active' ? sortOrder : undefined}
                  onClick={() => handleSort('active', 'DESC')}
                />
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageLocations.map((location) => (
                <TableRow key={location.id} className={!location.active ? 'opacity-60' : undefined}>
                  <TableCell className="font-medium">{location.name}</TableCell>
                  <TableCell>{location.code ?? '—'}</TableCell>
                  <TableCell>{location.type ?? '—'}</TableCell>
                  <TableCell>
                    <span className={location.active ? 'text-primary' : 'text-muted-foreground'}>
                      {location.active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button size="sm" variant="outline" onClick={() => setEditing(location)} disabled={!canManageLocations}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => submitToggle(location, !location.active)}
                      disabled={isPending || !canManageLocations}
                    >
                      {location.active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => submitDelete(location)}
                      disabled={isPending || !canManageLocations}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {pageLocations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    No locations match your filters.
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
            pageSizeId="inventory-locations-page-size-bottom"
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
      <CardFooter className="text-xs text-muted-foreground">
        Deleting a location is only allowed when no stock remains and no transactions reference it. Otherwise deactivate to hide it from workflows.
      </CardFooter>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <LocationDialogContent
          title="Edit location"
          actionLabel="Save changes"
          actorProfileId={actorProfileId}
          onSubmit={submitUpdate}
          isPending={isPending}
          defaultValues={editing}
          canManageLocations={canManageLocations}
        />
      </Dialog>
    </Card>
  );
}

type LocationDialogProps = {
  title: string;
  actionLabel: string;
  actorProfileId: string;
  onSubmit: (formData: FormData) => Promise<void>;
  isPending: boolean;
  defaultValues?: InventoryLocation | null;
  canManageLocations: boolean;
};

function LocationDialogContent({
  title,
  actionLabel,
  actorProfileId,
  onSubmit,
  isPending,
  defaultValues,
  canManageLocations,
}: LocationDialogProps) {
  const form = useForm<{
    actor_profile_id: string;
    location_id?: string;
    name: string;
    code: string;
    type: string;
    address: string;
    active: boolean;
  }>({
    defaultValues: {
      actor_profile_id: actorProfileId,
      location_id: defaultValues?.id,
      name: defaultValues?.name ?? '',
      code: defaultValues?.code ?? '',
      type: defaultValues?.type ?? '',
      address: defaultValues?.address ?? '',
      active: defaultValues?.active ?? true,
    },
  });

  useEffect(() => {
    form.reset({
      actor_profile_id: actorProfileId,
      location_id: defaultValues?.id,
      name: defaultValues?.name ?? '',
      code: defaultValues?.code ?? '',
      type: defaultValues?.type ?? '',
      address: defaultValues?.address ?? '',
      active: defaultValues?.active ?? true,
    });
  }, [actorProfileId, defaultValues, form]);

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>Track detailed addresses so deliveries and outreach staff know where supplies live.</DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form action={onSubmit} className="space-y-4">
          <input type="hidden" {...form.register('actor_profile_id')} />
          {defaultValues ? <input type="hidden" {...form.register('location_id')} /> : null}

          <FormField
            control={form.control}
            name="name"
            rules={{ required: 'Location name is required' }}
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="location_name">Name</FormLabel>
                <FormControl>
                  <Input id="location_name" required disabled={!canManageLocations} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="code"
              rules={{ required: 'Code is required' }}
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel htmlFor="code">Code</FormLabel>
                  <FormControl>
                    <Input id="code" placeholder="Short code" required disabled={!canManageLocations} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              rules={{ required: 'Type is required' }}
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel htmlFor="type">Type</FormLabel>
                  <FormControl>
                    <Input id="type" placeholder="e.g., Warehouse" required disabled={!canManageLocations} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="address">Address</FormLabel>
                <FormControl>
                  <Input id="address" placeholder="Street, city" disabled={!canManageLocations} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-2">
                <input type="hidden" name="active" value={field.value ? 'on' : ''} />
                <FormControl>
                  <Checkbox
                    id="location_active"
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                    disabled={!canManageLocations}
                  />
                </FormControl>
                <FormLabel htmlFor="location_active" className="text-sm font-normal text-muted-foreground">
                  Location is active
                </FormLabel>
              </FormItem>
            )}
          />

          <DialogFooter>
            <Button type="submit" disabled={isPending || !canManageLocations}>
              {actionLabel}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
