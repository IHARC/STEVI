import { SupabaseAnyServerClient } from '@/lib/supabase/types';
import {
  type BulkReceiptInput,
  type InventoryItem,
  type InventoryItemInput,
  type InventoryItemWithInitialStockInput,
  type InventoryLocation,
  type InventoryLocationInput,
  type InventoryOrganization,
  type InventoryOrganizationInput,
  type InventoryReceipt,
  type StockAdjustmentInput,
  type StockReceiptInput,
  type StockTransferInput,
} from './types';

const DEFAULT_INITIAL_STOCK_NOTES = 'Initial stock recorded in STEVI inventory workspace';

function prepareItemPayload(input: InventoryItemInput) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: input.name,
    description: input.description ?? null,
    category: input.category,
    unit_type: input.unitType,
    minimum_threshold: input.minimumThreshold ?? null,
    cost_per_unit: input.costPerUnit ?? null,
    supplier: input.supplier ?? null,
    active: input.active,
    created_at: now,
    updated_at: now,
  };
}

function prepareItemUpdatePayload(input: InventoryItemInput) {
  const now = new Date().toISOString();
  return {
    name: input.name,
    description: input.description ?? null,
    category: input.category,
    unit_type: input.unitType,
    minimum_threshold: input.minimumThreshold ?? null,
    cost_per_unit: input.costPerUnit ?? null,
    supplier: input.supplier ?? null,
    active: input.active,
    updated_at: now,
  };
}

function prepareLocationPayload(input: InventoryLocationInput) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: input.name,
    code: input.code ?? null,
    type: input.type ?? null,
    address: input.address ?? null,
    active: input.active ?? true,
    created_at: now,
    updated_at: now,
  };
}

function prepareLocationUpdatePayload(input: InventoryLocationInput) {
  const now = new Date().toISOString();
  return {
    name: input.name,
    code: input.code ?? null,
    type: input.type ?? null,
    address: input.address ?? null,
    active: input.active ?? true,
    updated_at: now,
  };
}

function prepareOrganizationPayload(input: InventoryOrganizationInput) {
  const now = new Date().toISOString();
  return {
    name: input.name,
    description: input.description ?? null,
    website: input.website ?? null,
    is_active: true,
    created_at: now,
    updated_at: now,
  };
}

function prepareOrganizationUpdatePayload(input: InventoryOrganizationInput) {
  const now = new Date().toISOString();
  return {
    name: input.name,
    description: input.description ?? null,
    website: input.website ?? null,
    updated_at: now,
  };
}

export async function createInventoryItem(
  supabase: SupabaseAnyServerClient,
  input: InventoryItemWithInitialStockInput,
): Promise<InventoryItem> {
  const payload = prepareItemPayload(input);

  const { data, error } = await supabase
    .schema('core')
    .from('items')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  if (input.initialStockQuantity && input.initialStockQuantity > 0 && input.initialStockLocationId) {
    await supabase.rpc('receive_stock', {
      p_item_id: payload.id,
      p_location_id: input.initialStockLocationId,
      p_qty: input.initialStockQuantity,
      p_unit_cost: input.costPerUnit ?? null,
      p_notes: input.initialStockNotes ?? DEFAULT_INITIAL_STOCK_NOTES,
      p_batch_id: null,
      p_lot_number: null,
      p_expiry_date: null,
    });
  }

  return {
    id: String(data.id),
    name: data.name ?? payload.name,
    description: data.description ?? payload.description ?? null,
    category: data.category ?? payload.category ?? null,
    unitType: data.unit_type ?? payload.unit_type ?? null,
    minimumThreshold: data.minimum_threshold ?? payload.minimum_threshold ?? null,
    costPerUnit: data.cost_per_unit ?? payload.cost_per_unit ?? null,
    supplier: data.supplier ?? payload.supplier ?? null,
    active: data.active ?? payload.active ?? true,
    onHandQuantity: 0,
    committedQuantity: 0,
    availableQuantity: 0,
    lastReceiptAt: null,
  };
}

export async function updateInventoryItem(
  supabase: SupabaseAnyServerClient,
  itemId: string,
  input: InventoryItemInput,
): Promise<void> {
  const payload = prepareItemUpdatePayload(input);
  const { error } = await supabase
    .schema('core')
    .from('items')
    .update(payload)
    .eq('id', itemId);

  if (error) {
    throw error;
  }
}

export async function deleteInventoryItem(supabase: SupabaseAnyServerClient, itemId: string): Promise<void> {
  const { error } = await supabase.schema('core').from('items').delete().eq('id', itemId);
  if (error) {
    throw error;
  }
}

export async function toggleInventoryItemStatus(
  supabase: SupabaseAnyServerClient,
  itemId: string,
  active: boolean,
): Promise<void> {
  const { error } = await supabase
    .schema('core')
    .from('items')
    .update({ active, updated_at: new Date().toISOString() })
    .eq('id', itemId);

  if (error) {
    throw error;
  }
}

export async function receiveInventoryStock(
  supabase: SupabaseAnyServerClient,
  input: StockReceiptInput,
): Promise<void> {
  await supabase.rpc('receive_stock_with_source', {
    p_item_id: input.itemId,
    p_location_id: input.locationId,
    p_qty: input.quantity,
    p_unit_cost: input.unitCost ?? null,
    p_notes: input.notes ?? null,
    p_batch_id: null,
    p_lot_number: input.lotNumber ?? null,
    p_expiry_date: input.expiryDate ?? null,
    p_source_type: input.sourceType ?? null,
    p_provider_org_id: input.providerOrganizationId ?? null,
  });
}

export async function transferInventoryStock(
  supabase: SupabaseAnyServerClient,
  input: StockTransferInput,
): Promise<void> {
  await supabase.rpc('transfer_stock', {
    p_item_id: input.itemId,
    p_from_location_id: input.fromLocationId,
    p_to_location_id: input.toLocationId,
    p_qty: input.quantity,
    p_notes: input.notes ?? null,
    p_batch_id: null,
  });
}

export async function adjustInventoryStock(
  supabase: SupabaseAnyServerClient,
  input: StockAdjustmentInput,
): Promise<void> {
  await supabase.rpc('adjust_stock', {
    p_item_id: input.itemId,
    p_location_id: input.locationId,
    p_qty_delta: input.quantityDelta,
    p_reason: input.reason,
    p_notes: input.notes ?? null,
    p_batch_id: null,
    p_unit_cost: input.unitCost ?? null,
  });
}

export async function bulkReceiveInventoryStock(
  supabase: SupabaseAnyServerClient,
  input: BulkReceiptInput,
): Promise<void> {
  for (const item of input.items) {
    await receiveInventoryStock(supabase, {
      itemId: item.itemId,
      locationId: item.locationId ?? input.defaultLocationId ?? '',
      quantity: item.quantity,
      unitCost: item.unitCost ?? null,
      notes: item.notes ?? input.globalNotes ?? null,
      sourceType: input.sourceType ?? null,
      providerOrganizationId: input.providerOrganizationId ?? null,
      lotNumber: item.lotNumber ?? null,
      expiryDate: item.expiryDate ?? null,
    });
  }
}

export async function createInventoryLocation(
  supabase: SupabaseAnyServerClient,
  input: InventoryLocationInput,
): Promise<InventoryLocation> {
  const payload = prepareLocationPayload(input);
  const { data, error } = await supabase
    .schema('inventory')
    .from('locations')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return {
    id: String(data.id),
    name: data.name ?? payload.name,
    code: data.code ?? payload.code ?? null,
    type: data.type ?? payload.type ?? null,
    address: data.address ?? payload.address ?? null,
    active: data.active ?? payload.active ?? true,
    createdAt: data.created_at ?? payload.created_at ?? null,
    updatedAt: data.updated_at ?? payload.updated_at ?? null,
  };
}

export async function updateInventoryLocation(
  supabase: SupabaseAnyServerClient,
  locationId: string,
  input: InventoryLocationInput,
): Promise<void> {
  const payload = prepareLocationUpdatePayload(input);
  const { error } = await supabase
    .schema('inventory')
    .from('locations')
    .update(payload)
    .eq('id', locationId);

  if (error) {
    throw error;
  }
}

export async function deleteInventoryLocation(supabase: SupabaseAnyServerClient, locationId: string): Promise<void> {
  const { error } = await supabase.schema('inventory').from('locations').delete().eq('id', locationId);
  if (error) {
    throw error;
  }
}

export async function toggleInventoryLocationActive(
  supabase: SupabaseAnyServerClient,
  locationId: string,
  active: boolean,
): Promise<void> {
  const { error } = await supabase
    .schema('inventory')
    .from('locations')
    .update({ active, updated_at: new Date().toISOString() })
    .eq('id', locationId);

  if (error) {
    throw error;
  }
}

export async function createInventoryOrganization(
  supabase: SupabaseAnyServerClient,
  input: InventoryOrganizationInput,
): Promise<InventoryOrganization> {
  const payload = prepareOrganizationPayload(input);
  const { data, error } = await supabase
    .schema('core')
    .from('organizations')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return {
    id: Number.parseInt(String(data.id), 10),
    name: data.name ?? payload.name,
    description: data.description ?? payload.description ?? null,
    website: data.website ?? payload.website ?? null,
    isActive: data.is_active ?? true,
    createdAt: data.created_at ?? payload.created_at ?? null,
    updatedAt: data.updated_at ?? payload.updated_at ?? null,
  };
}

export async function updateInventoryOrganization(
  supabase: SupabaseAnyServerClient,
  organizationId: number,
  input: InventoryOrganizationInput,
): Promise<void> {
  const payload = prepareOrganizationUpdatePayload(input);
  const { error } = await supabase
    .schema('core')
    .from('organizations')
    .update(payload)
    .eq('id', organizationId);

  if (error) {
    throw error;
  }
}

export async function deactivateInventoryOrganization(
  supabase: SupabaseAnyServerClient,
  organizationId: number,
): Promise<void> {
  const { error } = await supabase
    .schema('core')
    .from('organizations')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', organizationId);

  if (error) {
    throw error;
  }
}

export async function activateInventoryOrganization(
  supabase: SupabaseAnyServerClient,
  organizationId: number,
): Promise<void> {
  const { error } = await supabase
    .schema('core')
    .from('organizations')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', organizationId);

  if (error) {
    throw error;
  }
}

export async function updateInventoryTransactionSource(
  supabase: SupabaseAnyServerClient,
  transactionId: string,
  providerOrgId: number | null,
  sourceType: string | null,
  notes: string | null,
): Promise<InventoryReceipt | null> {
  const providerId = providerOrgId === null ? null : Number.isNaN(providerOrgId) ? null : providerOrgId;
  const { error } = await supabase.rpc('update_transaction_source', {
    p_transaction_id: transactionId,
    p_provider_org_id: providerId,
    p_source_type: sourceType,
    p_notes: notes,
  });

  if (error) {
    throw error;
  }

  const { data, error: fetchError } = await supabase
    .schema('inventory')
    .from('v_transactions_with_org')
    .select('*')
    .eq('id', transactionId)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (!data) {
    return null;
  }

  return {
    id: String(data.id),
    itemId: String(data.item_id ?? ''),
    itemName: data.item_name ?? '',
    locationId: typeof data.location_id === 'string' ? data.location_id : null,
    locationName: typeof data.location_name === 'string' ? data.location_name : null,
    qty: Number.parseFloat(String(data.qty ?? 0)),
    refType: data.ref_type ?? null,
    providerOrgId:
      data.provider_org_id === null || data.provider_org_id === undefined
        ? null
        : Number.parseInt(String(data.provider_org_id), 10),
    providerOrgName: data.provider_org_name ?? null,
    notes: data.notes ?? null,
    unitCost:
      data.unit_cost === null || data.unit_cost === undefined
        ? null
        : Number.parseFloat(String(data.unit_cost)),
    createdAt: String(data.created_at ?? new Date().toISOString()),
    createdBy: data.created_by ?? null,
    batchId: data.batch_id ?? null,
    lotNumber: data.lot_number ?? null,
    expiryDate: data.expiry_date ?? null,
  };
}
