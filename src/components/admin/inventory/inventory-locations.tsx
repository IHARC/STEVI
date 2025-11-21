'use client';

import { useState, useTransition } from 'react';
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
import { useToast } from '@/components/ui/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import {
  createInventoryLocationAction,
  deleteInventoryLocationAction,
  toggleInventoryLocationAction,
  updateInventoryLocationAction,
} from '@/app/(portal)/admin/inventory/actions';
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
          <CardTitle className="text-title-sm font-semibold">Locations</CardTitle>
          <p className="text-body-md text-muted-foreground">Warehouses, outreach lockers, and mobile units that hold inventory.</p>
          {!canManageLocations ? (
            <p className="text-label-sm text-warning-foreground">
              Viewing only: only IHARC admins can add or edit locations.
            </p>
          ) : null}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={!canManageLocations}>Create location</Button>
          </DialogTrigger>
          <LocationDialog
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
      <CardFooter className="text-label-sm text-muted-foreground">
        Deleting a location is only allowed when no stock remains and no transactions reference it. Otherwise deactivate to hide it from workflows.
      </CardFooter>

      <LocationDialog
        title="Edit location"
        actionLabel="Save changes"
        actorProfileId={actorProfileId}
        onSubmit={submitUpdate}
        isPending={isPending}
        defaultValues={editing}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        canManageLocations={canManageLocations}
      />
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
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  canManageLocations: boolean;
};

function LocationDialog({
  title,
  actionLabel,
  actorProfileId,
  onSubmit,
  isPending,
  defaultValues,
  open,
  onOpenChange,
  canManageLocations,
}: LocationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Track detailed addresses so deliveries and outreach staff know where supplies live.</DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <input type="hidden" name="actor_profile_id" value={actorProfileId} />
          {defaultValues ? <input type="hidden" name="location_id" value={defaultValues.id} /> : null}
          <div className="grid gap-2">
            <Label htmlFor="location_name">Name</Label>
            <Input id="location_name" name="name" defaultValue={defaultValues?.name ?? ''} required disabled={!canManageLocations} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Code" name="code" defaultValue={defaultValues?.code ?? ''} placeholder="Short code" required disabled={!canManageLocations} />
            <Field label="Type" name="type" defaultValue={defaultValues?.type ?? ''} placeholder="e.g., Warehouse" required disabled={!canManageLocations} />
          </div>
          <Field label="Address" name="address" defaultValue={defaultValues?.address ?? ''} placeholder="Street, city" disabled={!canManageLocations} />
          <div className="flex items-center gap-2">
            <Checkbox
              id="location_active"
              name="active"
              defaultChecked={defaultValues?.active ?? true}
              disabled={!canManageLocations}
            />
            <Label htmlFor="location_active" className="text-body-md text-muted-foreground">
              Location is active
            </Label>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending || !canManageLocations}>
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
  defaultValue?: string | null;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
};

function Field({ label, name, defaultValue, placeholder, required, disabled }: FieldProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
      />
    </div>
  );
}
