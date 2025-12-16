'use client';

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@shared/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@shared/ui/form';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import { Textarea } from '@shared/ui/textarea';
import type { BulkReceiptInput, InventoryItem, InventoryLocation, InventoryOrganization } from '@/lib/inventory/types';

const DATE_PLACEHOLDER = new Date().toISOString().slice(0, 10);

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

export function ReceiveStockDialog({ item, locations, organizations, onSubmit, onClose, actorProfileId, isPending }: ReceiveStockDialogProps) {
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
          <DialogDescription>Record incoming donations or purchases. Quantities increase stock at the selected location.</DialogDescription>
        </DialogHeader>
        {item ? (
          <Form {...form}>
	            <form action={onSubmit} className="space-y-4">
	              <input type="hidden" {...form.register('actor_profile_id')} />
	              <input type="hidden" {...form.register('item_id')} />

	              <div className="space-y-1">
	                <Label>Item</Label>
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

export function TransferStockDialog({ item, locations, onSubmit, onClose, actorProfileId, isPending }: TransferStockDialogProps) {
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
	                <Label>Item</Label>
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

export function AdjustStockDialog({ item, locations, onSubmit, onClose, actorProfileId, isPending }: AdjustStockDialogProps) {
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
	                <Label>Item</Label>
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
