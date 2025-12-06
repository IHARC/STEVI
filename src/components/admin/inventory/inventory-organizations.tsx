'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
  createInventoryOrganizationAction,
  deactivateInventoryOrganizationAction,
  activateInventoryOrganizationAction,
  updateInventoryOrganizationAction,
} from '@/app/(portal)/admin/inventory/actions';
import type { InventoryOrganization } from '@/lib/inventory/types';

type InventoryOrganizationsSectionProps = {
  organizations: InventoryOrganization[];
  actorProfileId: string;
};

export function InventoryOrganizationsSection({ organizations, actorProfileId }: InventoryOrganizationsSectionProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryOrganization | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleResult = (result: { success: boolean; error?: string }, message: string, close?: () => void) => {
    if (!result.success) {
      toast({ title: 'Organisation error', variant: 'destructive', description: result.error ?? 'Action failed.' });
      return;
    }
    if (close) {
      close();
    }
    toast({ title: 'Organisation updated', description: message });
    startTransition(() => router.refresh());
  };

  const submitCreate = async (formData: FormData) => {
    formData.set('actor_profile_id', actorProfileId);
    const result = await createInventoryOrganizationAction(formData);
    handleResult(result, 'Organization saved.', () => setOpen(false));
  };

  const submitUpdate = async (formData: FormData) => {
    formData.set('actor_profile_id', actorProfileId);
    const result = await updateInventoryOrganizationAction(formData);
    handleResult(result, 'Organization updated.', () => setEditing(null));
  };

  const submitDeactivate = async (organization: InventoryOrganization) => {
    const formData = new FormData();
    formData.set('actor_profile_id', actorProfileId);
    formData.set('organization_id', String(organization.id));
    const result = await deactivateInventoryOrganizationAction(formData);
    handleResult(result, 'Organization deactivated.');
  };

  const submitReactivate = async (organization: InventoryOrganization) => {
    const formData = new FormData();
    formData.set('actor_profile_id', actorProfileId);
    formData.set('organization_id', String(organization.id));
    const result = await activateInventoryOrganizationAction(formData);
    handleResult(result, 'Organization reactivated.');
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base font-semibold">Partner organisations</CardTitle>
          <p className="text-sm text-muted-foreground">
            Track donors, suppliers, and partners for accurate receipt attribution and reporting.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Add organisation</Button>
          </DialogTrigger>
          <OrganizationDialog
            title="Add organisation"
            actionLabel="Save organisation"
            actorProfileId={actorProfileId}
            onSubmit={submitCreate}
            isPending={isPending}
          />
        </Dialog>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {organizations.map((org) => (
              <TableRow key={org.id} className={!org.isActive ? 'opacity-60' : undefined}>
                <TableCell className="font-medium">{org.name}</TableCell>
                <TableCell>{org.website ?? '—'}</TableCell>
                <TableCell>
                  <span className={org.isActive ? 'text-primary' : 'text-muted-foreground'}>
                    {org.isActive ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell className="space-x-2 text-right">
                  <Button size="sm" variant="outline" onClick={() => setEditing(org)}>
                    Edit
                  </Button>
                  {org.isActive ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => submitDeactivate(org)}
                      disabled={isPending}
                    >
                      Deactivate
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-accent hover:text-accent"
                      onClick={() => submitReactivate(org)}
                      disabled={isPending}
                    >
                      Reactivate
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Deactivate partners to pause new activity. Reactivate them when donations resume so historic receipts stay intact.
      </CardFooter>

      <OrganizationDialog
        title="Edit organization"
        actionLabel="Save changes"
        actorProfileId={actorProfileId}
        onSubmit={submitUpdate}
        isPending={isPending}
        defaultValues={editing}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      />
    </Card>
  );
}

type OrganizationDialogProps = {
  title: string;
  actionLabel: string;
  actorProfileId: string;
  onSubmit: (formData: FormData) => Promise<void>;
  isPending: boolean;
  defaultValues?: InventoryOrganization | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function OrganizationDialog({ title, actionLabel, actorProfileId, onSubmit, isPending, defaultValues, open, onOpenChange }: OrganizationDialogProps) {
  const form = useForm<{
    actor_profile_id: string;
    organization_id?: string;
    name: string;
    website: string;
    description: string;
  }>({
    defaultValues: {
      actor_profile_id: actorProfileId,
      organization_id: defaultValues?.id ? String(defaultValues.id) : undefined,
      name: defaultValues?.name ?? '',
      website: defaultValues?.website ?? '',
      description: defaultValues?.description ?? '',
    },
  });

  useEffect(() => {
    form.reset({
      actor_profile_id: actorProfileId,
      organization_id: defaultValues?.id ? String(defaultValues.id) : undefined,
      name: defaultValues?.name ?? '',
      website: defaultValues?.website ?? '',
      description: defaultValues?.description ?? '',
    });
  }, [actorProfileId, defaultValues, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Capture supplier details and websites to simplify follow-up for receipts.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form action={onSubmit} className="space-y-4">
            <input type="hidden" {...form.register('actor_profile_id')} />
            {defaultValues ? <input type="hidden" {...form.register('organization_id')} /> : null}

            <FormField
              control={form.control}
              name="name"
              rules={{ required: 'Organization name is required' }}
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel htmlFor="org_name">Name</FormLabel>
                  <FormControl>
                    <Input id="org_name" required {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel htmlFor="org_website">Website</FormLabel>
                  <FormControl>
                    <Input id="org_website" type="url" placeholder="https://example.ca" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel htmlFor="org_description">Description</FormLabel>
                  <FormControl>
                    <Textarea id="org_description" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
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
