'use client';

import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { useForm, type Control, type FieldPath, type UseFormReturn } from 'react-hook-form';
import { Button } from '@shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@shared/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@shared/ui/form';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import { Textarea } from '@shared/ui/textarea';
import type { BulkReceiptInput, InventoryItem, InventoryLocation, InventoryOrganization } from '@/lib/inventory/types';

const DATE_PLACEHOLDER = new Date().toISOString().slice(0, 10);

type StockDialogBaseFields = {
  actor_profile_id: string;
  item_id: string;
  notes: string;
};

type StockDialogFormValues = StockDialogBaseFields & Record<string, string>;
type StockDialogFieldName = FieldPath<StockDialogFormValues>;

type BaseDialogProps = {
  item: InventoryItem | null;
  onSubmit: (formData: FormData) => Promise<void>;
  onClose: () => void;
  actorProfileId: string;
  isPending: boolean;
};

type ReceiveStockDialogProps = BaseDialogProps & {
  locations: InventoryLocation[];
  organizations: InventoryOrganization[];
};

type TransferStockDialogProps = BaseDialogProps & {
  locations: InventoryLocation[];
};

type AdjustStockDialogProps = BaseDialogProps & {
  locations: InventoryLocation[];
};

type BulkReceiveDialogProps = {
  isPending: boolean;
  onSubmit: (formData: FormData) => Promise<void>;
  actorProfileId: string;
  items: InventoryItem[];
  locations: InventoryLocation[];
  organizations: InventoryOrganization[];
};

type StockDialogShellProps = {
  item: InventoryItem | null;
  onSubmit: (formData: FormData) => Promise<void>;
  onClose: () => void;
  title: string;
  description: string;
  submitLabel: string;
  isPending: boolean;
  form: UseFormReturn<StockDialogFormValues>;
  children: ReactNode;
};

function useStockDialogForm(
  actorProfileId: string,
  item: InventoryItem | null,
  buildDefaults: (base: StockDialogBaseFields) => StockDialogFormValues,
) {
  const baseDefaults = useCallback(
    () =>
      buildDefaults({
        actor_profile_id: actorProfileId,
        item_id: item?.id ?? '',
        notes: '',
      }),
    [actorProfileId, item, buildDefaults],
  );

  const form = useForm<StockDialogFormValues>({
    defaultValues: baseDefaults(),
  });

  useEffect(() => {
    form.reset(baseDefaults());
  }, [baseDefaults, form]);

  return form;
}

function StockDialogShell({
  item,
  onSubmit,
  onClose,
  title,
  description,
  submitLabel,
  isPending,
  form,
  children,
}: StockDialogShellProps) {
  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {item ? (
          <Form {...form}>
            <form action={onSubmit} className="space-y-4">
              <input type="hidden" {...form.register('actor_profile_id')} />
              <input type="hidden" {...form.register('item_id')} />

              <ItemSummary item={item} />

              {children}

              <DialogFooter className="pt-4">
                <Button type="submit" disabled={isPending}>
                  {submitLabel}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ItemSummary({ item }: { item: InventoryItem }) {
  return (
    <div className="space-y-1">
      <Label>Item</Label>
      <p className="text-sm font-medium text-foreground">{item.name}</p>
    </div>
  );
}

type LocationSelectFieldProps = {
  control: Control<StockDialogFormValues>;
  name: StockDialogFieldName;
  label: string;
  locations: InventoryLocation[];
  id: string;
  placeholder?: string;
  required?: boolean;
};

function LocationSelectField({
  control,
  name,
  label,
  locations,
  id,
  placeholder = 'Select location',
  required,
}: LocationSelectFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      rules={required ? { required: 'Select a location' } : undefined}
      render={({ field }) => (
        <FormItem className="grid gap-2">
          <FormLabel htmlFor={id}>{label}</FormLabel>
          <FormControl>
            <Select value={field.value} onValueChange={field.onChange} name={String(name)} required={required}>
              <SelectTrigger id={id}>
                <SelectValue placeholder={placeholder} />
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
  );
}

type NumberFieldProps = {
  control: Control<StockDialogFormValues>;
  name: StockDialogFieldName;
  label: string;
  id: string;
  placeholder?: string;
  min?: number;
  step?: number;
  required?: boolean;
  helperText?: string;
};

function NumberField({
  control,
  name,
  label,
  id,
  placeholder,
  min,
  step,
  required,
  helperText,
}: NumberFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      rules={required ? { required: `${label} is required` } : undefined}
      render={({ field }) => (
        <FormItem className="grid gap-2">
          <FormLabel htmlFor={id}>{label}</FormLabel>
          <FormControl>
            <Input id={id} type="number" min={min} step={step} required={required} placeholder={placeholder} {...field} />
          </FormControl>
          {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

type NotesFieldProps = {
  control: Control<StockDialogFormValues>;
  name: StockDialogFieldName;
  label: string;
  id: string;
  placeholder?: string;
  rows?: number;
  multiline?: boolean;
};

function NotesField({
  control,
  name,
  label,
  id,
  placeholder,
  rows = 3,
  multiline = false,
}: NotesFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="grid gap-2">
          <FormLabel htmlFor={id}>{label}</FormLabel>
          <FormControl>
            {multiline ? (
              <Textarea id={id} rows={rows} placeholder={placeholder} {...field} />
            ) : (
              <Input id={id} placeholder={placeholder} {...field} />
            )}
          </FormControl>
        </FormItem>
      )}
    />
  );
}

function ReceiveCostFields({ control }: { control: Control<StockDialogFormValues> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <NumberField
        control={control}
        name="quantity"
        label="Quantity"
        id="quantity"
        placeholder="0"
        min={0}
        required
      />
      <NumberField
        control={control}
        name="unit_cost"
        label="Unit cost"
        id="unit_cost"
        placeholder="0.00"
        min={0}
        step={0.01}
      />
    </div>
  );
}

export function ReceiveStockDialog({ item, locations, organizations, onSubmit, onClose, actorProfileId, isPending }: ReceiveStockDialogProps) {
  const form = useStockDialogForm(actorProfileId, item, (base) => ({
    ...base,
    quantity: '',
    unit_cost: '',
    location_id: '',
    source_type: '',
    provider_org_id: '',
    lot_number: '',
    expiry_date: DATE_PLACEHOLDER,
  }));

  return (
    <StockDialogShell
      item={item}
      onSubmit={onSubmit}
      onClose={onClose}
      title="Receive stock"
      description="Record incoming donations or purchases. Quantities increase stock at the selected location."
      submitLabel="Record receipt"
      isPending={isPending}
      form={form}
    >
      <ReceiveCostFields control={form.control} />

      <LocationSelectField
        control={form.control}
        name="location_id"
        label="Location"
        id="receive_location"
        locations={locations}
        required
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

      <NotesField
        control={form.control}
        name="notes"
        label="Notes"
        id="receive_notes"
        placeholder="Optional context"
        multiline
      />
    </StockDialogShell>
  );
}

export function TransferStockDialog({ item, locations, onSubmit, onClose, actorProfileId, isPending }: TransferStockDialogProps) {
  const form = useStockDialogForm(actorProfileId, item, (base) => ({
    ...base,
    quantity: '',
    from_location_id: '',
    to_location_id: '',
  }));

  return (
    <StockDialogShell
      item={item}
      onSubmit={onSubmit}
      onClose={onClose}
      title="Transfer stock"
      description="Move stock from one location to another."
      submitLabel="Transfer"
      isPending={isPending}
      form={form}
    >
      <NumberField
        control={form.control}
        name="quantity"
        label="Quantity"
        id="quantity_transfer"
        placeholder="0"
        min={0}
        required
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <LocationSelectField
          control={form.control}
          name="from_location_id"
          label="From"
          id="from_location_id"
          locations={locations}
          required
        />
        <LocationSelectField
          control={form.control}
          name="to_location_id"
          label="To"
          id="to_location_id"
          locations={locations}
          required
        />
      </div>

      <NotesField
        control={form.control}
        name="notes"
        label="Notes"
        id="transfer_notes"
        placeholder="Optional"
      />
    </StockDialogShell>
  );
}

export function AdjustStockDialog({ item, locations, onSubmit, onClose, actorProfileId, isPending }: AdjustStockDialogProps) {
  const form = useStockDialogForm(actorProfileId, item, (base) => ({
    ...base,
    location_id: '',
    quantity_delta: '',
    reason: '',
  }));

  return (
    <StockDialogShell
      item={item}
      onSubmit={onSubmit}
      onClose={onClose}
      title="Adjust stock"
      description="Apply corrections for damaged or counted stock."
      submitLabel="Apply adjustment"
      isPending={isPending}
      form={form}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <LocationSelectField
          control={form.control}
          name="location_id"
          label="Location"
          id="adjust_location"
          locations={locations}
          required
        />
        <NumberField
          control={form.control}
          name="quantity_delta"
          label="Quantity adjustment"
          id="quantity_delta"
          placeholder="Use negative numbers for reductions"
          required
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

      <NotesField
        control={form.control}
        name="notes"
        label="Notes"
        id="adjust_notes"
        placeholder="Optional"
      />
    </StockDialogShell>
  );
}

export function BulkReceiveDialog({ isPending, onSubmit, actorProfileId, items, locations, organizations }: BulkReceiveDialogProps) {
  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Bulk receive stock</DialogTitle>
        <DialogDescription>
          Upload multiple receipts at once by pasting JSON payloads. Generated templates appear below to help format data quickly.
        </DialogDescription>
      </DialogHeader>
      <form action={onSubmit} className="space-y-4">
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
