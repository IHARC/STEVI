'use client';

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Button } from '@shared/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@shared/ui/form';
import { Input } from '@shared/ui/input';
import { Textarea } from '@shared/ui/textarea';
import { Checkbox } from '@shared/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import { useToast } from '@shared/ui/use-toast';
import type { InventoryLocation } from '@/lib/inventory/types';
import { useInventoryActions } from '@workspace/admin/inventory/items/useInventoryActions';

type FormValues = {
  actor_profile_id: string;
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
};

type Props = {
  actorProfileId: string;
  categories: string[];
  locations: InventoryLocation[];
};

export function InventoryItemCreate({ actorProfileId, categories, locations }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const { isPending, createItem } = useInventoryActions({ actorProfileId });

  const categoryOptions = useMemo(() => Array.from(new Set(categories)).sort((a, b) => a.localeCompare(b)), [categories]);

  const form = useForm<FormValues>({
    defaultValues: {
      actor_profile_id: actorProfileId,
      name: '',
      category: '',
      unit_type: '',
      supplier: '',
      minimum_threshold: '',
      cost_per_unit: '',
      description: '',
      initial_stock: '',
      initial_location_id: '',
      active: true,
    },
  });

  const submit = async (formData: FormData) => {
    const result = await createItem(formData);
    if (!result.success) {
      return;
    }
    const itemId = (result.data as { item?: { id?: unknown } } | undefined)?.item?.id;
    if (typeof itemId === 'string' && itemId.length > 0) {
      router.push(`/ops/inventory/items/${itemId}?view=items`);
      return;
    }
    toast({ title: 'Item created', description: 'Open the item list to continue.' });
    router.push('/ops/inventory?view=items');
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Item details</CardTitle>
        <CardDescription>Inventory items power outreach supplies and (optionally) donation catalogue listings.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form action={submit} className="space-y-6">
            <input type="hidden" {...form.register('actor_profile_id')} />

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

            <div className="rounded-2xl border border-border/15 bg-background p-4 shadow-sm">
              <p className="text-sm font-semibold text-foreground">Initial stock (optional)</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Record an initial receipt so on-hand counts are accurate before the first encounter.
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
            </div>

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

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.push('/ops/inventory?view=items')} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                Create item
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
