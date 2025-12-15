'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  createCatalogCategory,
  importInventoryItem,
  saveCatalogItem,
  syncCatalogItemStripeAction,
  toggleCatalogItem,
  updateCatalogCategory,
} from '@/app/(ops)/ops/admin/donations/actions';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Combobox } from '@shared/ui/combobox';
import { EmptyState } from '@shared/ui/empty-state';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { ScrollArea } from '@shared/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@shared/ui/sheet';
import { Textarea } from '@shared/ui/textarea';
import { Checkbox } from '@shared/ui/checkbox';
import { ToggleGroup, ToggleGroupItem } from '@shared/ui/toggle-group';
import type { DonationCatalogCategory, DonationCatalogItem } from '@/lib/donations/types';
import type { DonationCatalogAdminStats } from '@/lib/donations/service';
import type { InventoryItem } from '@/lib/inventory/types';
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Plus, RefreshCw, Search, SquarePen } from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';

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

const currencyOptions = ['CAD', 'USD'];

function CatalogItemForm({
  item,
  inventoryItems,
  categories,
  variant = 'edit',
}: {
  item?: DonationCatalogItem;
  inventoryItems: InventoryItem[];
  categories: DonationCatalogCategory[];
  variant?: 'edit' | 'create';
}) {
  const inventoryId = item?.inventoryItemId ?? '';
  const metrics = item?.metrics;
  const [isActive, setIsActive] = useState<boolean>(variant === 'create' ? false : (item?.isActive ?? true));
  const [selectedInventoryId, setSelectedInventoryId] = useState(inventoryId);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(item?.categoryIds ?? []);

  const inventoryOptions = useMemo(
    () =>
      inventoryItems.map((inv) => ({
        value: inv.id,
        label: `${inv.name}${inv.unitType ? ` · ${inv.unitType}` : ''}`,
        keywords: `${inv.category ?? ''} ${inv.unitType ?? ''}`.trim(),
      })),
    [inventoryItems],
  );

  const selectedInventory = useMemo(
    () => inventoryItems.find((inv) => inv.id === selectedInventoryId) ?? null,
    [inventoryItems, selectedInventoryId],
  );

  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);

  const selectedCategories = useMemo(
    () => selectedCategoryIds.map((id) => categoryById.get(id)).filter(Boolean) as DonationCatalogCategory[],
    [categoryById, selectedCategoryIds],
  );

  const activationIssues = useMemo(() => {
    const issues: string[] = [];
    if (!selectedInventoryId) issues.push('Select an inventory item before activating.');
    const hasPublicCategory = selectedCategories.some((category) => category.isActive && category.isPublic);
    const hasNonPublicCategory = selectedCategories.some((category) => !category.isPublic);
    if (!hasPublicCategory) issues.push('Select at least one public category before activating.');
    if (hasNonPublicCategory) issues.push('Remove non-public categories before activating.');
    if (selectedInventory && selectedInventory.costPerUnit === null) issues.push('Set a typical cost on the inventory item before activating.');
    return issues;
  }, [selectedCategories, selectedInventory, selectedInventoryId]);
  const canActivate = activationIssues.length === 0;

  return (
    <form
      action={saveCatalogItem}
      className="space-y-4 rounded-2xl border border-border/15 bg-background p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {variant === 'create' ? 'New catalogue item' : item?.category ?? 'Catalogue item'}
          </p>
          <h3 className="text-lg font-semibold text-foreground">
            {item?.title ?? 'Add a new donation option'}
          </h3>
          <p className="text-sm text-foreground/70">
            Map this item to inventory so live stock and distribution metrics can flow to the marketing site.
          </p>
        </div>
        {item ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={item.isActive ? 'outline' : 'secondary'}>
              {item.isActive ? 'Active' : 'Hidden'}
            </Badge>
            <Badge variant="secondary">
              {metrics?.currentStock ?? 0} on hand
              {metrics?.targetBuffer ? ` / ${metrics.targetBuffer} target` : null}
            </Badge>
          </div>
        ) : null}
      </div>

      <input type="hidden" name="id" defaultValue={item?.id ?? ''} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Title (from inventory)</Label>
          <Input value={selectedInventory?.name ?? item?.title ?? ''} disabled placeholder="Select an inventory item" />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`slug-${item?.id ?? 'new'}`}>Slug</Label>
          <Input
            id={`slug-${item?.id ?? 'new'}`}
            name="slug"
            defaultValue={item?.slug}
            placeholder="warm-winter-kit"
          />
        </div>
        <div className="space-y-2">
          <Label>Categories</Label>
          <div className="space-y-2">
            {selectedCategoryIds.map((categoryId) => (
              <input key={categoryId} type="hidden" name="category_ids" value={categoryId} />
            ))}
            <ToggleGroup
              type="multiple"
              value={selectedCategoryIds}
              onValueChange={(value) => setSelectedCategoryIds(value)}
              className="flex flex-wrap justify-start"
            >
              {categories
                .filter((category) => category.isActive)
                .map((category) => (
                  <ToggleGroupItem
                    key={category.id}
                    value={category.id}
                    aria-label={category.label}
                    className={cn(!category.isPublic && 'border-destructive/40 text-destructive')}
                  >
                    {category.label}
                  </ToggleGroupItem>
                ))}
            </ToggleGroup>
            {categories.length === 0 ? (
              <p className="text-xs text-foreground/60">Create categories first, then tag catalogue items.</p>
            ) : null}
            {selectedCategories.some((category) => !category.isPublic) ? (
              <p className="text-xs text-destructive">Non-public categories cannot be used on active marketing items.</p>
            ) : null}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`inventory-${item?.id ?? 'new'}`}>Inventory item</Label>
          <input type="hidden" name="inventory_item_id" value={selectedInventoryId} />
          <Combobox
            value={selectedInventoryId}
            onValueChange={setSelectedInventoryId}
            options={inventoryOptions}
            placeholder="Select an inventory item"
            searchPlaceholder="Search inventory…"
            buttonClassName="rounded-md"
          />
        </div>
        <div className="space-y-2">
          <Label>Typical cost (from inventory)</Label>
          <Input
            value={
              selectedInventory?.costPerUnit === null || selectedInventory?.costPerUnit === undefined
                ? ''
                : selectedInventory.costPerUnit.toFixed(2)
            }
            disabled
            placeholder="Set cost_per_unit on the inventory item"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`currency-${item?.id ?? 'new'}`}>Currency</Label>
          <select
            id={`currency-${item?.id ?? 'new'}`}
            name="currency"
            defaultValue={item?.currency ?? 'CAD'}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {currencyOptions.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`default-qty-${item?.id ?? 'new'}`}>Default quantity</Label>
          <Input
            id={`default-qty-${item?.id ?? 'new'}`}
            name="default_quantity"
            type="number"
            min="1"
            defaultValue={item?.defaultQuantity ?? 1}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`priority-${item?.id ?? 'new'}`}>Display priority (lower shows first)</Label>
          <Input
            id={`priority-${item?.id ?? 'new'}`}
            name="priority"
            type="number"
            min="1"
            defaultValue={item?.priority ?? 100}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`target-${item?.id ?? 'new'}`}>Target buffer</Label>
          <Input
            id={`target-${item?.id ?? 'new'}`}
            name="target_buffer"
            type="number"
            min="0"
            defaultValue={item?.targetBuffer ?? ''}
            placeholder="Optional override"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`image-${item?.id ?? 'new'}`}>Image URL (optional)</Label>
          <Input
            id={`image-${item?.id ?? 'new'}`}
            name="image_url"
            type="url"
            defaultValue={item?.imageUrl ?? ''}
            placeholder="https://example.com/image.jpg"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`short-${item?.id ?? 'new'}`}>Short description</Label>
        <Input
          id={`short-${item?.id ?? 'new'}`}
          name="short_description"
          defaultValue={item?.shortDescription ?? ''}
          placeholder="One sentence for the public catalogue"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`long-${item?.id ?? 'new'}`}>Long description (optional)</Label>
        <Textarea
          id={`long-${item?.id ?? 'new'}`}
          name="long_description"
          defaultValue={item?.longDescription ?? ''}
          placeholder="Context for staff or future UI."
          rows={3}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <input type="hidden" name="is_active" value={isActive ? 'on' : 'off'} />
        <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
          <Checkbox
            checked={isActive}
            onCheckedChange={(value) => {
              const next = Boolean(value);
              if (next && !canActivate) {
                setIsActive(false);
                return;
              }
              setIsActive(next);
            }}
            disabled={!isActive && !canActivate}
            aria-label="Toggle marketing visibility"
          />
          Visible on marketing site
        </label>
        <Button type="submit">{variant === 'create' ? 'Add item' : 'Save changes'}</Button>
      </div>

      {!canActivate ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          <p className="font-semibold">Cannot activate yet</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {activationIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {item ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/20 pt-3 text-xs text-foreground/70">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Slug: {item.slug}</Badge>
            <Badge variant={item.stripePriceId ? 'outline' : 'secondary'}>
              Stripe price: {item.stripePriceId ?? 'Not linked'}
            </Badge>
            <Badge variant={item.stripeProductId ? 'outline' : 'secondary'}>
              Stripe product: {item.stripeProductId ?? 'Not linked'}
            </Badge>
            {metrics?.inventoryItemName ? (
              <Badge variant="outline">
                Inventory: {metrics.inventoryItemName}
                {metrics.inventoryUnitType ? ` · ${metrics.inventoryUnitType}` : ''}
              </Badge>
            ) : (
              <Badge variant="secondary">No inventory link</Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <form action={syncCatalogItemStripeAction}>
              <input type="hidden" name="catalog_item_id" value={item.id} />
              <Button type="submit" variant="secondary" size="sm">
                Sync Stripe price
              </Button>
            </form>
            <form action={toggleCatalogItem}>
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="next_state" value={item.isActive ? 'deactivate' : 'activate'} />
              <Button
                variant="ghost"
                size="sm"
                type="submit"
                className={cn('px-3', item.isActive ? 'text-destructive' : 'text-primary')}
              >
                {item.isActive ? 'Hide from marketing' : 'Activate item'}
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </form>
  );
}

export function DonationCatalogAdmin({ inventoryItems, catalogInventoryItemIds, categories, items, total, stats, initial }: Props) {
  const isLargeScreen = useMediaQuery('(min-width: 1024px)');
  const router = useRouter();
  const pathname = usePathname() ?? '/ops/admin/website/fundraising';
  const replaceTimer = useRef<number | null>(null);

  const [queryDraft, setQueryDraft] = useState(initial.q);
  const [selectedId, setSelectedId] = useState<string>(() => items[0]?.id ?? '');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  useEffect(() => {
    return () => {
      if (replaceTimer.current) window.clearTimeout(replaceTimer.current);
    };
  }, []);

  function replaceParams(next: Partial<Props['initial']>) {
    const q = next.q ?? initial.q;
    const status = next.status ?? initial.status;
    const sort = next.sort ?? initial.sort;
    const page = next.page ?? initial.page;
    const pageSize = next.pageSize ?? initial.pageSize;

    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    params.set('status', status);
    params.set('sort', sort);
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    router.replace(`${pathname}?${params.toString()}`);
  }

  const inventoryById = useMemo(() => new Map(inventoryItems.map((item) => [item.id, item])), [inventoryItems]);
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);

  const catalogInventoryIds = useMemo(() => new Set(catalogInventoryItemIds), [catalogInventoryItemIds]);
  const importableInventory = useMemo(() => inventoryItems.filter((item) => item.active && !catalogInventoryIds.has(item.id)), [
    catalogInventoryIds,
    inventoryItems,
  ]);

  const pageCount = Math.max(1, Math.ceil(total / initial.pageSize));
  const clampedPageIndex = Math.min(initial.page, pageCount - 1);
  const visibleCatalog = items;

  const selectedItem = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);

  function openEditorForItem(id: string) {
    setSelectedId(id);
    if (!isLargeScreen) setEditOpen(true);
  }

  function handleCreate() {
    setCreateOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Catalogue items</p>
          <p className="text-sm text-muted-foreground">
            Search and edit items in a split view (only one editor renders at a time for scalability).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" onClick={() => setCategoriesOpen(true)}>
            Manage categories
          </Button>
          <Button type="button" onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" aria-hidden />
            New item
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(320px,440px),1fr]">
        <section className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1 space-y-2">
              <Label htmlFor="catalog-search">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
                <Input
                  id="catalog-search"
                  value={queryDraft}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setQueryDraft(nextValue);
                    if (replaceTimer.current) window.clearTimeout(replaceTimer.current);
                    replaceTimer.current = window.setTimeout(() => {
                      replaceParams({ q: nextValue, page: 0 });
                    }, 250);
                  }}
                  placeholder="Title, category, slug…"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <ToggleGroup
                type="single"
                value={initial.status}
                onValueChange={(value) => {
                  const next = (value as Props['initial']['status']) || 'all';
                  replaceParams({ status: next, page: 0 });
                }}
                variant="outline"
                size="sm"
              >
                <ToggleGroupItem value="all" aria-label="All items">
                  All
                </ToggleGroupItem>
                <ToggleGroupItem value="active" aria-label="Active items">
                  Active
                </ToggleGroupItem>
                <ToggleGroupItem value="hidden" aria-label="Hidden items">
                  Hidden
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="w-[170px] space-y-2">
              <Label htmlFor="catalog-sort">Sort</Label>
              <select
                id="catalog-sort"
                value={initial.sort}
                onChange={(event) => {
                  replaceParams({ sort: event.target.value as Props['initial']['sort'], page: 0 });
                }}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="priority">Priority</option>
                <option value="title">Title</option>
                <option value="stock">Stock</option>
              </select>
            </div>

            <div className="w-[140px] space-y-2">
              <Label htmlFor="catalog-page-size">Page size</Label>
              <select
                id="catalog-page-size"
                value={String(initial.pageSize)}
                onChange={(event) => {
                  replaceParams({ pageSize: Number.parseInt(event.target.value, 10) as Props['initial']['pageSize'], page: 0 });
                }}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-border/15 bg-background shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/15 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{total} matching</Badge>
                <Badge variant="outline">{stats.active} active</Badge>
                <Badge variant="outline">{stats.hidden} hidden</Badge>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => replaceParams({ page: Math.max(0, clampedPageIndex - 1) })}
                  disabled={clampedPageIndex <= 0}
                  aria-label="Previous page"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {clampedPageIndex + 1} / {pageCount}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => replaceParams({ page: Math.min(pageCount - 1, clampedPageIndex + 1) })}
                  disabled={clampedPageIndex >= pageCount - 1}
                  aria-label="Next page"
                >
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[62vh] pr-1">
              {visibleCatalog.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">No matching catalogue items.</div>
              ) : (
                <ul className="space-y-2 p-3">
                  {visibleCatalog.map((item) => {
                    const inventoryLabel =
                      item.metrics.inventoryItemName ?? inventoryById.get(item.inventoryItemId)?.name ?? 'Inventory item';
                    const categoryLabels = item.categoryIds
                      .map((categoryId) => categoryById.get(categoryId)?.label ?? null)
                      .filter((value): value is string => Boolean(value));
                    const categorySummary =
                      categoryLabels.length === 0
                        ? item.category ?? 'Uncategorized'
                        : `${categoryLabels.slice(0, 2).join(', ')}${categoryLabels.length > 2 ? ` +${categoryLabels.length - 2}` : ''}`;
                    const isSelected = item.id === selectedId;
                    return (
                      <li
                        key={item.id}
                        className={cn(
                          'rounded-2xl border border-border/20 bg-card shadow-sm transition hover:border-primary/30 hover:shadow-md',
                          isSelected ? 'border-primary/50' : null,
                        )}
                      >
                        <div className="flex items-start gap-3 p-3">
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            onClick={() => openEditorForItem(item.id)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {categorySummary} · {inventoryLabel}
                                </p>
                              </div>
                              <Badge variant={item.isActive ? 'outline' : 'secondary'}>{item.isActive ? 'Active' : 'Hidden'}</Badge>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span>Priority {item.priority}</span>
                              <span>·</span>
                              <span>{item.metrics.currentStock ?? 0} on hand</span>
                              {item.metrics.targetBuffer ? (
                                <>
                                  <span>·</span>
                                  <span>{item.metrics.targetBuffer} target</span>
                                </>
                              ) : null}
                              {item.stripePriceId ? (
                                <>
                                  <span>·</span>
                                  <span>Stripe linked</span>
                                </>
                              ) : null}
                            </div>
                          </button>

                          <div className="flex flex-col items-end gap-2">
                            <Button
                              type="button"
                              variant={isSelected ? 'secondary' : 'ghost'}
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => openEditorForItem(item.id)}
                              aria-label="Edit item"
                            >
                              <SquarePen className="h-4 w-4" aria-hidden />
                            </Button>

                            <form action={syncCatalogItemStripeAction}>
                              <input type="hidden" name="catalog_item_id" value={item.id} />
                              <Button
                                type="submit"
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9"
                                aria-label="Sync Stripe price"
                              >
                                <RefreshCw className="h-4 w-4" aria-hidden />
                              </Button>
                            </form>

                            <form action={toggleCatalogItem}>
                              <input type="hidden" name="id" value={item.id} />
                              <input type="hidden" name="next_state" value={item.isActive ? 'deactivate' : 'activate'} />
                              <Button
                                variant="ghost"
                                size="icon"
                                type="submit"
                                className={cn('h-9 w-9', item.isActive ? 'text-destructive' : 'text-primary')}
                                aria-label={item.isActive ? 'Hide from marketing' : 'Activate item'}
                              >
                                {item.isActive ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                              </Button>
                            </form>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="hidden lg:block">
            {selectedItem ? (
              <div className="sticky top-28 max-h-[calc(100vh-9rem)] overflow-y-auto pr-1">
                <CatalogItemForm key={selectedItem.id} item={selectedItem} inventoryItems={inventoryItems} categories={categories} />
              </div>
            ) : (
              <EmptyState
                title="Select an item"
                description="Choose a catalogue item from the list to edit details, inventory mapping, and Stripe bindings."
                className="sticky top-28"
              />
            )}
          </div>

          <div className="rounded-2xl border border-border/15 bg-background px-4 py-3 shadow-sm">
            <h4 className="text-sm font-semibold text-foreground">Live stats</h4>
            <p className="mt-1 text-sm text-foreground/70">
              The marketing page reads from <code>portal.donation_catalog_public</code>. Data updates after each save and cache revalidation.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-muted p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Active items</p>
                <p className="text-xl font-semibold text-foreground">{stats.active}</p>
              </div>
              <div className="rounded-xl bg-muted p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Hidden items</p>
                <p className="text-xl font-semibold text-foreground">{stats.hidden}</p>
              </div>
            </div>
            <div className="mt-4 rounded-xl bg-muted p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Import from inventory</p>
              {importableInventory.length === 0 ? (
                <p className="mt-2 text-xs text-foreground/70">All active inventory items are already mapped.</p>
              ) : (
                <form action={importInventoryItem} className="mt-2 space-y-2">
                  <InventoryImportPicker inventoryItems={importableInventory} />
                  <p className="text-xs text-foreground/60">Imports name, category, target buffer, and unit cost. You can edit details after import.</p>
                  <Button type="submit" size="sm" className="w-full">
                    Import selected item
                  </Button>
                </form>
              )}
            </div>
          </div>
        </aside>
      </div>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="right" className="w-full max-w-[720px]">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" aria-hidden /> New catalogue item
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 max-h-[80vh] overflow-y-auto pr-1">
            <CatalogItemForm inventoryItems={inventoryItems} categories={categories} variant="create" />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="right" className="w-full max-w-[720px] lg:hidden">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2">
              <SquarePen className="h-4 w-4" aria-hidden /> Edit item
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 max-h-[80vh] overflow-y-auto pr-1">
            {selectedItem ? (
              <CatalogItemForm key={selectedItem.id} item={selectedItem} inventoryItems={inventoryItems} categories={categories} />
            ) : (
              <EmptyState title="Select an item" description="Choose a catalogue item from the list to edit it." />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={categoriesOpen} onOpenChange={setCategoriesOpen}>
        <SheetContent side="right" className="w-full max-w-[720px]">
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
                      <input type="checkbox" name="is_public" value="on" defaultChecked className="h-4 w-4" />
                      Public
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input type="hidden" name="is_active" value="off" />
                      <input type="checkbox" name="is_active" value="on" defaultChecked className="h-4 w-4" />
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
                            <input
                              type="checkbox"
                              name="is_public"
                              value="on"
                              defaultChecked={category.isPublic}
                              className="h-4 w-4"
                            />
                            Public
                          </label>
                          <label className="inline-flex items-center gap-2">
                            <input type="hidden" name="is_active" value="off" />
                            <input
                              type="checkbox"
                              name="is_active"
                              value="on"
                              defaultChecked={category.isActive}
                              className="h-4 w-4"
                            />
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

function InventoryImportPicker({ inventoryItems }: { inventoryItems: InventoryItem[] }) {
  const [value, setValue] = useState('');
  const options = useMemo(
    () =>
      inventoryItems.map((inv) => ({
        value: inv.id,
        label: `${inv.name}${inv.unitType ? ` · ${inv.unitType}` : ''}${inv.category ? ` (${inv.category})` : ''}`,
        keywords: `${inv.category ?? ''} ${inv.unitType ?? ''}`.trim(),
      })),
    [inventoryItems],
  );

  return (
    <>
      <input type="hidden" name="inventory_item_id" value={value} />
      <Combobox
        value={value}
        onValueChange={setValue}
        options={options}
        placeholder="Select an inventory item"
        searchPlaceholder="Search inventory…"
        buttonClassName="rounded-md"
      />
    </>
  );
}
