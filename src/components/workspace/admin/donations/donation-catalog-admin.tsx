"use client";

import { useState } from 'react';
import { saveCatalogItem, toggleCatalogItem, importInventoryItem } from '@/app/(ops)/ops/admin/donations/actions';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import { Textarea } from '@shared/ui/textarea';
import { Checkbox } from '@shared/ui/checkbox';
import type { DonationCatalogItem } from '@/lib/donations/types';
import type { InventoryItem } from '@/lib/inventory/types';
import { cn } from '@/lib/utils';

type Props = {
  catalog: DonationCatalogItem[];
  inventoryItems: InventoryItem[];
};

const currencyOptions = ['CAD', 'USD'];

function CatalogItemForm({
  item,
  inventoryItems,
  variant = 'edit',
}: {
  item?: DonationCatalogItem;
  inventoryItems: InventoryItem[];
  variant?: 'edit' | 'create';
}) {
  const inventoryId = item?.inventoryItemId ?? '';
  const metrics = item?.metrics;
  const [isActive, setIsActive] = useState<boolean>(item?.isActive ?? true);

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
          <Label htmlFor={`title-${item?.id ?? 'new'}`}>Title</Label>
          <Input
            id={`title-${item?.id ?? 'new'}`}
            name="title"
            defaultValue={item?.title}
            placeholder="Warm winter kit"
            required
          />
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
          <Label htmlFor={`category-${item?.id ?? 'new'}`}>Category</Label>
          <Input
            id={`category-${item?.id ?? 'new'}`}
            name="category"
            defaultValue={item?.category ?? ''}
            placeholder="Warmth, Hygiene, Nutrition"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`inventory-${item?.id ?? 'new'}`}>Inventory item</Label>
          <Select name="inventory_item_id" defaultValue={inventoryId || undefined} required>
            <SelectTrigger id={`inventory-${item?.id ?? 'new'}`}>
              <SelectValue placeholder="Select an inventory item" />
            </SelectTrigger>
            <SelectContent>
              {inventoryItems.map((inv) => (
                <SelectItem key={inv.id} value={inv.id}>
                  {inv.name} {inv.unitType ? `· ${inv.unitType}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`unit-cost-${item?.id ?? 'new'}`}>Typical cost (dollars)</Label>
          <Input
            id={`unit-cost-${item?.id ?? 'new'}`}
            name="unit_cost"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            defaultValue={item?.unitCostCents ? (item.unitCostCents / 100).toFixed(2) : ''}
            placeholder="15.00"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`currency-${item?.id ?? 'new'}`}>Currency</Label>
          <Select name="currency" defaultValue={item?.currency ?? 'CAD'}>
            <SelectTrigger id={`currency-${item?.id ?? 'new'}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencyOptions.map((code) => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <div className="space-y-2">
          <Label htmlFor={`stripe-${item?.id ?? 'new'}`}>Stripe price ID (optional)</Label>
          <Input
            id={`stripe-${item?.id ?? 'new'}`}
            name="stripe_price_id"
            defaultValue={item?.stripePriceId ?? ''}
            placeholder="price_123"
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
            onCheckedChange={(value) => setIsActive(Boolean(value))}
            aria-label="Toggle marketing visibility"
          />
          Visible on marketing site
        </label>
        <Button type="submit">{variant === 'create' ? 'Add item' : 'Save changes'}</Button>
      </div>

      {item ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/20 pt-3 text-xs text-foreground/70">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Slug: {item.slug}</Badge>
            {metrics?.inventoryItemName ? (
              <Badge variant="outline">
                Inventory: {metrics.inventoryItemName}
                {metrics.inventoryUnitType ? ` · ${metrics.inventoryUnitType}` : ''}
              </Badge>
            ) : (
              <Badge variant="secondary">No inventory link</Badge>
            )}
          </div>
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
      ) : null}
    </form>
  );
}

export function DonationCatalogAdmin({ catalog, inventoryItems }: Props) {
  const activeItems = catalog.filter((item) => item.isActive);
  const inactiveItems = catalog.filter((item) => !item.isActive);
  const catalogInventoryIds = new Set(catalog.map((item) => item.inventoryItemId));
  const importableInventory = inventoryItems.filter((item) => item.active && !catalogInventoryIds.has(item.id));

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <CatalogItemForm inventoryItems={inventoryItems} variant="create" />
        <div className="rounded-2xl border border-border/15 bg-background px-4 py-3 shadow-sm">
          <h4 className="text-sm font-semibold text-foreground">Live stats</h4>
          <p className="mt-1 text-sm text-foreground/70">
            The marketing page reads from <code>portal.donation_catalog_public</code>. Data updates after each save and
            cache revalidation.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-muted p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Active items</p>
              <p className="text-xl font-semibold text-foreground">{activeItems.length}</p>
            </div>
            <div className="rounded-xl bg-muted p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Hidden items</p>
              <p className="text-xl font-semibold text-foreground">{inactiveItems.length}</p>
            </div>
          </div>
          <div className="mt-4 rounded-xl bg-muted p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Import from inventory</p>
            {importableInventory.length === 0 ? (
              <p className="mt-2 text-xs text-foreground/70">All active inventory items are already mapped.</p>
            ) : (
              <form action={importInventoryItem} className="mt-2 space-y-2">
                <Select name="inventory_item_id" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an inventory item" />
                  </SelectTrigger>
                  <SelectContent>
                    {importableInventory.map((inv) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.name} {inv.unitType ? `· ${inv.unitType}` : ''} {inv.category ? `(${inv.category})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-foreground/60">
                  Imports name, category, target buffer, and unit cost. You can edit details after import.
                </p>
                <Button type="submit" size="sm" className="w-full">
                  Import selected item
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {catalog.length === 0 ? (
          <div className="rounded-2xl border border-border/15 bg-background p-4 text-sm text-foreground/70 shadow-sm">
            No catalogue items yet. Add one above to get started.
          </div>
        ) : (
          catalog.map((item) => (
            <CatalogItemForm key={item.id} item={item} inventoryItems={inventoryItems} />
          ))
        )}
      </div>
    </div>
  );
}
