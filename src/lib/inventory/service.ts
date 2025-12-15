import { SupabaseAnyServerClient } from '@/lib/supabase/types';
import {
  type ExpiringItem,
  type InventoryBootstrap,
  type InventoryDashboard,
  type InventoryItem,
  type InventoryLocation,
  type InventoryOrganization,
  type InventoryReceipt,
  type InventorySummary,
  type LowStockItem,
} from './types';

const ITEMS_SELECT =
  'id, name, description, category, unit_type, minimum_threshold, cost_per_unit, supplier, active, onhand_qty';
const LOW_STOCK_SELECT = 'id, name, category, unit_type, onhand_qty, minimum_threshold';
const LOCATIONS_SELECT = 'id, name, code, type, address, active, created_at, updated_at';
const ORGANIZATIONS_SELECT = 'id, name, description, website, is_active, created_at, updated_at';
const RECEIPTS_SELECT =
  'id, item_id, item_name, location_id, location_name, qty, ref_type, provider_org_id, provider_org_name, notes, unit_cost, created_at, created_by, batch_id, batch_lot_number, batch_expiry_date';

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  if (typeof value === 'bigint') {
    return Number(value);
  }
  return fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    return normalized === 'true' || normalized === '1';
  }
  return fallback;
}

function mapInventoryItem(row: Record<string, unknown>): InventoryItem {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    description: typeof row.description === 'string' ? row.description : null,
    category: typeof row.category === 'string' ? row.category : null,
    unitType: typeof row.unit_type === 'string' ? row.unit_type : null,
    minimumThreshold: row.minimum_threshold === null || row.minimum_threshold === undefined ? null : asNumber(row.minimum_threshold),
    costPerUnit: row.cost_per_unit === null || row.cost_per_unit === undefined ? null : asNumber(row.cost_per_unit),
    supplier: typeof row.supplier === 'string' ? row.supplier : null,
    active: asBoolean(row.active, true),
    onHandQuantity: asNumber(row.onhand_qty),
  };
}

function mapLowStockItem(row: Record<string, unknown>): LowStockItem {
  return {
    id: String(row.id ?? crypto.randomUUID()),
    name: String(row.name ?? ''),
    category: typeof row.category === 'string' ? row.category : null,
    unitType: typeof row.unit_type === 'string' ? row.unit_type : null,
    onHandQuantity: asNumber(row.onhand_qty),
    minimumThreshold: row.minimum_threshold === null || row.minimum_threshold === undefined ? null : asNumber(row.minimum_threshold),
  };
}

function mapExpiringItem(row: Record<string, unknown>): ExpiringItem {
  return {
    id: String(row.id ?? row.batch_id ?? crypto.randomUUID()),
    itemId: String(row.item_id ?? row.id ?? ''),
    itemName: String(row.item_name ?? row.name ?? ''),
    lotNumber: typeof row.lot_number === 'string' ? row.lot_number : null,
    expiryDate: typeof row.expiry_date === 'string' ? row.expiry_date : null,
    daysUntilExpiry: row.days_until_expiry === null || row.days_until_expiry === undefined ? null : asNumber(row.days_until_expiry),
    locationId: typeof row.location_id === 'string' ? row.location_id : null,
    locationName: typeof row.location_name === 'string' ? row.location_name : null,
  };
}

function mapLocation(row: Record<string, unknown>): InventoryLocation {
  const rawAddress = row.address;
  let address: string | null = null;
  if (typeof rawAddress === 'string') {
    address = rawAddress;
  } else if (rawAddress && typeof rawAddress === 'object') {
    const formatted =
      typeof (rawAddress as Record<string, unknown>).formatted === 'string'
        ? String((rawAddress as Record<string, unknown>).formatted)
        : typeof (rawAddress as Record<string, unknown>).label === 'string'
          ? String((rawAddress as Record<string, unknown>).label)
          : null;
    address = formatted ?? JSON.stringify(rawAddress);
  }

  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    code: typeof row.code === 'string' ? row.code : null,
    type: typeof row.type === 'string' ? row.type : null,
    address,
    active: asBoolean(row.active, true),
    createdAt: typeof row.created_at === 'string' ? row.created_at : null,
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : null,
  };
}

function mapOrganization(row: Record<string, unknown>): InventoryOrganization {
  return {
    id: Number.parseInt(String(row.id), 10),
    name: String(row.name ?? ''),
    description: typeof row.description === 'string' ? row.description : null,
    website: typeof row.website === 'string' ? row.website : null,
    isActive: asBoolean(row.is_active, true),
    createdAt: typeof row.created_at === 'string' ? row.created_at : null,
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : null,
  };
}

function mapReceipt(row: Record<string, unknown>): InventoryReceipt {
  return {
    id: String(row.id),
    itemId: String(row.item_id ?? ''),
    itemName: String(row.item_name ?? row.name ?? ''),
    locationId: typeof row.location_id === 'string' ? row.location_id : null,
    locationName: typeof row.location_name === 'string' ? row.location_name : null,
    qty: asNumber(row.qty ?? row.quantity ?? 0),
    refType: typeof row.ref_type === 'string' ? row.ref_type : null,
    providerOrgId: row.provider_org_id === null || row.provider_org_id === undefined ? null : Number.parseInt(String(row.provider_org_id), 10),
    providerOrgName: typeof row.provider_org_name === 'string' ? row.provider_org_name : null,
    notes: typeof row.notes === 'string' ? row.notes : null,
    unitCost: row.unit_cost === null || row.unit_cost === undefined ? null : asNumber(row.unit_cost),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    createdBy: typeof row.created_by === 'string' ? row.created_by : null,
    batchId: typeof row.batch_id === 'string' ? row.batch_id : null,
    lotNumber: typeof row.batch_lot_number === 'string' ? row.batch_lot_number : null,
    expiryDate: typeof row.batch_expiry_date === 'string' ? row.batch_expiry_date : null,
  };
}

async function rpc<T>(supabase: SupabaseAnyServerClient, fn: string, params?: Record<string, unknown>): Promise<T[]> {
  const { data, error } = await supabase.schema('inventory').rpc(fn, params ?? {});
  if (error) {
    throw error;
  }
  if (!data) {
    return [];
  }
  return Array.isArray(data) ? data : [data];
}

export async function fetchInventoryItems(supabase: SupabaseAnyServerClient): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .schema('inventory')
    .from('v_items_with_balances')
    .select(ITEMS_SELECT)
    .order('name');
  if (error) {
    throw error;
  }
  return ((data ?? []) as Record<string, unknown>[]).map(mapInventoryItem);
}

export async function fetchInventoryItemById(
  supabase: SupabaseAnyServerClient,
  itemId: string,
): Promise<InventoryItem | null> {
  if (!itemId) return null;

  const { data, error } = await supabase
    .schema('inventory')
    .from('v_items_with_balances')
    .select(ITEMS_SELECT)
    .eq('id', itemId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) return null;
  return mapInventoryItem(data as Record<string, unknown>);
}

export async function fetchLowStockItems(supabase: SupabaseAnyServerClient): Promise<LowStockItem[]> {
  const { data, error } = await supabase
    .schema('inventory')
    .from('v_low_stock')
    .select(LOW_STOCK_SELECT)
    .order('onhand_qty', { ascending: true });
  if (error) {
    throw error;
  }
  const rows = (data ?? []) as Record<string, unknown>[];
  return rows.map(mapLowStockItem);
}

export async function fetchExpiringItems(supabase: SupabaseAnyServerClient, daysAhead = 30): Promise<ExpiringItem[]> {
  const rows = await rpc<Record<string, unknown>>(supabase, 'get_expiring_items', { days_ahead: daysAhead });
  return rows.map(mapExpiringItem);
}

export async function fetchInventoryLocations(supabase: SupabaseAnyServerClient): Promise<InventoryLocation[]> {
  const { data, error } = await supabase
    .schema('inventory')
    .from('locations')
    .select(LOCATIONS_SELECT)
    .order('name');
  if (error) {
    throw error;
  }
  const rows = (data ?? []) as Record<string, unknown>[];
  return rows.map(mapLocation);
}

export async function fetchInventoryOrganizations(supabase: SupabaseAnyServerClient): Promise<InventoryOrganization[]> {
  const { data, error } = await supabase
    .schema('core')
    .from('organizations')
    .select(ORGANIZATIONS_SELECT)
    .order('is_active', { ascending: false })
    .order('name');
  if (error) {
    throw error;
  }
  const rows = (data ?? []) as Record<string, unknown>[];
  return rows.map(mapOrganization);
}

export type ReceiptFilter = {
  startDate?: string | null;
  endDate?: string | null;
  organizationId?: string | null;
  sourceType?: string | null;
  locationId?: string | null;
  itemId?: string | null;
  search?: string | null;
  limit?: number | null;
};

export async function fetchInventoryReceipts(
  supabase: SupabaseAnyServerClient,
  { startDate, endDate, organizationId, sourceType, locationId, itemId, search, limit }: ReceiptFilter = {},
): Promise<InventoryReceipt[]> {
  const safeLimit = Math.min(Math.max(Number(limit ?? 100), 1), 500);
  let query = supabase
    .schema('inventory')
    .from('v_transactions_with_org')
    .select(RECEIPTS_SELECT)
    .eq('reason_code', 'receipt')
    .order('created_at', { ascending: false })
    .limit(safeLimit);

  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }
  if (organizationId) {
    const parsed = Number.parseInt(organizationId, 10);
    if (!Number.isNaN(parsed)) {
      query = query.eq('provider_org_id', parsed);
    }
  }
  if (sourceType) {
    query = query.eq('ref_type', sourceType);
  }
  if (locationId) {
    query = query.eq('location_id', locationId);
  }
  if (itemId) {
    query = query.eq('item_id', itemId);
  }
  if (search) {
    const term = search.trim();
    if (term.length > 0) {
      const pattern = `%${term}%`;
      query = query.or(
        `item_name.ilike.${pattern},provider_org_name.ilike.${pattern},notes.ilike.${pattern},location_name.ilike.${pattern}`,
      );
    }
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  return rows.map(mapReceipt);
}

export async function fetchInventoryReceiptById(
  supabase: SupabaseAnyServerClient,
  transactionId: string,
): Promise<InventoryReceipt | null> {
  if (!transactionId) {
    return null;
  }

  const { data, error } = await supabase
    .schema('inventory')
    .from('v_transactions_with_org')
    .select(RECEIPTS_SELECT)
    .eq('id', transactionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapReceipt(data as Record<string, unknown>) : null;
}

function buildInventorySummary(items: InventoryItem[], lowStock: LowStockItem[], expiring: ExpiringItem[]): InventorySummary {
  return {
    totalItems: items.length,
    activeItems: items.filter((item) => item.active).length,
    lowStockCount: lowStock.length,
    expiringCount: expiring.filter((item) => (item.daysUntilExpiry ?? Number.POSITIVE_INFINITY) <= 7).length,
    totalOnHand: items.reduce((sum, item) => sum + item.onHandQuantity, 0),
  };
}

export async function fetchInventoryDashboard(supabase: SupabaseAnyServerClient): Promise<InventoryDashboard> {
  const [items, lowStock, expiring, receipts] = await Promise.all([
    fetchInventoryItems(supabase),
    fetchLowStockItems(supabase),
    fetchExpiringItems(supabase, 30),
    fetchInventoryReceipts(supabase, { limit: 10 }),
  ]);

  return {
    summary: buildInventorySummary(items, lowStock, expiring),
    lowStockItems: lowStock,
    expiringItems: expiring,
    recentReceipts: receipts.slice(0, 10),
  };
}

export async function fetchInventoryBootstrap(supabase: SupabaseAnyServerClient): Promise<InventoryBootstrap> {
  const [items, dashboard, locations, organizations, receipts] = await Promise.all([
    fetchInventoryItems(supabase),
    fetchInventoryDashboard(supabase),
    fetchInventoryLocations(supabase),
    fetchInventoryOrganizations(supabase),
    fetchInventoryReceipts(supabase, { limit: 50 }),
  ]);

  return {
    items,
    dashboard,
    locations,
    organizations,
    receipts,
  };
}
