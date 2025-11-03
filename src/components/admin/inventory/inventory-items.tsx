'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
  adjustInventoryStockAction,
  bulkReceiveInventoryStockAction,
  createInventoryItemAction,
  deleteInventoryItemAction,
  receiveInventoryStockAction,
  toggleInventoryItemStatusAction,
  transferInventoryStockAction,
  updateInventoryItemAction,
} from '@/app/(portal)/admin/inventory/actions';
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
        <CardTitle className="text-lg font-semibold">Inventory items</CardTitle>
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
              organizations={organizations}
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
                  <span className={item.active ? 'text-green-600' : 'text-muted-foreground'}>
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
        organizations={organizations}
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Provide descriptive names and categories so outreach staff can find items quickly across locations.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <input type="hidden" name="actor_profile_id" value={actorProfileId} />
          {defaultValues ? <input type="hidden" name="item_id" value={defaultValues.id} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" name="name" defaultValue={defaultValues?.name} required />
            <div className="grid gap-2">
              <Label htmlFor="item_category">Category</Label>
              <input list="inventory-categories" name="category" id="item_category" defaultValue={defaultValues?.category ?? ''} required className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none" />
              <datalist id="inventory-categories">
                {categories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </div>
            <Field label="Unit type" name="unit_type" defaultValue={defaultValues?.unitType} required />
            <Field label="Supplier" name="supplier" defaultValue={defaultValues?.supplier ?? ''} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Minimum threshold"
              name="minimum_threshold"
              type="number"
              min={0}
              defaultValue={defaultValues?.minimumThreshold ?? ''}
              placeholder="Optional"
            />
            <Field
              label="Unit cost"
              name="cost_per_unit"
              type="number"
              min={0}
              step="0.01"
              defaultValue={defaultValues?.costPerUnit ?? ''}
              placeholder="Optional"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="item_description">Description</Label>
            <Textarea
              id="item_description"
              name="description"
              rows={3}
              defaultValue={defaultValues?.description ?? ''}
              placeholder="Optional context for outreach staff"
            />
          </div>

          {!defaultValues ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Initial stock"
                name="initial_stock"
                type="number"
                min={0}
                placeholder="0"
              />
              <div className="grid gap-2">
                <Label htmlFor="initial_location_id">Initial location</Label>
                <select
                  id="initial_location_id"
                  name="initial_location_id"
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none"
                >
                  <option value="">Select location</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">Required if you record initial stock above zero.</p>
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <input
              id="item_active"
              name="active"
              type="checkbox"
              defaultChecked={defaultValues?.active ?? true}
              className="h-4 w-4"
            />
            <Label htmlFor="item_active" className="text-sm text-muted-foreground">
              Item is active in operations
            </Label>
          </div>

          <DialogFooter className="pt-4">
            <Button type="submit" disabled={isPending}>
              {actionLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type FieldProps = {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  placeholder?: string;
  type?: string;
  required?: boolean;
  min?: number;
  step?: string;
};

function Field({ label, name, defaultValue, placeholder, type = 'text', required, min, step }: FieldProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        required={required}
        min={min}
        step={step}
      />
    </div>
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
          <form action={onSubmit} className="space-y-4">
            <input type="hidden" name="actor_profile_id" value={actorProfileId} />
            <input type="hidden" name="item_id" value={item.id} />
            <div className="space-y-1">
              <Label>Item</Label>
              <p className="text-sm font-medium text-on-surface">{item.name}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Quantity" name="quantity" type="number" min={0} required placeholder="0" />
              <Field label="Unit cost" name="unit_cost" type="number" min={0} step="0.01" placeholder="0.00" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="receive_location">Location</Label>
              <select
                id="receive_location"
                name="location_id"
                required
                className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none"
              >
                <option value="">Select location</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="receive_source">Source type</Label>
              <select
                id="receive_source"
                name="source_type"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none"
              >
                <option value="">Select source</option>
                <option value="donation">Donation</option>
                <option value="purchase">Purchase</option>
                <option value="transfer_in">Transfer in</option>
                <option value="adjustment">Adjustment</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="provider_org">Provider organisation</Label>
              <select
                id="provider_org"
                name="provider_org_id"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none"
              >
                <option value="">None</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Lot number" name="lot_number" placeholder="Optional" />
              <Field label="Expiry date" name="expiry_date" type="date" defaultValue={DATE_PLACEHOLDER} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="receive_notes">Notes</Label>
              <Textarea id="receive_notes" name="notes" rows={3} placeholder="Optional context" />
            </div>
            <DialogFooter className="pt-4">
              <Button type="submit" disabled={isPending}>
                Record receipt
              </Button>
            </DialogFooter>
          </form>
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
  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Transfer stock</DialogTitle>
          <DialogDescription>Move stock from one location to another.</DialogDescription>
        </DialogHeader>
        {item ? (
          <form action={onSubmit} className="space-y-4">
            <input type="hidden" name="actor_profile_id" value={actorProfileId} />
            <input type="hidden" name="item_id" value={item.id} />
            <div className="space-y-1">
              <Label>Item</Label>
              <p className="text-sm font-medium text-on-surface">{item.name}</p>
            </div>
            <Field label="Quantity" name="quantity" type="number" min={0} required placeholder="0" />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="From" name="from_location_id" locations={locations} required />
              <SelectField label="To" name="to_location_id" locations={locations} required />
            </div>
            <Field label="Notes" name="notes" placeholder="Optional" />
            <DialogFooter className="pt-4">
              <Button type="submit" disabled={isPending}>
                Transfer
              </Button>
            </DialogFooter>
          </form>
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
  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>Apply corrections for damaged or counted stock.</DialogDescription>
        </DialogHeader>
        {item ? (
          <form action={onSubmit} className="space-y-4">
            <input type="hidden" name="actor_profile_id" value={actorProfileId} />
            <input type="hidden" name="item_id" value={item.id} />
            <div className="space-y-1">
              <Label>Item</Label>
              <p className="text-sm font-medium text-on-surface">{item.name}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="Location" name="location_id" locations={locations} required />
              <Field
                label="Quantity adjustment"
                name="quantity_delta"
                type="number"
                placeholder="Use negative numbers for reductions"
                required
              />
            </div>
            <Field label="Reason" name="reason" placeholder="e.g., Damaged during transit" required />
            <Field label="Notes" name="notes" placeholder="Optional" />
            <DialogFooter className="pt-4">
              <Button type="submit" disabled={isPending}>
                Apply adjustment
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

type SelectFieldProps = {
  label: string;
  name: string;
  locations: InventoryLocation[];
  required?: boolean;
};

function SelectField({ label, name, locations, required }: SelectFieldProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        required={required}
        className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none"
      >
        <option value="">Select location</option>
        {locations.map((location) => (
          <option key={location.id} value={location.id}>
            {location.name}
          </option>
        ))}
      </select>
    </div>
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
          <Label htmlFor="bulk_items_json">Receipts JSON</Label>
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
      <p className="mb-2 font-medium text-on-surface">Template example</p>
      <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">{sample}</pre>
    </div>
  );
}
