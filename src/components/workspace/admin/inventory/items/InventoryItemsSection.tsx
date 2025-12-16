'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@shared/ui/card';
import { Button } from '@shared/ui/button';
import { Dialog, DialogTrigger } from '@shared/ui/dialog';
import { useInventoryActions } from './useInventoryActions';
import { ItemsTable } from './ItemsTable';
import { AdjustStockDialog, BulkReceiveDialog, ReceiveStockDialog, TransferStockDialog } from './StockDialogs';
import type { InventoryItem, InventoryLocation, InventoryOrganization } from '@/lib/inventory/types';

type InventoryItemsSectionProps = {
  items: InventoryItem[];
  locations: InventoryLocation[];
  organizations: InventoryOrganization[];
  actorProfileId: string;
};

export function InventoryItemsSection({ items, locations, organizations, actorProfileId }: InventoryItemsSectionProps) {
  const [itemToReceive, setItemToReceive] = useState<InventoryItem | null>(null);
  const [itemToTransfer, setItemToTransfer] = useState<InventoryItem | null>(null);
  const [itemToAdjust, setItemToAdjust] = useState<InventoryItem | null>(null);
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  const { isPending, receiveStock, transferStock, adjustStock, toggleItem, deleteItem, bulkReceive } =
    useInventoryActions({ actorProfileId });

  const activeOrganizations = useMemo(() => organizations.filter((org) => org.isActive), [organizations]);

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base font-semibold">Inventory items</CardTitle>
        <div className="flex items-center gap-2">
          <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Bulk receive</Button>
            </DialogTrigger>
            <BulkReceiveDialog
              isPending={isPending}
              onSubmit={(formData) => bulkReceive(formData, () => setIsBulkOpen(false)).then(() => undefined)}
              actorProfileId={actorProfileId}
              items={items}
              locations={locations}
              organizations={activeOrganizations}
            />
          </Dialog>
          <Button asChild>
            <Link href="/ops/inventory/items/new">Create item</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <ItemsTable
          items={items}
          isPending={isPending}
          onReceive={setItemToReceive}
          onTransfer={setItemToTransfer}
          onAdjust={setItemToAdjust}
          onToggle={(item, next) => toggleItem(item, next)}
          onDelete={(item) => deleteItem(item)}
        />
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Manage stock levels using receive, transfer, or adjust actions. Deactivating an item hides it from operational workflows without
        deleting historic transactions.
      </CardFooter>

      <ReceiveStockDialog
        item={itemToReceive}
        locations={locations}
        organizations={activeOrganizations}
        isPending={isPending}
        onClose={() => setItemToReceive(null)}
        onSubmit={(formData) => receiveStock(formData, () => setItemToReceive(null)).then(() => undefined)}
        actorProfileId={actorProfileId}
      />

      <TransferStockDialog
        item={itemToTransfer}
        locations={locations}
        isPending={isPending}
        onClose={() => setItemToTransfer(null)}
        onSubmit={(formData) => transferStock(formData, () => setItemToTransfer(null)).then(() => undefined)}
        actorProfileId={actorProfileId}
      />

      <AdjustStockDialog
        item={itemToAdjust}
        locations={locations}
        isPending={isPending}
        onClose={() => setItemToAdjust(null)}
        onSubmit={(formData) => adjustStock(formData, () => setItemToAdjust(null)).then(() => undefined)}
        actorProfileId={actorProfileId}
      />
    </Card>
  );
}
