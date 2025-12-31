'use client';

import { useEffect, useState, useActionState } from 'react';

import { distributeInventoryAction, type DistributionFormState } from '@/lib/inventory/distributions';
import type { InventoryItem, InventoryLocation } from '@/lib/inventory/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Input } from '@shared/ui/input';
import { Button } from '@shared/ui/button';
import { Label } from '@shared/ui/label';
import { NativeSelect } from '@shared/ui/native-select';
import { Textarea } from '@shared/ui/textarea';
import { useToast } from '@shared/ui/use-toast';

const initialState: DistributionFormState = { status: 'idle' };

type EncounterSuppliesFormProps = {
  personId: number;
  encounterId: string;
  locations: InventoryLocation[];
  items: InventoryItem[];
  disabled?: boolean;
};

export function EncounterSuppliesForm({ personId, encounterId, locations, items, disabled }: EncounterSuppliesFormProps) {
  const { toast } = useToast();
  const [rows, setRows] = useState(1);
  const [state, formAction] = useActionState(distributeInventoryAction, initialState);

  useEffect(() => {
    if (state.status === 'success') {
      toast({ title: 'Supplies distributed', description: state.message ?? 'Inventory updated.' });
    }
    if (state.status === 'error') {
      toast({ title: 'Distribution failed', description: state.message ?? 'Check the form and try again.', variant: 'destructive' });
    }
  }, [state, toast]);

  const activeItems = items.filter((item) => item.active);
  const activeLocations = locations.filter((location) => location.active);
  const formDisabled = disabled || activeItems.length === 0 || activeLocations.length === 0;

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-lg">Distribute supplies</CardTitle>
        <CardDescription>Record inventory given during this encounter.</CardDescription>
      </CardHeader>
      <CardContent>
        {disabled ? (
          <p className="text-sm text-muted-foreground">Inventory access is required to log distributions.</p>
        ) : activeItems.length === 0 || activeLocations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Inventory items and active locations are required to log distributions.</p>
        ) : null}

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="person_id" value={personId} />
          <input type="hidden" name="encounter_id" value={encounterId} />

          <div className="space-y-1">
            <Label htmlFor="distribution_location">Location</Label>
            <NativeSelect id="distribution_location" name="location_id" defaultValue={activeLocations[0]?.id ?? ''}>
              {activeLocations.map((location) => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRows((count) => count + 1)}
              >
                Add item
              </Button>
            </div>

            {Array.from({ length: rows }).map((_, index) => (
              <div key={`item-row-${index}`} className="grid gap-2 md:grid-cols-[2fr,1fr,1fr]">
                <div className="space-y-1">
                  <Label className="sr-only" htmlFor={`item_${index}`}>Item</Label>
                  <NativeSelect id={`item_${index}`} name="item_id" defaultValue={activeItems[0]?.id ?? ''}>
                    {activeItems.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="space-y-1">
                  <Label className="sr-only" htmlFor={`qty_${index}`}>Quantity</Label>
                  <Input id={`qty_${index}`} name="qty" type="number" min={1} step={1} placeholder="Qty" />
                </div>
                <div className="space-y-1">
                  <Label className="sr-only" htmlFor={`unit_cost_${index}`}>Unit cost</Label>
                  <Input id={`unit_cost_${index}`} name="unit_cost" type="number" min={0} step={0.01} placeholder="Unit cost" />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <Label htmlFor="distribution_notes">Notes</Label>
            <Textarea id="distribution_notes" name="notes" rows={3} placeholder="Optional notes" />
          </div>

          <Button type="submit" size="sm" disabled={formDisabled}>
            Log distribution
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
