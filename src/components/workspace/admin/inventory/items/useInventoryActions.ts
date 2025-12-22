import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useToast } from '@shared/ui/use-toast';
import {
  adjustInventoryStockAction,
  bulkReceiveInventoryStockAction,
  createInventoryItemAction,
  deleteInventoryItemAction,
  receiveInventoryStockAction,
  toggleInventoryItemStatusAction,
  transferInventoryStockAction,
  updateInventoryItemAction,
} from '@/app/(app-admin)/app-admin/inventory/actions';
import type { InventoryItem } from '@/lib/inventory/types';

export type InventoryActionResult<T = void> = { success: true; data?: T } | { success: false; error: string };

type ActionRunner = (formData: FormData) => Promise<InventoryActionResult<unknown>>;

type InventoryActions = {
  isPending: boolean;
  createItem: (formData: FormData, onSuccess?: () => void) => Promise<InventoryActionResult<unknown>>;
  updateItem: (formData: FormData, onSuccess?: () => void) => Promise<InventoryActionResult<unknown>>;
  receiveStock: (formData: FormData, onSuccess?: () => void) => Promise<InventoryActionResult<unknown>>;
  transferStock: (formData: FormData, onSuccess?: () => void) => Promise<InventoryActionResult<unknown>>;
  adjustStock: (formData: FormData, onSuccess?: () => void) => Promise<InventoryActionResult<unknown>>;
  toggleItem: (item: InventoryItem, nextActive: boolean) => Promise<InventoryActionResult<unknown>>;
  deleteItem: (item: InventoryItem) => Promise<InventoryActionResult<unknown>>;
  bulkReceive: (formData: FormData, onSuccess?: () => void) => Promise<InventoryActionResult<unknown>>;
};

type InventoryActionsParams = {
  actorProfileId: string;
};

export function useInventoryActions({ actorProfileId }: InventoryActionsParams): InventoryActions {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const withActor = (formData: FormData) => {
    formData.set('actor_profile_id', actorProfileId);
  };

  const handleResult = <T,>(result: InventoryActionResult<T>, message: string, onSuccess?: () => void) => {
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Inventory error', description: result.error ?? 'Action failed.' });
      return result;
    }
    onSuccess?.();
    toast({ title: 'Inventory updated', description: message });
    startTransition(() => router.refresh());
    return result;
  };

  const run = async (action: ActionRunner, formData: FormData, message: string, onSuccess?: () => void) => {
    withActor(formData);
    const result = await action(formData);
    return handleResult(result, message, onSuccess);
  };

  return {
    isPending,
    createItem: (formData, onSuccess) => run(createInventoryItemAction, formData, 'Item created successfully.', onSuccess),
    updateItem: (formData, onSuccess) => run(updateInventoryItemAction, formData, 'Item updated.', onSuccess),
    receiveStock: (formData, onSuccess) => run(receiveInventoryStockAction, formData, 'Stock received.', onSuccess),
    transferStock: (formData, onSuccess) => run(transferInventoryStockAction, formData, 'Stock transferred.', onSuccess),
    adjustStock: (formData, onSuccess) => run(adjustInventoryStockAction, formData, 'Adjustment applied.', onSuccess),
    toggleItem: async (item, nextActive) => {
      const data = new FormData();
      withActor(data);
      data.set('item_id', item.id);
      data.set('active', String(nextActive));
      const result = await toggleInventoryItemStatusAction(data);
      return handleResult(result, nextActive ? 'Item activated.' : 'Item deactivated.');
    },
    deleteItem: async (item) => {
      const data = new FormData();
      withActor(data);
      data.set('item_id', item.id);
      const result = await deleteInventoryItemAction(data);
      return handleResult(result, 'Item deleted.');
    },
    bulkReceive: (formData, onSuccess) => run(bulkReceiveInventoryStockAction, formData, 'Bulk receipt queued.', onSuccess),
  };
}
