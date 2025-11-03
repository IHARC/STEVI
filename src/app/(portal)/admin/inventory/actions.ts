'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/audit';
import { ensureInventoryActor, InventoryAccessError } from '@/lib/inventory/auth';
import {
  adjustInventoryStock,
  bulkReceiveInventoryStock,
  createInventoryItem,
  createInventoryLocation,
  createInventoryOrganization,
  deactivateInventoryOrganization,
  deleteInventoryItem,
  deleteInventoryLocation,
  receiveInventoryStock,
  toggleInventoryItemStatus,
  toggleInventoryLocationActive,
  transferInventoryStock,
  updateInventoryItem,
  updateInventoryLocation,
  updateInventoryOrganization,
  updateInventoryTransactionSource,
} from '@/lib/inventory/mutations';
import { fetchInventoryReceiptById } from '@/lib/inventory/service';
import type {
  BulkReceiptInput,
  InventoryItem,
  InventoryLocation,
  InventoryOrganization,
  InventoryReceipt,
} from '@/lib/inventory/types';

const INVENTORY_PATH = '/admin/inventory';

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string };

type InventoryMutation = (
  ctx: Awaited<ReturnType<typeof ensureInventoryActor>>,
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  formData: FormData,
) => Promise<void | Record<string, unknown>>;

function normalizeBoolean(value: FormDataEntryValue | null, fallback = false): boolean {
  if (value === null) {
    return fallback;
  }
  const normalized = typeof value === 'string' ? value.toLowerCase() : String(value).toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'on' || normalized === 'yes';
}

function parseNumber(
  value: FormDataEntryValue | null,
  { required = false, allowNegative = false }: { required?: boolean; allowNegative?: boolean } = {},
): number | null {
  if (value === null || value === '') {
    if (required) {
      throw new InventoryAccessError('Missing numeric value.');
    }
    return null;
  }
  const parsed = Number.parseFloat(String(value));
  if (Number.isNaN(parsed)) {
    throw new InventoryAccessError('Invalid numeric value provided.');
  }
  if (!allowNegative && parsed < 0) {
    throw new InventoryAccessError('Negative values are not allowed.');
  }
  return parsed;
}

function getRequiredString(formData: FormData, key: string, message: string): string {
  const value = formData.get(key);
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InventoryAccessError(message);
  }
  return value.trim();
}

function getOptionalString(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function runInventoryMutation<T = void>(
  formData: FormData,
  mutate: InventoryMutation,
): Promise<ActionResult<T>> {
  try {
    const supabase = await createSupabaseServerClient();
    const context = await ensureInventoryActor(supabase);

    const actorProfileId = getRequiredString(formData, 'actor_profile_id', 'Admin context is required.');
    if (actorProfileId !== context.profile.id) {
      throw new InventoryAccessError('Actor profile mismatch.');
    }

    const result = await mutate(context, supabase, formData);

    await revalidatePath(INVENTORY_PATH);

    return { success: true, data: result as T };
  } catch (error: unknown) {
    console.error('Inventory mutation failed', error);
    let message: string;
    if (error instanceof InventoryAccessError) {
      message = error.message;
    } else if (error instanceof Error) {
      message = error.message;
    } else {
      message = 'An unexpected error occurred.';
    }
    return { success: false, error: message };
  }
}

export async function createInventoryItemAction(
  formData: FormData,
): Promise<ActionResult<{ item: InventoryItem }>> {
  return runInventoryMutation(formData, async ({ profile }, supabase) => {
    const item = await createInventoryItem(supabase, {
      name: getRequiredString(formData, 'name', 'Name is required.'),
      description: getOptionalString(formData, 'description'),
      category: getRequiredString(formData, 'category', 'Select a category.'),
      unitType: getRequiredString(formData, 'unit_type', 'Unit type is required.'),
      minimumThreshold: parseNumber(formData.get('minimum_threshold')),
      costPerUnit: parseNumber(formData.get('cost_per_unit')),
      supplier: getOptionalString(formData, 'supplier'),
      active: normalizeBoolean(formData.get('active'), true),
      initialStockQuantity: parseNumber(formData.get('initial_stock'), { allowNegative: false }) ?? 0,
      initialStockLocationId: getOptionalString(formData, 'initial_location_id'),
      initialStockNotes: getOptionalString(formData, 'initial_stock_notes'),
    });

    await logAuditEvent(supabase, {
      actorProfileId: profile.id,
      action: 'inventory_item_created',
      entityType: 'inventory_item',
      entityId: item.id,
      meta: {
        name: item.name,
        category: item.category,
      },
    });

    return { item };
  });
}

export async function updateInventoryItemAction(formData: FormData): Promise<ActionResult> {
  return runInventoryMutation(formData, async ({ profile }, supabase) => {
    const itemId = getRequiredString(formData, 'item_id', 'Item context missing.');

    await updateInventoryItem(supabase, itemId, {
      name: getRequiredString(formData, 'name', 'Name is required.'),
      description: getOptionalString(formData, 'description'),
      category: getRequiredString(formData, 'category', 'Select a category.'),
      unitType: getRequiredString(formData, 'unit_type', 'Unit type is required.'),
      minimumThreshold: parseNumber(formData.get('minimum_threshold')),
      costPerUnit: parseNumber(formData.get('cost_per_unit')),
      supplier: getOptionalString(formData, 'supplier'),
      active: normalizeBoolean(formData.get('active'), true),
    });

    await logAuditEvent(supabase, {
      actorProfileId: profile.id,
      action: 'inventory_item_updated',
      entityType: 'inventory_item',
      entityId: itemId,
    });
  });
}

export async function deleteInventoryItemAction(formData: FormData): Promise<ActionResult> {
  return runInventoryMutation(formData, async ({ profile }, supabase) => {
    const itemId = getRequiredString(formData, 'item_id', 'Item context missing.');

    await deleteInventoryItem(supabase, itemId);

    await logAuditEvent(supabase, {
      actorProfileId: profile.id,
      action: 'inventory_item_deleted',
      entityType: 'inventory_item',
      entityId: itemId,
    });
  });
}

export async function toggleInventoryItemStatusAction(formData: FormData): Promise<ActionResult> {
  return runInventoryMutation(formData, async ({ profile }, supabase) => {
    const itemId = getRequiredString(formData, 'item_id', 'Item context missing.');
    const active = normalizeBoolean(formData.get('active'), true);

    await toggleInventoryItemStatus(supabase, itemId, active);

    await logAuditEvent(supabase, {
      actorProfileId: profile.id,
      action: active ? 'inventory_item_activated' : 'inventory_item_deactivated',
      entityType: 'inventory_item',
      entityId: itemId,
    });
  });
}

export async function receiveInventoryStockAction(formData: FormData): Promise<ActionResult> {
  return runInventoryMutation(formData, async ({ profile }, supabase) => {
    await receiveInventoryStock(supabase, {
      itemId: getRequiredString(formData, 'item_id', 'Select an item to receive stock for.'),
      locationId: getRequiredString(formData, 'location_id', 'Select a location.'),
      quantity: parseNumber(formData.get('quantity'), { required: true, allowNegative: false }) ?? 0,
      unitCost: parseNumber(formData.get('unit_cost')),
      notes: getOptionalString(formData, 'notes'),
      sourceType: getOptionalString(formData, 'source_type'),
      providerOrganizationId: parseNumber(formData.get('provider_org_id')) ?? null,
      lotNumber: getOptionalString(formData, 'lot_number'),
      expiryDate: getOptionalString(formData, 'expiry_date'),
    });

    await logAuditEvent(supabase, {
      actorProfileId: profile.id,
      action: 'inventory_stock_received',
      entityType: 'inventory_item',
      entityId: getRequiredString(formData, 'item_id', 'Select an item to receive stock for.'),
    });
  });
}

export async function bulkReceiveInventoryStockAction(formData: FormData): Promise<ActionResult> {
  return runInventoryMutation(formData, async ({ profile }, supabase) => {
    const payloadRaw = getRequiredString(formData, 'items', 'Receipt payload missing.');

    let payload: BulkReceiptInput;
    try {
      payload = JSON.parse(payloadRaw);
    } catch {
      throw new InventoryAccessError('Invalid bulk receipt payload.');
    }

    await bulkReceiveInventoryStock(supabase, payload);

    await logAuditEvent(supabase, {
      actorProfileId: profile.id,
      action: 'inventory_bulk_receipt_processed',
      entityType: 'inventory_bulk_receipt',
      entityId: payload.items.map((item) => item.itemId).join(','),
    });
  });
}

export async function transferInventoryStockAction(formData: FormData): Promise<ActionResult> {
  return runInventoryMutation(formData, async ({ profile }, supabase) => {
    await transferInventoryStock(supabase, {
      itemId: getRequiredString(formData, 'item_id', 'Select an item.'),
      fromLocationId: getRequiredString(formData, 'from_location_id', 'Select the source location.'),
      toLocationId: getRequiredString(formData, 'to_location_id', 'Select the destination location.'),
      quantity: parseNumber(formData.get('quantity'), { required: true }) ?? 0,
      notes: getOptionalString(formData, 'notes'),
    });

    await logAuditEvent(supabase, {
      actorProfileId: profile.id,
      action: 'inventory_stock_transferred',
      entityType: 'inventory_item',
      entityId: getRequiredString(formData, 'item_id', 'Select an item.'),
    });
  });
}

export async function adjustInventoryStockAction(formData: FormData): Promise<ActionResult> {
  return runInventoryMutation(formData, async ({ profile }, supabase) => {
    await adjustInventoryStock(supabase, {
      itemId: getRequiredString(formData, 'item_id', 'Select an item.'),
      locationId: getRequiredString(formData, 'location_id', 'Select a location.'),
      quantityDelta: parseNumber(formData.get('quantity_delta'), { required: true, allowNegative: true }) ?? 0,
      reason: getRequiredString(formData, 'reason', 'Include a reason for this adjustment.'),
      notes: getOptionalString(formData, 'notes'),
      unitCost: parseNumber(formData.get('unit_cost')),
    });

    await logAuditEvent(supabase, {
      actorProfileId: profile.id,
      action: 'inventory_stock_adjusted',
      entityType: 'inventory_item',
      entityId: getRequiredString(formData, 'item_id', 'Select an item.'),
    });
  });
}

export async function createInventoryLocationAction(
  formData: FormData,
): Promise<ActionResult<{ location: InventoryLocation }>> {
  return runInventoryMutation(formData, async ({ profile }, supabase) => {
    const location = await createInventoryLocation(supabase, {
      name: getRequiredString(formData, 'name', 'Location name is required.'),
      code: getOptionalString(formData, 'code'),
      type: getOptionalString(formData, 'type'),
      address: getOptionalString(formData, 'address'),
      active: normalizeBoolean(formData.get('active'), true),
    });

    await logAuditEvent(supabase, {
      actorProfileId: profile.id,
      action: 'inventory_location_created',
      entityType: 'inventory_location',
      entityId: location.id,
    });

    return { location };
  });
}

export async function updateInventoryLocationAction(formData: FormData): Promise<ActionResult> {
  return runInventoryMutation(formData, async ({ profile }, supabase) => {
    const locationId = getRequiredString(formData, 'location_id', 'Location context missing.');

    await updateInventoryLocation(supabase, locationId, {
      name: getRequiredString(formData, 'name', 'Location name is required.'),
      code: getOptionalString(formData, 'code'),
      type: getOptionalString(formData, 'type'),
      address: getOptionalString(formData, 'address'),
      active: normalizeBoolean(formData.get('active'), true),
    });

    await logAuditEvent(supabase, {
      actorProfileId: profile.id,
      action: 'inventory_location_updated',
      entityType: 'inventory_location',
      entityId: locationId,
    });
  });
}

export async function toggleInventoryLocationAction(formData: FormData): Promise<ActionResult> {
  return runInventoryMutation(formData, async ({ profile }, supabase) => {
    const locationId = getRequiredString(formData, 'location_id', 'Location context missing.');
    const active = normalizeBoolean(formData.get('active'), true);

    await toggleInventoryLocationActive(supabase, locationId, active);

    await logAuditEvent(supabase, {
      actorProfileId: profile.id,
      action: active ? 'inventory_location_activated' : 'inventory_location_deactivated',
      entityType: 'inventory_location',
      entityId: locationId,
    });
  });
}

export async function deleteInventoryLocationAction(formData: FormData): Promise<ActionResult> {
  return runInventoryMutation(formData, async ({ profile }, supabase) => {
    const locationId = getRequiredString(formData, 'location_id', 'Location context missing.');

    await deleteInventoryLocation(supabase, locationId);

    await logAuditEvent(supabase, {
      actorProfileId: profile.id,
      action: 'inventory_location_deleted',
      entityType: 'inventory_location',
      entityId: locationId,
    });
  });
}

export async function createInventoryOrganizationAction(
  formData: FormData,
): Promise<ActionResult<{ organization: InventoryOrganization }>> {
  return runInventoryMutation(formData, async ({ profile }, supabase) => {
    const organization = await createInventoryOrganization(supabase, {
      name: getRequiredString(formData, 'name', 'Organization name is required.'),
      description: getOptionalString(formData, 'description'),
      website: getOptionalString(formData, 'website'),
    });

    await logAuditEvent(supabase, {
      actorProfileId: profile.id,
      action: 'inventory_organization_created',
      entityType: 'inventory_organization',
      entityId: String(organization.id),
    });

    return { organization };
  });
}

export async function updateInventoryOrganizationAction(formData: FormData): Promise<ActionResult> {
  return runInventoryMutation(formData, async ({ profile }, supabase) => {
    const organizationId = parseNumber(formData.get('organization_id'), { required: true });
    if (organizationId === null) {
      throw new InventoryAccessError('Organization context missing.');
    }

    await updateInventoryOrganization(supabase, organizationId, {
      name: getRequiredString(formData, 'name', 'Organization name is required.'),
      description: getOptionalString(formData, 'description'),
      website: getOptionalString(formData, 'website'),
    });

    await logAuditEvent(supabase, {
      actorProfileId: profile.id,
      action: 'inventory_organization_updated',
      entityType: 'inventory_organization',
      entityId: String(organizationId),
    });
  });
}

export async function deactivateInventoryOrganizationAction(formData: FormData): Promise<ActionResult> {
  return runInventoryMutation(formData, async ({ profile }, supabase) => {
    const organizationId = parseNumber(formData.get('organization_id'), { required: true });
    if (organizationId === null) {
      throw new InventoryAccessError('Organization context missing.');
    }

    await deactivateInventoryOrganization(supabase, organizationId);

    await logAuditEvent(supabase, {
      actorProfileId: profile.id,
      action: 'inventory_organization_deactivated',
      entityType: 'inventory_organization',
      entityId: String(organizationId),
    });
  });
}

export async function updateInventoryTransactionSourceAction(
  formData: FormData,
): Promise<ActionResult<{ receipt: InventoryReceipt | null }>> {
  return runInventoryMutation(formData, async ({ profile }, supabase) => {
    const transactionId = getRequiredString(formData, 'transaction_id', 'Receipt context missing.');
    const providerOrgIdRaw = parseNumber(formData.get('provider_org_id'));
    const sourceType = getOptionalString(formData, 'source_type');
    const notes = getOptionalString(formData, 'notes');

    const updated = await updateInventoryTransactionSource(
      supabase,
      transactionId,
      providerOrgIdRaw ?? null,
      sourceType,
      notes,
    );
    const receipt = updated ?? (await fetchInventoryReceiptById(supabase, transactionId));

    await logAuditEvent(supabase, {
      actorProfileId: profile.id,
      action: 'inventory_receipt_source_updated',
      entityType: 'inventory_receipt',
      entityId: transactionId,
    });

    return { receipt: receipt ?? null };
  });
}
