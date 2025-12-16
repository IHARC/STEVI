'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Button } from '@shared/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@shared/ui/form';
import { Input } from '@shared/ui/input';
import { Textarea } from '@shared/ui/textarea';
import { Checkbox } from '@shared/ui/checkbox';
import { Badge } from '@shared/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@shared/ui/toggle-group';
import { Progress } from '@shared/ui/progress';
import { useToast } from '@shared/ui/use-toast';
import { cn } from '@/lib/utils';
import type { InventoryItem, InventoryLocation, InventoryOrganization, InventoryReceipt } from '@/lib/inventory/types';
import type { DonationCatalogCategory, DonationCatalogItem } from '@/lib/donations/types';
import { computeDonationNeedMetrics } from '@/lib/donations/need-math';
import { InventoryReceiptsSection } from '@workspace/admin/inventory/inventory-receipts';
import { AdjustStockDialog, ReceiveStockDialog, TransferStockDialog } from '@workspace/admin/inventory/items/StockDialogs';
import { useInventoryActions } from '@workspace/admin/inventory/items/useInventoryActions';
import { saveCatalogItem, syncCatalogItemStripeAction, removeCatalogItemAction } from '@/app/(ops)/ops/admin/donations/actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import { Label } from '@shared/ui/label';

type InventoryFormValues = {
  actor_profile_id: string;
  item_id: string;
  name: string;
  category: string;
  unit_type: string;
  supplier: string;
  minimum_threshold: string;
  cost_per_unit: string;
  description: string;
  active: boolean;
};

type Props = {
  item: InventoryItem;
  categories: string[];
  locations: InventoryLocation[];
  organizations: InventoryOrganization[];
  receipts: InventoryReceipt[];
  actorProfileId: string;
  canManageDonations: boolean;
  donation: DonationCatalogItem | null;
  donationCategories: DonationCatalogCategory[];
  initialTab?: 'inventory' | 'stock' | 'donations';
};

export function InventoryItemDetail({
  item,
  categories,
  locations,
  organizations,
  receipts,
  actorProfileId,
  canManageDonations,
  donation,
  donationCategories,
  initialTab = 'inventory',
}: Props) {
  const router = useRouter();
  const categoryOptions = useMemo(
    () => Array.from(new Set(categories)).sort((a, b) => a.localeCompare(b)),
    [categories],
  );

  const [activeTab, setActiveTab] = useState<string>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className={cn('grid h-auto w-full gap-1 rounded-2xl', canManageDonations ? 'grid-cols-3' : 'grid-cols-2')}>
        <TabsTrigger value="inventory" className="w-full rounded-xl px-3 text-xs font-semibold">
          Inventory
        </TabsTrigger>
        <TabsTrigger value="stock" className="w-full rounded-xl px-3 text-xs font-semibold">
          Stock & receipts
        </TabsTrigger>
        {canManageDonations ? (
          <TabsTrigger value="donations" className="w-full rounded-xl px-3 text-xs font-semibold">
            Donations
          </TabsTrigger>
        ) : null}
      </TabsList>

      <TabsContent value="inventory">
        <InventoryDetailsCard item={item} actorProfileId={actorProfileId} categoryOptions={categoryOptions} onBack={() => router.push('/ops/supplies')} />
      </TabsContent>

      <TabsContent value="stock">
        <ItemStockCard
          item={item}
          actorProfileId={actorProfileId}
          locations={locations}
          organizations={organizations}
          receipts={receipts}
        />
      </TabsContent>

      {canManageDonations ? (
        <TabsContent value="donations">
          <DonationListingCard
            key={donation?.id ?? 'new'}
            inventoryItem={item}
            actorProfileId={actorProfileId}
            listing={donation}
            categories={donationCategories}
          />
        </TabsContent>
      ) : null}
    </Tabs>
  );
}

function InventoryDetailsCard({
  item,
  actorProfileId,
  categoryOptions,
  onBack,
}: {
  item: InventoryItem;
  actorProfileId: string;
  categoryOptions: string[];
  onBack: () => void;
}) {
  const { isPending, updateItem, toggleItem, deleteItem } = useInventoryActions({ actorProfileId });
  const submitUpdate = (formData: FormData) => updateItem(formData).then(() => undefined);

  const form = useForm<InventoryFormValues>({
    defaultValues: {
      actor_profile_id: actorProfileId,
      item_id: item.id,
      name: item.name,
      category: item.category ?? '',
      unit_type: item.unitType ?? '',
      supplier: item.supplier ?? '',
      minimum_threshold: item.minimumThreshold?.toString() ?? '',
      cost_per_unit: item.costPerUnit?.toString() ?? '',
      description: item.description ?? '',
      active: item.active,
    },
  });

  useEffect(() => {
    form.reset({
      actor_profile_id: actorProfileId,
      item_id: item.id,
      name: item.name,
      category: item.category ?? '',
      unit_type: item.unitType ?? '',
      supplier: item.supplier ?? '',
      minimum_threshold: item.minimumThreshold?.toString() ?? '',
      cost_per_unit: item.costPerUnit?.toString() ?? '',
      description: item.description ?? '',
      active: item.active,
    });
  }, [actorProfileId, form, item]);

  return (
    <Card className="border-border/60">
      <CardHeader className="space-y-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-xl">Inventory details</CardTitle>
            <CardDescription>Core item fields used by stock tracking and donation listings.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={item.active ? 'secondary' : 'outline'}>{item.active ? 'Active' : 'Inactive'}</Badge>
            <Badge variant="outline">{item.onHandQuantity.toLocaleString()} on hand</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form action={submitUpdate} className="space-y-6">
            <input type="hidden" {...form.register('actor_profile_id')} />
            <input type="hidden" {...form.register('item_id')} />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                rules={{ required: 'Name is required' }}
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel htmlFor="name">Name</FormLabel>
                    <FormControl>
                      <Input id="name" required {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                rules={{ required: 'Category is required' }}
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel htmlFor="item_category">Category</FormLabel>
                    <FormControl>
                      <Input list="inventory-categories" id="item_category" required {...field} />
                    </FormControl>
                    <FormMessage />
                    <datalist id="inventory-categories">
                      {categoryOptions.map((category) => (
                        <option key={category} value={category} />
                      ))}
                    </datalist>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit_type"
                rules={{ required: 'Unit type is required' }}
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel htmlFor="unit_type">Unit type</FormLabel>
                    <FormControl>
                      <Input id="unit_type" required placeholder="E.g. each, box, kit" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel htmlFor="supplier">Supplier</FormLabel>
                    <FormControl>
                      <Input id="supplier" placeholder="Optional" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="minimum_threshold"
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel htmlFor="minimum_threshold">Minimum threshold</FormLabel>
                    <FormControl>
                      <Input id="minimum_threshold" type="number" min={0} placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cost_per_unit"
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel htmlFor="cost_per_unit">Typical unit cost</FormLabel>
                    <FormControl>
                      <Input id="cost_per_unit" type="number" min={0} step="0.01" placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel htmlFor="item_description">Description</FormLabel>
                  <FormControl>
                    <Textarea id="item_description" rows={3} placeholder="Optional context for staff" {...field} />
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
                      id="item_active"
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                    />
                  </FormControl>
                  <FormLabel htmlFor="item_active" className="text-sm font-normal text-muted-foreground">
                    Active
                  </FormLabel>
                </FormItem>
              )}
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={onBack} disabled={isPending}>
                  Back to Supplies
                </Button>
                <Button type="button" variant="secondary" onClick={() => toggleItem(item, !item.active)} disabled={isPending}>
                  {item.active ? 'Deactivate' : 'Activate'}
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => deleteItem(item)}
                  disabled={isPending}
                >
                  Delete item
                </Button>
                <Button type="submit" disabled={isPending}>
                  Save changes
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function ItemStockCard({
  item,
  actorProfileId,
  locations,
  organizations,
  receipts,
}: {
  item: InventoryItem;
  actorProfileId: string;
  locations: InventoryLocation[];
  organizations: InventoryOrganization[];
  receipts: InventoryReceipt[];
}) {
  const [itemToReceive, setItemToReceive] = useState<InventoryItem | null>(null);
  const [itemToTransfer, setItemToTransfer] = useState<InventoryItem | null>(null);
  const [itemToAdjust, setItemToAdjust] = useState<InventoryItem | null>(null);

  const activeOrganizations = useMemo(() => organizations.filter((org) => org.isActive), [organizations]);

  const { isPending, receiveStock, transferStock, adjustStock } = useInventoryActions({ actorProfileId });

  return (
    <div className="space-y-6">
      <Card className="border-border/60">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">Stock actions</CardTitle>
          <CardDescription>Receive, transfer, or adjust stock. Visit distributions should be logged from the Visit flow.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setItemToReceive(item)}>
            Receive
          </Button>
          <Button variant="outline" onClick={() => setItemToTransfer(item)}>
            Transfer
          </Button>
          <Button variant="outline" onClick={() => setItemToAdjust(item)}>
            Adjust
          </Button>
        </CardContent>
      </Card>

      <InventoryReceiptsSection receipts={receipts} organizations={organizations} actorProfileId={actorProfileId} />

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
    </div>
  );
}

function DonationListingCard({
  inventoryItem,
  actorProfileId,
  listing,
  categories,
}: {
  inventoryItem: InventoryItem;
  actorProfileId: string;
  listing: DonationCatalogItem | null;
  categories: DonationCatalogCategory[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(() => listing?.categoryIds ?? []);
  const [isActive, setIsActive] = useState<boolean>(() => listing?.isActive ?? false);
  const [currency, setCurrency] = useState<string>(() => listing?.currency ?? 'CAD');

  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const selectedCategories = useMemo(
    () => selectedCategoryIds.map((id) => categoryById.get(id)).filter(Boolean) as DonationCatalogCategory[],
    [categoryById, selectedCategoryIds],
  );

  const activationIssues = (() => {
    const issues: string[] = [];
    if (!listing?.id) issues.push('Save the catalogue listing before activation.');
    if (listing?.id && !listing.stripePriceId) issues.push('Sync a Stripe price before activating.');
    const hasPublicCategory = selectedCategories.some((category) => category.isActive && category.isPublic);
    const hasNonPublicCategory = selectedCategories.some((category) => !category.isPublic);
    if (!hasPublicCategory) issues.push('Select at least one public category before activating.');
    if (hasNonPublicCategory) issues.push('Remove non-public categories before activating.');
    if (inventoryItem.costPerUnit === null) issues.push('Set a typical unit cost in Inventory before activating.');
    return issues;
  })();

  const canActivate = activationIssues.length === 0;
  const marketingPreview = listing?.id
    ? computeDonationNeedMetrics({
        targetBuffer: listing.targetBuffer ?? listing.metrics.targetBuffer,
        currentStock: listing.metrics.currentStock,
        distributedLast30Days: listing.metrics.distributedLast30Days,
      })
    : null;

  const submitSave = async (formData: FormData) => {
    formData.set('actor_profile_id', actorProfileId);
    try {
      await saveCatalogItem(formData);
      toast({ title: 'Donation catalogue updated', description: 'Donation settings saved.' });
      startTransition(() => router.refresh());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save donation settings.';
      toast({ title: 'Donation error', variant: 'destructive', description: message });
    }
  };

  const submitStripeSync = async () => {
    if (!listing?.id) {
      toast({ title: 'Donation error', variant: 'destructive', description: 'Save the listing before syncing Stripe.' });
      return;
    }

    const formData = new FormData();
    formData.set('catalog_item_id', listing.id);

    try {
      await syncCatalogItemStripeAction(formData);
      toast({ title: 'Stripe synced', description: 'Stripe product/price updated.' });
      startTransition(() => router.refresh());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sync Stripe price.';
      toast({ title: 'Stripe error', variant: 'destructive', description: message });
    }
  };

  const submitRemove = async () => {
    const formData = new FormData();
    formData.set('inventory_item_id', inventoryItem.id);
    formData.set('actor_profile_id', actorProfileId);

    try {
      await removeCatalogItemAction(formData);
      toast({ title: 'Donation listing removed', description: 'This item is no longer in the public donation catalogue.' });
      setIsActive(false);
      setSelectedCategoryIds([]);
      startTransition(() => router.refresh());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to remove donation listing.';
      toast({ title: 'Donation error', variant: 'destructive', description: message });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/60">
        <CardHeader className="space-y-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-xl">Donation catalogue listing</CardTitle>
              <CardDescription>Controls what appears on iharc.ca and how it syncs to Stripe.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={listing?.id ? 'secondary' : 'outline'}>{listing?.id ? 'Listed' : 'Not listed'}</Badge>
              <Badge variant={isActive ? 'default' : 'outline'}>{isActive ? 'Active' : 'Hidden'}</Badge>
              <Badge variant="outline">{(listing?.metrics.currentStock ?? inventoryItem.onHandQuantity).toLocaleString()} stock</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {marketingPreview ? (
            <div className="mb-6 space-y-4 rounded-2xl border border-border/15 bg-background p-4 shadow-sm">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Marketing preview</p>
                <p className="text-sm text-muted-foreground">These metrics drive “Most needed” ranking on iharc.ca.</p>
              </div>

              {marketingPreview.targetBuffer !== null && marketingPreview.targetBuffer > 0 && marketingPreview.currentStock !== null ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">
                      On hand <span className="font-semibold text-foreground">{marketingPreview.currentStock.toLocaleString()}</span>
                      {' / '}
                      Target <span className="font-semibold text-foreground">{marketingPreview.targetBuffer.toLocaleString()}</span>
                    </span>
                    {marketingPreview.shortBy !== null ? (
                      <Badge variant={marketingPreview.shortBy > 0 ? 'destructive' : 'outline'}>
                        Short by {marketingPreview.shortBy.toLocaleString()}
                      </Badge>
                    ) : null}
                  </div>
                  <Progress
                    value={Math.min(100, (marketingPreview.currentStock / marketingPreview.targetBuffer) * 100)}
                    aria-label="On hand versus target"
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Set a positive target buffer to compute shortfall and ranking metrics.
                </p>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border/10 bg-background p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Need %</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {marketingPreview.needPct === null ? '—' : `${Math.round(marketingPreview.needPct * 100)}%`}
                  </p>
                </div>
                <div className="rounded-xl border border-border/10 bg-background p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Burn rate</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {marketingPreview.burnRatePerDay === null ? '—' : `${marketingPreview.burnRatePerDay.toFixed(1)}/day`}
                  </p>
                </div>
                <div className="rounded-xl border border-border/10 bg-background p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Days of stock</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {marketingPreview.daysOfStock === null ? '—' : `~${Math.round(marketingPreview.daysOfStock)} days`}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6 rounded-2xl border border-border/15 bg-background p-4 text-sm text-muted-foreground shadow-sm">
              Save the catalogue listing to see how it will rank on iharc.ca.
            </div>
          )}

          <form action={submitSave} className="space-y-6">
            {listing?.id ? <input type="hidden" name="id" value={listing.id} /> : null}
            <input type="hidden" name="inventory_item_id" value={inventoryItem.id} />
            {selectedCategoryIds.map((categoryId) => (
              <input key={categoryId} type="hidden" name="category_ids" value={categoryId} />
            ))}
            <input type="hidden" name="is_active" value={isActive ? 'on' : ''} />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <FormLabel>Title (from inventory)</FormLabel>
                <Input value={inventoryItem.name} disabled />
              </div>
              <div className="space-y-2">
                <FormLabel htmlFor="slug">Slug</FormLabel>
                <Input id="slug" name="slug" defaultValue={listing?.slug ?? ''} placeholder="warm-winter-kit" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <FormLabel htmlFor="short_description">Short description</FormLabel>
                <Textarea
                  id="short_description"
                  name="short_description"
                  defaultValue={listing?.shortDescription ?? ''}
                  placeholder="One-line summary shown on the donation page."
                  rows={2}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <FormLabel htmlFor="long_description">Long description</FormLabel>
                <Textarea
                  id="long_description"
                  name="long_description"
                  defaultValue={listing?.longDescription ?? ''}
                  placeholder="Optional details, impact notes, or what this kit includes."
                  rows={4}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <FormLabel htmlFor="currency">Currency</FormLabel>
                <Select
                  name="currency"
                  value={currency}
                  onValueChange={setCurrency}
                >
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CAD">CAD</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <FormLabel htmlFor="default_quantity">Default quantity</FormLabel>
                <Input
                  id="default_quantity"
                  name="default_quantity"
                  type="number"
                  min="1"
                  defaultValue={listing?.defaultQuantity ?? 1}
                />
              </div>
              <div className="space-y-2">
                <FormLabel htmlFor="priority">Display priority</FormLabel>
                <Input id="priority" name="priority" type="number" min="1" defaultValue={listing?.priority ?? 100} />
              </div>
              <div className="space-y-2">
                <FormLabel htmlFor="target_buffer">Target buffer</FormLabel>
                <Input
                  id="target_buffer"
                  name="target_buffer"
                  type="number"
                  min="0"
                  defaultValue={listing?.targetBuffer ?? ''}
                  placeholder={inventoryItem.minimumThreshold?.toString() ?? 'Optional'}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <FormLabel htmlFor="image_url">Image URL</FormLabel>
                <Input
                  id="image_url"
                  name="image_url"
                  type="url"
                  defaultValue={listing?.imageUrl ?? ''}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>

            <div className="space-y-2">
              <FormLabel>Categories</FormLabel>
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">Create donation categories first, then tag this listing.</p>
              ) : (
                <>
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
                  {selectedCategories.some((category) => !category.isPublic) ? (
                    <p className="text-xs text-destructive">Non-public categories cannot be used on active marketing items.</p>
                  ) : null}
                </>
              )}
            </div>

            <div className="rounded-2xl border border-border/15 bg-background p-4 shadow-sm">
              <p className="text-sm font-semibold text-foreground">Stripe sync</p>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stripe product</p>
                  <p className="text-sm text-foreground">{listing?.stripeProductId ?? '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stripe price</p>
                  <p className="text-sm text-foreground">{listing?.stripePriceId ?? '—'}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button type="button" variant="secondary" onClick={submitStripeSync} disabled={isPending || !listing?.id}>
                  Sync Stripe price
                </Button>
                {!listing?.id ? (
                  <p className="text-xs text-muted-foreground">Save the listing first, then sync Stripe.</p>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-border/15 bg-background p-4 shadow-sm">
              <p className="text-sm font-semibold text-foreground">Visibility</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Active listings appear on iharc.ca. Hidden listings stay in the catalogue for review.
              </p>
              {activationIssues.length > 0 ? (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {activationIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-4 flex items-center gap-2">
                <Checkbox
                  id="donation_is_active"
                  checked={isActive}
                  disabled={!canActivate || isPending}
                  onCheckedChange={(checked) => setIsActive(Boolean(checked))}
                />
                <Label htmlFor="donation_is_active" className={cn('text-sm font-normal', !canActivate && 'text-muted-foreground')}>
                  Active on marketing site
                </Label>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button type="button" variant="destructive" onClick={submitRemove} disabled={isPending || !listing?.id}>
                Remove listing
              </Button>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={() => router.push('/ops/supplies/donations')} disabled={isPending}>
                  Open catalogue list
                </Button>
                <Button type="submit" disabled={isPending}>
                  Save donation settings
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
