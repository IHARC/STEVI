'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { InventoryItem } from '@/lib/inventory/types';
import type { DonationCatalogCategory, DonationCatalogItem } from '@/lib/donations/types';
import { computeDonationNeedMetrics } from '@/lib/donations/need-math';
import { cn } from '@/lib/utils';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Checkbox } from '@shared/ui/checkbox';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { Progress } from '@shared/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import { Textarea } from '@shared/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@shared/ui/toggle-group';
import { useToast } from '@shared/ui/use-toast';
import { removeCatalogItemAction, saveCatalogItem, syncCatalogItemStripeAction } from '@/app/(app-admin)/app-admin/donations/actions';

export function DonationListingCard({
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
                <p className="text-sm text-muted-foreground">Set a positive target buffer to compute shortfall and ranking metrics.</p>
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
                <Label>Title (from inventory)</Label>
                <Input value={inventoryItem.name} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" name="slug" defaultValue={listing?.slug ?? ''} placeholder="warm-winter-kit" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="short_description">Short description</Label>
                <Textarea
                  id="short_description"
                  name="short_description"
                  defaultValue={listing?.shortDescription ?? ''}
                  placeholder="One-line summary shown on the donation page."
                  rows={2}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="long_description">Long description</Label>
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
                <Label htmlFor="currency">Currency</Label>
                <Select name="currency" value={currency} onValueChange={setCurrency}>
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
                <Label htmlFor="default_quantity">Default quantity</Label>
                <Input id="default_quantity" name="default_quantity" type="number" min="1" defaultValue={listing?.defaultQuantity ?? 1} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Display priority</Label>
                <Input id="priority" name="priority" type="number" min="1" defaultValue={listing?.priority ?? 100} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target_buffer">Target buffer</Label>
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
                <Label htmlFor="image_url">Image URL</Label>
                <Input id="image_url" name="image_url" type="url" defaultValue={listing?.imageUrl ?? ''} placeholder="https://example.com/image.jpg" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Categories</Label>
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">Create donation categories first, then tag this listing.</p>
              ) : (
                <>
                  <ToggleGroup type="multiple" value={selectedCategoryIds} onValueChange={setSelectedCategoryIds} className="flex flex-wrap justify-start">
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
                {!listing?.id ? <p className="text-xs text-muted-foreground">Save the listing first, then sync Stripe.</p> : null}
              </div>
            </div>

            <div className="rounded-2xl border border-border/15 bg-background p-4 shadow-sm">
              <p className="text-sm font-semibold text-foreground">Visibility</p>
              <p className="mt-1 text-sm text-muted-foreground">Active listings appear on iharc.ca. Hidden listings stay in the catalogue for review.</p>
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
                <Button type="button" variant="outline" onClick={() => router.push('/ops/fundraising?tab=catalogue')} disabled={isPending}>
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

