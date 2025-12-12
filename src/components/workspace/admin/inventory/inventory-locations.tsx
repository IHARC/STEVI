'use client';

import { useEffect, useState, useTransition } from 'react';
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
import { useToast } from '@shared/ui/use-toast';
import { Checkbox } from '@shared/ui/checkbox';
import {
  createInventoryLocationAction,
  deleteInventoryLocationAction,
  toggleInventoryLocationAction,
  updateInventoryLocationAction,
} from '@/app/(ops)/ops/admin/inventory/actions';
import type { InventoryLocation } from '@/lib/inventory/types';

type InventoryLocationsSectionProps = {
  locations: InventoryLocation[];
  actorProfileId: string;
  canManageLocations: boolean;
};

export function InventoryLocationsSection({ locations, actorProfileId, canManageLocations }: InventoryLocationsSectionProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryLocation | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleResult = (result: { success: boolean; error?: string }, message: string, onClose?: () => void) => {
    if (!result.success) {
      toast({ title: 'Location error', variant: 'destructive', description: result.error ?? 'Action failed.' });
      return;
    }
    if (onClose) {
      onClose();
    }
    toast({ title: 'Location updated', description: message });
    startTransition(() => router.refresh());
  };

  const submitCreate = async (formData: FormData) => {
    formData.set('actor_profile_id', actorProfileId);
    const result = await createInventoryLocationAction(formData);
    handleResult(result, 'Location created.', () => setOpen(false));
  };

  const submitUpdate = async (formData: FormData) => {
    formData.set('actor_profile_id', actorProfileId);
    const result = await updateInventoryLocationAction(formData);
    handleResult(result, 'Location updated.', () => setEditing(null));
  };

  const submitToggle = async (location: InventoryLocation, nextActive: boolean) => {
    const formData = new FormData();
    formData.set('actor_profile_id', actorProfileId);
    formData.set('location_id', location.id);
    formData.set('active', String(nextActive));
    const result = await toggleInventoryLocationAction(formData);
    handleResult(result, nextActive ? 'Location activated.' : 'Location deactivated.');
  };

  const submitDelete = async (location: InventoryLocation) => {
    const formData = new FormData();
    formData.set('actor_profile_id', actorProfileId);
    formData.set('location_id', location.id);
    const result = await deleteInventoryLocationAction(formData);
    handleResult(result, 'Location deleted.');
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base font-semibold">Locations</CardTitle>
          <p className="text-sm text-muted-foreground">Warehouses, outreach lockers, and mobile units that hold inventory.</p>
          {!canManageLocations ? (
            <p className="text-xs text-amber-600">
              Viewing only: only IHARC admins can add or edit locations.
            </p>
          ) : null}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={!canManageLocations}>Create location</Button>
          </DialogTrigger>
          <LocationDialogContent
            title="Create location"
            actionLabel="Create location"
            actorProfileId={actorProfileId}
            onSubmit={submitCreate}
            isPending={isPending}
            canManageLocations={canManageLocations}
          />
        </Dialog>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.map((location) => (
              <TableRow key={location.id} className={!location.active ? 'opacity-60' : undefined}>
                <TableCell className="font-medium">{location.name}</TableCell>
                <TableCell>{location.code ?? '—'}</TableCell>
                <TableCell>{location.type ?? '—'}</TableCell>
                <TableCell>
                  <span className={location.active ? 'text-primary' : 'text-muted-foreground'}>
                    {location.active ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell className="space-x-2 text-right">
                  <Button size="sm" variant="outline" onClick={() => setEditing(location)} disabled={!canManageLocations}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => submitToggle(location, !location.active)}
                    disabled={isPending || !canManageLocations}
                  >
                    {location.active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => submitDelete(location)}
                    disabled={isPending || !canManageLocations}
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
        Deleting a location is only allowed when no stock remains and no transactions reference it. Otherwise deactivate to hide it from workflows.
      </CardFooter>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <LocationDialogContent
          title="Edit location"
          actionLabel="Save changes"
          actorProfileId={actorProfileId}
          onSubmit={submitUpdate}
          isPending={isPending}
          defaultValues={editing}
          canManageLocations={canManageLocations}
        />
      </Dialog>
    </Card>
  );
}

type LocationDialogProps = {
  title: string;
  actionLabel: string;
  actorProfileId: string;
  onSubmit: (formData: FormData) => Promise<void>;
  isPending: boolean;
  defaultValues?: InventoryLocation | null;
  canManageLocations: boolean;
};

function LocationDialogContent({
  title,
  actionLabel,
  actorProfileId,
  onSubmit,
  isPending,
  defaultValues,
  canManageLocations,
}: LocationDialogProps) {
  const form = useForm<{
    actor_profile_id: string;
    location_id?: string;
    name: string;
    code: string;
    type: string;
    address: string;
    active: boolean;
  }>({
    defaultValues: {
      actor_profile_id: actorProfileId,
      location_id: defaultValues?.id,
      name: defaultValues?.name ?? '',
      code: defaultValues?.code ?? '',
      type: defaultValues?.type ?? '',
      address: defaultValues?.address ?? '',
      active: defaultValues?.active ?? true,
    },
  });

  useEffect(() => {
    form.reset({
      actor_profile_id: actorProfileId,
      location_id: defaultValues?.id,
      name: defaultValues?.name ?? '',
      code: defaultValues?.code ?? '',
      type: defaultValues?.type ?? '',
      address: defaultValues?.address ?? '',
      active: defaultValues?.active ?? true,
    });
  }, [actorProfileId, defaultValues, form]);

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>Track detailed addresses so deliveries and outreach staff know where supplies live.</DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form action={onSubmit} className="space-y-4">
          <input type="hidden" {...form.register('actor_profile_id')} />
          {defaultValues ? <input type="hidden" {...form.register('location_id')} /> : null}

          <FormField
            control={form.control}
            name="name"
            rules={{ required: 'Location name is required' }}
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="location_name">Name</FormLabel>
                <FormControl>
                  <Input id="location_name" required disabled={!canManageLocations} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="code"
              rules={{ required: 'Code is required' }}
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel htmlFor="code">Code</FormLabel>
                  <FormControl>
                    <Input id="code" placeholder="Short code" required disabled={!canManageLocations} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              rules={{ required: 'Type is required' }}
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel htmlFor="type">Type</FormLabel>
                  <FormControl>
                    <Input id="type" placeholder="e.g., Warehouse" required disabled={!canManageLocations} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="address">Address</FormLabel>
                <FormControl>
                  <Input id="address" placeholder="Street, city" disabled={!canManageLocations} {...field} />
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
                    id="location_active"
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                    disabled={!canManageLocations}
                  />
                </FormControl>
                <FormLabel htmlFor="location_active" className="text-sm font-normal text-muted-foreground">
                  Location is active
                </FormLabel>
              </FormItem>
            )}
          />

          <DialogFooter>
            <Button type="submit" disabled={isPending || !canManageLocations}>
              {actionLabel}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
