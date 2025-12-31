'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Button } from '@shared/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@shared/ui/form';
import { Input } from '@shared/ui/input';
import { Textarea } from '@shared/ui/textarea';
import { Checkbox } from '@shared/ui/checkbox';
import { cn } from '@/lib/utils';
import type { InventoryItem, InventoryLocation, InventoryOrganization, InventoryReceipt } from '@/lib/inventory/types';
import { InventoryReceiptsSection } from '@workspace/admin/inventory/inventory-receipts';
import { AdjustStockDialog, ReceiveStockDialog, TransferStockDialog } from '@workspace/admin/inventory/items/StockDialogs';
import { useInventoryActions } from '@workspace/admin/inventory/items/useInventoryActions';

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
  initialTab?: 'inventory' | 'stock';
};

export function InventoryItemDetail({
  item,
  categories,
  locations,
  organizations,
  receipts,
  actorProfileId,
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
      <TabsList className={cn('grid h-auto w-full grid-cols-2 gap-1 rounded-2xl')}>
        <TabsTrigger value="inventory" className="w-full rounded-xl px-3 text-xs font-semibold">
          Inventory
        </TabsTrigger>
        <TabsTrigger value="stock" className="w-full rounded-xl px-3 text-xs font-semibold">
          Stock & receipts
        </TabsTrigger>
      </TabsList>

      <TabsContent value="inventory">
        <InventoryDetailsCard
          item={item}
          actorProfileId={actorProfileId}
          categoryOptions={categoryOptions}
          onBack={() => router.push('/ops/inventory?view=items')}
        />
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
            <CardDescription>Core item fields used by stock tracking.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span>{item.active ? 'Active' : 'Inactive'}</span>
            <span>{item.onHandQuantity.toLocaleString()} on hand</span>
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
                  Back to Inventory
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
          <CardDescription>Receive, transfer, or adjust stock. Encounter distributions should be logged from the encounter flow.</CardDescription>
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
