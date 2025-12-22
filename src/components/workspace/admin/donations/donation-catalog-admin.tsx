'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@shared/ui/button';
import { Badge } from '@shared/ui/badge';
import { Combobox } from '@shared/ui/combobox';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { NativeCheckbox } from '@shared/ui/native-checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@shared/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/ui/table';
import type { DonationCatalogCategory, DonationCatalogItem } from '@/lib/donations/types';
import type { DonationCatalogAdminStats } from '@/lib/donations/service';
import type { InventoryItem } from '@/lib/inventory/types';
import { createCatalogCategory, updateCatalogCategory } from '@/app/(app-admin)/app-admin/donations/actions';
import { cn } from '@/lib/utils';
import { computeDonationNeedMetrics } from '@/lib/donations/need-math';

type Props = {
  inventoryItems: InventoryItem[];
  catalogInventoryItemIds: string[];
  categories: DonationCatalogCategory[];
  items: DonationCatalogItem[];
  total: number;
  stats: DonationCatalogAdminStats;
  initial: {
    q: string;
    status: 'all' | 'active' | 'hidden';
    sort: 'priority' | 'title' | 'stock';
    page: number;
    pageSize: 25 | 50 | 100;
  };
};

function buildUrl(pathname: string, params: Record<string, string | number | null | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    const asString = String(value);
    if (!asString) continue;
    search.set(key, asString);
  }
  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function DonationCatalogAdmin({ inventoryItems, catalogInventoryItemIds, categories, items, total, stats, initial }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams?.get('tab');

  const [q, setQ] = useState(initial.q);
  const [status, setStatus] = useState<Props['initial']['status']>(initial.status);
  const [sort, setSort] = useState<Props['initial']['sort']>(initial.sort);
  const [pageSize, setPageSize] = useState<Props['initial']['pageSize']>(initial.pageSize);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const page = initial.page;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const catalogSet = useMemo(() => new Set(catalogInventoryItemIds), [catalogInventoryItemIds]);

  const availableInventoryOptions = useMemo(() => {
    const available = inventoryItems.filter((inv) => !catalogSet.has(inv.id));
    return available.map((inv) => ({
      value: inv.id,
      label: `${inv.name}${inv.unitType ? ` · ${inv.unitType}` : ''}${inv.category ? ` (${inv.category})` : ''}`,
      keywords: `${inv.category ?? ''} ${inv.unitType ?? ''}`.trim(),
    }));
  }, [catalogSet, inventoryItems]);

  const [addInventoryId, setAddInventoryId] = useState('');

  const apply = (next: Partial<Props['initial']>) => {
    const params = {
      q: next.q ?? q,
      status: next.status ?? status,
      sort: next.sort ?? sort,
      page: next.page ?? 0,
      pageSize: next.pageSize ?? pageSize,
      tab: tab ?? undefined,
    };
    router.replace(buildUrl(pathname, params));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-border/15 bg-background p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Total {stats.total.toLocaleString()}</Badge>
            <Badge variant="secondary">Active {stats.active.toLocaleString()}</Badge>
            <Badge variant="outline">Hidden {stats.hidden.toLocaleString()}</Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setCategoriesOpen(true)}>
              Manage categories
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <Label htmlFor="catalog-search">Search</Label>
            <div className="mt-2 flex gap-2">
              <Input
                id="catalog-search"
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Search title, slug, category"
              />
              <Button variant="secondary" onClick={() => apply({ q, page: 0 })}>
                Apply
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="catalog-status">Status</Label>
            <div className="mt-2">
              <Select
                value={status}
                onValueChange={(value) => {
                  const next = value as Props['initial']['status'];
                  setStatus(next);
                  apply({ status: next, page: 0 });
                }}
              >
                <SelectTrigger id="catalog-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="hidden">Hidden</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="catalog-sort">Sort</Label>
            <div className="mt-2">
              <Select
                value={sort}
                onValueChange={(value) => {
                  const next = value as Props['initial']['sort'];
                  setSort(next);
                  apply({ sort: next, page: 0 });
                }}
              >
                <SelectTrigger id="catalog-sort">
                  <SelectValue placeholder="Select sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="stock">Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <Label>Add inventory item</Label>
            <div className="mt-2">
              <Combobox
                value={addInventoryId}
                onValueChange={(value) => {
                  setAddInventoryId(value);
                  if (value) {
                    router.push(`/ops/fundraising/items/${value}`);
                  }
                }}
                options={availableInventoryOptions}
                placeholder="Select an inventory item"
                searchPlaceholder="Search inventory…"
                buttonClassName="rounded-md"
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Donation settings are configured per item on the fundraising detail screen.
            </p>
          </div>

          <div>
            <Label htmlFor="catalog-page-size">Page size</Label>
            <div className="mt-2">
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  const parsed = Number.parseInt(value, 10) as Props['initial']['pageSize'];
                  if (parsed !== 25 && parsed !== 50 && parsed !== 100) return;
                  setPageSize(parsed);
                  apply({ pageSize: parsed, page: 0 });
                }}
              >
                <SelectTrigger id="catalog-page-size">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-end justify-end gap-2">
            <Button
              variant="outline"
              disabled={page <= 0}
              onClick={() => apply({ page: Math.max(0, page - 1) })}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              disabled={page + 1 >= totalPages}
              onClick={() => apply({ page: Math.min(totalPages - 1, page + 1) })}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border/15 bg-background shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Target</TableHead>
              <TableHead className="text-right">Short by</TableHead>
              <TableHead className="text-right">Need %</TableHead>
              <TableHead className="text-right">Priority</TableHead>
              <TableHead className="text-right">Status</TableHead>
              <TableHead className="text-right">Stripe</TableHead>
              <TableHead className="text-right">Open</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const need = computeDonationNeedMetrics({
                targetBuffer: item.targetBuffer ?? item.metrics.targetBuffer,
                currentStock: item.metrics.currentStock,
                distributedLast30Days: item.metrics.distributedLast30Days,
              });
              const stock = item.metrics.currentStock;

              return (
              <TableRow key={item.id} className={cn(!item.isActive && 'opacity-70')}>
                <TableCell className="font-medium">
                  <Link href={`/ops/fundraising/items/${item.inventoryItemId}`} className="hover:underline">
                    {item.title}
                  </Link>
                  <div className="mt-1 text-xs text-muted-foreground">/{item.slug}</div>
                </TableCell>
                <TableCell>{item.category ?? '—'}</TableCell>
                <TableCell className="text-right">{stock === null ? '—' : stock.toLocaleString()}</TableCell>
                <TableCell className="text-right">{need.targetBuffer === null ? '—' : need.targetBuffer.toLocaleString()}</TableCell>
                <TableCell className="text-right">{need.shortBy === null ? '—' : need.shortBy.toLocaleString()}</TableCell>
                <TableCell className="text-right">{need.needPct === null ? '—' : `${Math.round(need.needPct * 100)}%`}</TableCell>
                <TableCell className="text-right">{item.priority.toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={item.isActive ? 'secondary' : 'outline'}>{item.isActive ? 'Active' : 'Hidden'}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={item.stripePriceId ? 'secondary' : 'outline'}>
                    {item.stripePriceId ? 'Synced' : 'Missing'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/ops/fundraising/items/${item.inventoryItemId}`}>Open</Link>
                  </Button>
                </TableCell>
              </TableRow>
              );
            })}
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-8 text-center text-sm text-muted-foreground">
                  No catalogue items match your filters.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <Sheet open={categoriesOpen} onOpenChange={setCategoriesOpen}>
        <SheetContent side="right" className="w-full max-w-3xl">
          <SheetHeader className="text-left">
            <SheetTitle>Donation categories</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-6 overflow-y-auto pr-1">
            <form action={createCatalogCategory} className="space-y-3 rounded-2xl border border-border/15 bg-background p-4 shadow-sm">
              <p className="text-sm font-semibold text-foreground">Create category</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-category-label">Label</Label>
                  <Input id="new-category-label" name="label" placeholder="Winter Clothing" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-category-slug">Slug (optional)</Label>
                  <Input id="new-category-slug" name="slug" placeholder="winter-clothing" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-category-sort">Sort order</Label>
                  <Input id="new-category-sort" name="sort_order" type="number" min="0" defaultValue={100} />
                </div>
                <div className="space-y-2">
                  <Label>Flags</Label>
                  <div className="flex flex-wrap gap-4 pt-1 text-sm text-foreground">
                    <label className="inline-flex items-center gap-2">
                      <input type="hidden" name="is_public" value="off" />
                      <NativeCheckbox name="is_public" value="on" defaultChecked />
                      Public
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input type="hidden" name="is_active" value="off" />
                      <NativeCheckbox name="is_active" value="on" defaultChecked />
                      Active
                    </label>
                  </div>
                </div>
              </div>
              <Button type="submit">Create category</Button>
            </form>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Existing categories</p>
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">No categories yet.</p>
              ) : (
                <div className="space-y-3">
                  {categories.map((category) => (
                    <form
                      key={category.id}
                      action={updateCatalogCategory}
                      className="grid gap-3 rounded-2xl border border-border/15 bg-background p-4 shadow-sm md:grid-cols-2"
                    >
                      <input type="hidden" name="id" value={category.id} />
                      <div className="space-y-2">
                        <Label>Label</Label>
                        <Input name="label" defaultValue={category.label} />
                      </div>
                      <div className="space-y-2">
                        <Label>Slug</Label>
                        <Input name="slug" defaultValue={category.slug} />
                      </div>
                      <div className="space-y-2">
                        <Label>Sort order</Label>
                        <Input name="sort_order" type="number" min="0" defaultValue={category.sortOrder} />
                      </div>
                      <div className="space-y-2">
                        <Label>Flags</Label>
                        <div className="flex flex-wrap gap-4 pt-1 text-sm text-foreground">
                          <label className="inline-flex items-center gap-2">
                            <input type="hidden" name="is_public" value="off" />
                            <NativeCheckbox name="is_public" value="on" defaultChecked={category.isPublic} />
                            Public
                          </label>
                          <label className="inline-flex items-center gap-2">
                            <input type="hidden" name="is_active" value="off" />
                            <NativeCheckbox name="is_active" value="on" defaultChecked={category.isActive} />
                            Active
                          </label>
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <Button type="submit" variant="secondary">
                          Save
                        </Button>
                      </div>
                    </form>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
