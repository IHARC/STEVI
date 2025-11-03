'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { updateInventoryTransactionSourceAction } from '@/app/(portal)/admin/inventory/actions';
import type { InventoryOrganization, InventoryReceipt } from '@/lib/inventory/types';

type InventoryReceiptsSectionProps = {
  receipts: InventoryReceipt[];
  organizations: InventoryOrganization[];
  actorProfileId: string;
};

export function InventoryReceiptsSection({ receipts, organizations, actorProfileId }: InventoryReceiptsSectionProps) {
  const [search, setSearch] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<InventoryReceipt | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const filtered = useMemo(() => {
    if (!search) {
      return receipts;
    }
    const term = search.toLowerCase();
    return receipts.filter((receipt) =>
      [receipt.itemName, receipt.locationName ?? '', receipt.providerOrgName ?? '', receipt.notes ?? '']
        .some((value) => value.toLowerCase().includes(term)),
    );
  }, [receipts, search]);

  const submitUpdateSource = async (formData: FormData) => {
    formData.set('actor_profile_id', actorProfileId);
    const result = await updateInventoryTransactionSourceAction(formData);
    if (!result.success) {
      toast({ title: 'Receipt error', variant: 'destructive', description: result.error ?? 'Failed to update receipt.' });
      return;
    }
    toast({ title: 'Receipt updated', description: 'Receipt source updated.' });
    setSelectedReceipt(null);
    startTransition(() => router.refresh());
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-lg font-semibold">Receipts</CardTitle>
        <Input
          className="w-full sm:w-64"
          placeholder="Search receipts"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Received</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((receipt) => (
              <TableRow key={receipt.id}>
                <TableCell className="font-medium">{receipt.itemName}</TableCell>
                <TableCell>{receipt.locationName ?? '—'}</TableCell>
                <TableCell>{receipt.providerOrgName ?? receipt.refType ?? '—'}</TableCell>
                <TableCell className="text-right">{receipt.qty.toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  {new Date(receipt.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => setSelectedReceipt(receipt)}>
                    Update source
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <UpdateSourceDialog
        receipt={selectedReceipt}
        organizations={organizations}
        actorProfileId={actorProfileId}
        isPending={isPending}
        onClose={() => setSelectedReceipt(null)}
        onSubmit={submitUpdateSource}
      />
    </Card>
  );
}

type UpdateSourceDialogProps = {
  receipt: InventoryReceipt | null;
  organizations: InventoryOrganization[];
  actorProfileId: string;
  isPending: boolean;
  onSubmit: (formData: FormData) => Promise<void>;
  onClose: () => void;
};

function UpdateSourceDialog({ receipt, organizations, actorProfileId, isPending, onSubmit, onClose }: UpdateSourceDialogProps) {
  return (
    <Dialog open={Boolean(receipt)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Update receipt source</DialogTitle>
          <DialogDescription>Attach or correct the provider for this receipt. This keeps reporting accurate across teams.</DialogDescription>
        </DialogHeader>
        {receipt ? (
          <form action={onSubmit} className="space-y-4">
            <input type="hidden" name="actor_profile_id" value={actorProfileId} />
            <input type="hidden" name="transaction_id" value={receipt.id} />
            <div className="grid gap-1">
              <Label>Item</Label>
              <p className="text-sm font-medium text-on-surface">{receipt.itemName}</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="receipt_source_type">Source type</Label>
              <select
                id="receipt_source_type"
                name="source_type"
                defaultValue={receipt.refType ?? ''}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none"
              >
                <option value="">Unset</option>
                <option value="donation">Donation</option>
                <option value="purchase">Purchase</option>
                <option value="transfer_in">Transfer in</option>
                <option value="adjustment">Adjustment</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="receipt_provider">Provider organisation</Label>
              <select
                id="receipt_provider"
                name="provider_org_id"
                defaultValue={receipt.providerOrgId?.toString() ?? ''}
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
            <div className="grid gap-2">
              <Label htmlFor="receipt_notes">Notes</Label>
              <Input
                id="receipt_notes"
                name="notes"
                defaultValue={receipt.notes ?? ''}
                placeholder="Optional comments"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                Save changes
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
