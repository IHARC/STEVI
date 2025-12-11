'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@shared/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@shared/ui/form';
import { Input } from '@shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import { Checkbox } from '@shared/ui/checkbox';
import { Textarea } from '@shared/ui/textarea';
import type { InventoryItem, InventoryLocation } from '@/lib/inventory/types';

export type ItemDialogProps = {
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

export function ItemDialog({
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
                      <Input list="inventory-categories" id="item_category" required {...field} />
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
                    <Textarea id="item_description" rows={3} placeholder="Optional context for outreach staff" {...field} />
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
