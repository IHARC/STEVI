'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/ui/table';
import { Textarea } from '@shared/ui/textarea';
import { useToast } from '@shared/ui/use-toast';
import { Checkbox } from '@shared/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import {
  adjustInventoryStockAction,
  bulkReceiveInventoryStockAction,
  createInventoryItemAction,
  deleteInventoryItemAction,
  receiveInventoryStockAction,
  toggleInventoryItemStatusAction,
  transferInventoryStockAction,
  updateInventoryItemAction,
} from '@/app/(workspace)/admin/inventory/actions';
import type {
  BulkReceiptInput,
  InventoryItem,
  InventoryLocation,
  InventoryOrganization,
} from '@/lib/inventory/types';

const DATE_PLACEHOLDER = new Date().toISOString().slice(0, 10);

type InventoryItemsSectionProps = {
  items: InventoryItem[];
  locations: InventoryLocation[];
  organizations: InventoryOrganization[];
  categories: string[];
  actorProfileId: string;
};

export function InventoryItemsSection({ items, locations, organizations, categories, actorProfileId }: InventoryItemsSectionProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);
  const [itemToReceive, setItemToReceive] = useState<InventoryItem | null>(null);
  const [itemToTransfer, setItemToTransfer] = useState<InventoryItem | null>(null);
  const [itemToAdjust, setItemToAdjust] = useState<InventoryItem | null>(null);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const categoryOptions = useMemo(() => Array.from(new Set(categories)).sort((a, b) => a.localeCompare(b)), [categories]);
  const activeOrganizations = useMemo(() => organizations.filter((org) => org.isActive), [organizations]);

  const handleResult = <T,>(result: { success: boolean; error?: string; data?: T }, message: string, close?: () => void) => {
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Inventory error', description: result.error ?? 'Action failed.' });
      return;
    }
    if (close) {
      close();
    }
    toast({ title: 'Inventory updated', description: message });
    startTransition(() => router.refresh());
  };

  const submitCreateItem = async (formData: FormData) => {
    formData.set('actor_profile_id', actorProfileId);
    const result = await createInventoryItemAction(formData);
    handleResult(result, 'Item created successfully.', () => setIsCreating(false));
  };

  const submitUpdateItem = async (formData: FormData) => {
    formData.set('actor_profile_id', actorProfileId);
    const result = await updateInventoryItemAction(formData);
    handleResult(result, 'Item updated.', () => setItemToEdit(null));
  };

  const submitReceiveStock = async (formData: FormData) => {
    formData.set('actor_profile_id', actorProfileId);
    const result = await receiveInventoryStockAction(formData);
    handleResult(result, 'Stock received.', () => setItemToReceive(null));
  };

  const submitTransferStock = async (formData: FormData) => {
    formData.set('actor_profile_id', actorProfileId);
    const result = await transferInventoryStockAction(formData);
    handleResult(result, 'Stock transferred.', () => setItemToTransfer(null));
  };

  const submitAdjustStock = async (formData: FormData) => {
    formData.set('actor_profile_id', actorProfileId);
    const result = await adjustInventoryStockAction(formData);
    handleResult(result, 'Adjustment applied.', () => setItemToAdjust(null));
  };

  const submitToggleItem = async (item: InventoryItem, nextActive: boolean) => {
    const formData = new FormData();
    formData.set('actor_profile_id', actorProfileId);
    formData.set('item_id', item.id);
    formData.set('active', String(nextActive));
    const result = await toggleInventoryItemStatusAction(formData);
    handleResult(result, nextActive ? 'Item activated.' : 'Item deactivated.');
  };

  const submitDeleteItem = async (item: InventoryItem) => {
    const formData = new FormData();
    formData.set('actor_profile_id', actorProfileId);
    formData.set('item_id', item.id);
    const result = await deleteInventoryItemAction(formData);
    handleResult(result, 'Item deleted.');
  };

  const submitBulkReceive = async (formData: FormData) => {
    formData.set('actor_profile_id', actorProfileId);
    const raw = formData.get('items_json');
    if (typeof raw !== 'string') {
      toast({ title: 'Bulk receipt error', variant: 'destructive', description: 'Bulk payload missing.' });
      return;
    }

    let payload: BulkReceiptInput;
    try {
      payload = JSON.parse(raw);
    } catch {
      toast({ title: 'Bulk receipt error', variant: 'destructive', description: 'Bulk payload invalid JSON.' });
      return;
    }

    const bundle = new FormData();
    bundle.set('actor_profile_id', actorProfileId);
    bundle.set('items', JSON.stringify(payload));
    const result = await bulkReceiveInventoryStockAction(bundle);
    handleResult(result, 'Bulk receipt queued.', () => setIsBulkOpen(false));
  };

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
              onSubmit={submitBulkReceive}
              actorProfileId={actorProfileId}
              items={items}
              locations={locations}
              organizations={activeOrganizations}
            />
          </Dialog>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button>Create item</Button>
            </DialogTrigger>
            <ItemDialog
              title="Create inventory item"
              actionLabel="Create item"
              defaultValues={null}
              categories={categoryOptions}
              locations={locations}
              isPending={isPending}
              onSubmit={submitCreateItem}
              actorProfileId={actorProfileId}
            />
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">On hand</TableHead>
              <TableHead className="text-right">Threshold</TableHead>
              <TableHead className="text-right">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} className={!item.active ? 'opacity-60' : undefined}>
                <TableCell className="font-medium">{item.name}</TableCell>
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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setItemToReceive(item)}
                  >
                    Receive
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setItemToTransfer(item)}>
                    Transfer
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setItemToAdjust(item)}>
                    Adjust
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setItemToEdit(item)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => submitToggleItem(item, !item.active)}
                    disabled={isPending}
                  >
                    {item.active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => submitDeleteItem(item)}
                    disabled={isPending}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Manage stock levels using receive, transfer, or adjust actions. Deactivating an item hides it from operational workflows without
        deleting historic transactions.
      </CardFooter>

      <ItemDialog
        title="Edit inventory item"
        actionLabel="Save changes"
        defaultValues={itemToEdit}
        categories={categoryOptions}
        locations={locations}
        isPending={isPending}
        onSubmit={submitUpdateItem}
        actorProfileId={actorProfileId}
        open={itemToEdit !== null}
        onOpenChange={(open) => !open && setItemToEdit(null)}
      />

      <ReceiveStockDialog
        item={itemToReceive}
        locations={locations}
        organizations={activeOrganizations}
        isPending={isPending}
        onClose={() => setItemToReceive(null)}
        onSubmit={submitReceiveStock}
        actorProfileId={actorProfileId}
      />

      <TransferStockDialog
        item={itemToTransfer}
        locations={locations}
        isPending={isPending}
        onClose={() => setItemToTransfer(null)}
        onSubmit={submitTransferStock}
        actorProfileId={actorProfileId}
      />

      <AdjustStockDialog
        item={itemToAdjust}
        locations={locations}
        isPending={isPending}
        onClose={() => setItemToAdjust(null)}
        onSubmit={submitAdjustStock}
        actorProfileId={actorProfileId}
      />
    </Card>
  );
}

type ItemDialogProps = {
  title: string;
  actionLabel: string;
  defaultValues: InventoryItem | null;
  categories: string[];
  locations: InventoryLocation[];
  onSubmit: (formData: FormData) => Promise<void>;
  actorProfileId: string;
  isPending: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function ItemDialog({
  title,
  actionLabel,
  defaultValues,
  categories,
  locations,
  onSubmit,
  actorProfileId,
  isPending,
  open,
  onOpenChange,
}: ItemDialogProps) {
  const form = useForm<{
    actor_profile_id: string;
    item_id?: string;
    name: string;
    category: string;
    unit_type: string;
    supplier: string;
    minimum_threshold: string;
    cost_per_unit: string;
    description: string;
    initial_stock: string;
    initial_location_id: string;
    active: boolean;
  }>({
    defaultValues: {
      actor_profile_id: actorProfileId,
      item_id: defaultValues?.id,
      name: defaultValues?.name ?? '',
      category: defaultValues?.category ?? '',
      unit_type: defaultValues?.unitType ?? '',
      supplier: defaultValues?.supplier ?? '',
      minimum_threshold: defaultValues?.minimumThreshold?.toString() ?? '',
      cost_per_unit: defaultValues?.costPerUnit?.toString() ?? '',
      description: defaultValues?.description ?? '',
      initial_stock: '',
      initial_location_id: '',
      active: defaultValues?.active ?? true,
    },
  });

  useEffect(() => {
    form.reset({
      actor_profile_id: actorProfileId,
      item_id: defaultValues?.id,
      name: defaultValues?.name ?? '',
      category: defaultValues?.category ?? '',
      unit_type: defaultValues?.unitType ?? '',
      supplier: defaultValues?.supplier ?? '',
      minimum_threshold: defaultValues?.minimumThreshold?.toString() ?? '',
      cost_per_unit: defaultValues?.costPerUnit?.toString() ?? '',
      description: defaultValues?.description ?? '',
      initial_stock: '',
      initial_location_id: '',
      active: defaultValues?.active ?? true,
    });
  }, [actorProfileId, defaultValues, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Provide descriptive names and categories so outreach staff can find items quickly across locations.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form action={onSubmit} className="space-y-4">
            <input type="hidden" {...form.register('actor_profile_id')} />
            {defaultValues ? <input type="hidden" {...form.register('item_id')} /> : null}

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
                      <input
                        list="inventory-categories"
                        id="item_category"
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none"
                        required
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    <datalist id="inventory-categories">
                      {categories.map((category) => (
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
                      <Input id="unit_type" required {...field} />
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
                      <Input id="supplier" {...field} />
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
                    <FormLabel htmlFor="cost_per_unit">Unit cost</FormLabel>
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
                    <Textarea
                      id="item_description"
                      rows={3}
                      placeholder="Optional context for outreach staff"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!defaultValues ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="initial_stock"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="initial_stock">Initial stock</FormLabel>
                      <FormControl>
                        <Input id="initial_stock" type="number" min={0} placeholder="0" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="initial_location_id"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="initial_location_id">Initial location</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange} name="initial_location_id">
                          <SelectTrigger id="initial_location_id">
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            {locations.map((location) => (
                              <SelectItem key={location.id} value={location.id}>
                                {location.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <p className="text-xs text-muted-foreground">Required if you record initial stock above zero.</p>
                    </FormItem>
                  )}
                />
              </div>
            ) : null}

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
                    Item is active in operations
                  </FormLabel>
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="submit" disabled={isPending}>
                {actionLabel}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

type ReceiveStockDialogProps = {
  item: InventoryItem | null;
  locations: InventoryLocation[];
  organizations: InventoryOrganization[];
  onSubmit: (formData: FormData) => Promise<void>;
  onClose: () => void;
  actorProfileId: string;
  isPending: boolean;
};

function ReceiveStockDialog({ item, locations, organizations, onSubmit, onClose, actorProfileId, isPending }: ReceiveStockDialogProps) {
  const form = useForm<{
    actor_profile_id: string;
    item_id: string;
    quantity: string;
    unit_cost: string;
    location_id: string;
    source_type: string;
    provider_org_id: string;
    lot_number: string;
    expiry_date: string;
    notes: string;
  }>({
    defaultValues: {
      actor_profile_id: actorProfileId,
      item_id: item?.id ?? '',
      quantity: '',
      unit_cost: '',
      location_id: '',
      source_type: '',
      provider_org_id: '',
      lot_number: '',
      expiry_date: DATE_PLACEHOLDER,
      notes: '',
    },
  });

  useEffect(() => {
    form.reset({
      actor_profile_id: actorProfileId,
      item_id: item?.id ?? '',
      quantity: '',
      unit_cost: '',
      location_id: '',
      source_type: '',
      provider_org_id: '',
      lot_number: '',
      expiry_date: DATE_PLACEHOLDER,
      notes: '',
    });
  }, [actorProfileId, form, item]);

  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Receive stock</DialogTitle>
          <DialogDescription>
            Record incoming donations or purchases. Quantities increase stock at the selected location.
          </DialogDescription>
        </DialogHeader>
        {item ? (
          <Form {...form}>
            <form action={onSubmit} className="space-y-4">
              <input type="hidden" {...form.register('actor_profile_id')} />
              <input type="hidden" {...form.register('item_id')} />

              <div className="space-y-1">
                <FormLabel>Item</FormLabel>
                <p className="text-sm font-medium text-foreground">{item.name}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="quantity"
                  rules={{ required: 'Quantity is required' }}
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="quantity">Quantity</FormLabel>
                      <FormControl>
                        <Input id="quantity" type="number" min={0} required placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unit_cost"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="unit_cost">Unit cost</FormLabel>
                      <FormControl>
                        <Input id="unit_cost" type="number" min={0} step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="location_id"
                rules={{ required: 'Choose a location' }}
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel htmlFor="receive_location">Location</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange} name="location_id" required>
                        <SelectTrigger id="receive_location">
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map((location) => (
                            <SelectItem key={location.id} value={location.id}>
                              {location.name}
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
                name="source_type"
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel htmlFor="receive_source">Source type</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange} name="source_type">
                        <SelectTrigger id="receive_source">
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          <SelectItem value="donation">Donation</SelectItem>
                          <SelectItem value="purchase">Purchase</SelectItem>
                          <SelectItem value="transfer_in">Transfer in</SelectItem>
                          <SelectItem value="adjustment">Adjustment</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="provider_org_id"
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel htmlFor="provider_org">Provider organization</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange} name="provider_org_id">
                        <SelectTrigger id="provider_org">
                          <SelectValue placeholder="None" />
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
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="lot_number"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="lot_number">Lot number</FormLabel>
                      <FormControl>
                        <Input id="lot_number" placeholder="Optional" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expiry_date"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="expiry_date">Expiry date</FormLabel>
                      <FormControl>
                        <Input id="expiry_date" type="date" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel htmlFor="receive_notes">Notes</FormLabel>
                    <FormControl>
                      <Textarea id="receive_notes" rows={3} placeholder="Optional context" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4">
                <Button type="submit" disabled={isPending}>
                  Record receipt
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

type TransferStockDialogProps = {
  item: InventoryItem | null;
  locations: InventoryLocation[];
  onSubmit: (formData: FormData) => Promise<void>;
  onClose: () => void;
  actorProfileId: string;
  isPending: boolean;
};

function TransferStockDialog({ item, locations, onSubmit, onClose, actorProfileId, isPending }: TransferStockDialogProps) {
  const form = useForm<{
    actor_profile_id: string;
    item_id: string;
    quantity: string;
    from_location_id: string;
    to_location_id: string;
    notes: string;
  }>({
    defaultValues: {
      actor_profile_id: actorProfileId,
      item_id: item?.id ?? '',
      quantity: '',
      from_location_id: '',
      to_location_id: '',
      notes: '',
    },
  });

  useEffect(() => {
    form.reset({
      actor_profile_id: actorProfileId,
      item_id: item?.id ?? '',
      quantity: '',
      from_location_id: '',
      to_location_id: '',
      notes: '',
    });
  }, [actorProfileId, form, item]);

  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Transfer stock</DialogTitle>
          <DialogDescription>Move stock from one location to another.</DialogDescription>
        </DialogHeader>
        {item ? (
          <Form {...form}>
            <form action={onSubmit} className="space-y-4">
              <input type="hidden" {...form.register('actor_profile_id')} />
              <input type="hidden" {...form.register('item_id')} />
              <div className="space-y-1">
                <FormLabel>Item</FormLabel>
                <p className="text-sm font-medium text-foreground">{item.name}</p>
              </div>
              <FormField
                control={form.control}
                name="quantity"
                rules={{ required: 'Quantity is required' }}
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel htmlFor="quantity_transfer">Quantity</FormLabel>
                    <FormControl>
                      <Input id="quantity_transfer" type="number" min={0} required placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="from_location_id"
                  rules={{ required: 'Select a source location' }}
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="from_location_id">From</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange} name="from_location_id" required>
                          <SelectTrigger id="from_location_id">
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                          <SelectContent>
                            {locations.map((location) => (
                              <SelectItem key={location.id} value={location.id}>
                                {location.name}
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
                  name="to_location_id"
                  rules={{ required: 'Select a destination' }}
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="to_location_id">To</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange} name="to_location_id" required>
                          <SelectTrigger id="to_location_id">
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                          <SelectContent>
                            {locations.map((location) => (
                              <SelectItem key={location.id} value={location.id}>
                                {location.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel htmlFor="transfer_notes">Notes</FormLabel>
                    <FormControl>
                      <Input id="transfer_notes" placeholder="Optional" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <Button type="submit" disabled={isPending}>
                  Transfer
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

type AdjustStockDialogProps = {
  item: InventoryItem | null;
  locations: InventoryLocation[];
  onSubmit: (formData: FormData) => Promise<void>;
  onClose: () => void;
  actorProfileId: string;
  isPending: boolean;
};

function AdjustStockDialog({ item, locations, onSubmit, onClose, actorProfileId, isPending }: AdjustStockDialogProps) {
  const form = useForm<{
    actor_profile_id: string;
    item_id: string;
    location_id: string;
    quantity_delta: string;
    reason: string;
    notes: string;
  }>({
    defaultValues: {
      actor_profile_id: actorProfileId,
      item_id: item?.id ?? '',
      location_id: '',
      quantity_delta: '',
      reason: '',
      notes: '',
    },
  });

  useEffect(() => {
    form.reset({
      actor_profile_id: actorProfileId,
      item_id: item?.id ?? '',
      location_id: '',
      quantity_delta: '',
      reason: '',
      notes: '',
    });
  }, [actorProfileId, form, item]);

  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>Apply corrections for damaged or counted stock.</DialogDescription>
        </DialogHeader>
        {item ? (
          <Form {...form}>
            <form action={onSubmit} className="space-y-4">
              <input type="hidden" {...form.register('actor_profile_id')} />
              <input type="hidden" {...form.register('item_id')} />
              <div className="space-y-1">
                <FormLabel>Item</FormLabel>
                <p className="text-sm font-medium text-foreground">{item.name}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="location_id"
                  rules={{ required: 'Select a location' }}
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="adjust_location">Location</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange} name="location_id" required>
                          <SelectTrigger id="adjust_location">
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                          <SelectContent>
                            {locations.map((location) => (
                              <SelectItem key={location.id} value={location.id}>
                                {location.name}
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
                  name="quantity_delta"
                  rules={{ required: 'Enter an adjustment amount' }}
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="quantity_delta">Quantity adjustment</FormLabel>
                      <FormControl>
                        <Input
                          id="quantity_delta"
                          type="number"
                          placeholder="Use negative numbers for reductions"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="reason"
                rules={{ required: 'Add a reason' }}
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel htmlFor="reason">Reason</FormLabel>
                    <FormControl>
                      <Input id="reason" placeholder="e.g., Damaged during transit" {...field} />
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
                    <FormLabel htmlFor="adjust_notes">Notes</FormLabel>
                    <FormControl>
                      <Input id="adjust_notes" placeholder="Optional" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <Button type="submit" disabled={isPending}>
                  Apply adjustment
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

type BulkReceiveDialogProps = {
  isPending: boolean;
  onSubmit: (formData: FormData) => Promise<void>;
  actorProfileId: string;
  items: InventoryItem[];
  locations: InventoryLocation[];
  organizations: InventoryOrganization[];
};

function BulkReceiveDialog({ isPending, onSubmit, actorProfileId, items, locations, organizations }: BulkReceiveDialogProps) {
  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Bulk receive stock</DialogTitle>
        <DialogDescription>
          Upload multiple receipts at once by pasting JSON payloads. Generated templates appear below to help format data quickly.
        </DialogDescription>
      </DialogHeader>
      <form
        action={onSubmit}
        className="space-y-4"
      >
        <input type="hidden" name="actor_profile_id" value={actorProfileId} />
        <div className="grid gap-2">
          <FormLabel htmlFor="bulk_items_json">Receipts JSON</FormLabel>
          <Textarea
            id="bulk_items_json"
            name="items_json"
            rows={8}
            className="font-mono text-xs"
            placeholder='{"items":[{"itemId":"...","quantity":10,"locationId":"..."}]}'
            required
          />
          <p className="text-xs text-muted-foreground">
            Include <code>itemId</code>, <code>quantity</code>, optional <code>locationId</code>, <code>unitCost</code>, and <code>notes</code> for each entry.
          </p>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={isPending}>
            Process receipts
          </Button>
        </DialogFooter>
      </form>
      <TemplatePreview items={items} locations={locations} organizations={organizations} />
    </DialogContent>
  );
}

type TemplatePreviewProps = {
  items: InventoryItem[];
  locations: InventoryLocation[];
  organizations: InventoryOrganization[];
};

function TemplatePreview({ items, locations, organizations }: TemplatePreviewProps) {
  const sample = useMemo(() => {
    const item = items[0];
    const location = locations[0];
    const organization = organizations[0];
    const template: BulkReceiptInput = {
      items: [
        {
          itemId: item?.id ?? 'ITEM_ID',
          quantity: 10,
          locationId: location?.id ?? 'LOCATION_ID',
          unitCost: 2.5,
          notes: 'Donation from community partner',
        },
      ],
      sourceType: 'donation',
      providerOrganizationId: organization?.id ?? undefined,
      defaultLocationId: location?.id ?? undefined,
      globalNotes: 'Monthly restock',
    };
    return JSON.stringify(template, null, 2);
  }, [items, locations, organizations]);

  return (
    <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-4 text-xs text-muted-foreground">
      <p className="mb-2 font-medium text-foreground">Template example</p>
      <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">{sample}</pre>
    </div>
  );
}
