import type { SupabaseAnyServerClient } from '@/lib/supabase/types';
import type { DonationCatalogItem, DonationCatalogMetrics } from './types';

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === 'bigint') return Number(value);
  return null;
}

function defaultMetrics(): DonationCatalogMetrics {
  return {
    currentStock: null,
    targetBuffer: null,
    distributedLast30Days: null,
    distributedLast365Days: null,
    inventoryItemName: null,
    inventoryItemCategory: null,
    inventoryUnitType: null,
  };
}

export async function fetchDonationCatalogAdmin(
  supabase: SupabaseAnyServerClient,
): Promise<DonationCatalogItem[]> {
  const donations = supabase.schema('donations');

  const [itemsResult, metricsResult] = await Promise.all([
    donations.from('catalog_items').select('*').order('priority', { ascending: true }).order('title', { ascending: true }),
    donations.from('catalog_item_metrics').select('*'),
  ]);

  if (itemsResult.error) throw itemsResult.error;
  if (metricsResult.error) throw metricsResult.error;

  const metricsById = new Map<string, DonationCatalogMetrics>();
  for (const row of (metricsResult.data ?? []) as Record<string, unknown>[]) {
    const catalogItemId = typeof row.catalog_item_id === 'string' ? row.catalog_item_id : null;
    if (!catalogItemId) continue;
    metricsById.set(catalogItemId, {
      currentStock: asNumber(row.current_stock),
      targetBuffer: asNumber(row.target_buffer),
      distributedLast30Days: asNumber(row.distributed_last_30_days),
      distributedLast365Days: asNumber(row.distributed_last_365_days),
      inventoryItemName: typeof row.inventory_item_name === 'string' ? row.inventory_item_name : null,
      inventoryItemCategory: typeof row.inventory_item_category === 'string' ? row.inventory_item_category : null,
      inventoryUnitType: typeof row.unit_type === 'string' ? row.unit_type : null,
    });
  }

  return ((itemsResult.data ?? []) as Record<string, unknown>[]).map((row) => {
    const id = String(row.id);
    const metrics = metricsById.get(id) ?? defaultMetrics();
    const inventoryId = typeof row.inventory_item_id === 'string' ? row.inventory_item_id : '';
    if (!inventoryId) {
      throw new Error('Catalogue item is missing required inventory mapping.');
    }

    return {
      id,
      slug: String(row.slug ?? ''),
      title: String(row.title ?? ''),
      shortDescription: typeof row.short_description === 'string' ? row.short_description : null,
      longDescription: typeof row.long_description === 'string' ? row.long_description : null,
      category: typeof row.category === 'string' ? row.category : null,
      inventoryItemId: inventoryId,
      unitCostCents: asNumber(row.unit_cost_cents),
      currency: typeof row.currency === 'string' ? row.currency : 'CAD',
      defaultQuantity: asNumber(row.default_quantity) ?? 1,
      priority: asNumber(row.priority) ?? 100,
      targetBuffer: asNumber(row.target_buffer),
      imageUrl: typeof row.image_url === 'string' ? row.image_url : null,
      stripePriceId: typeof row.stripe_price_id === 'string' ? row.stripe_price_id : null,
      isActive: row.is_active !== false,
      metrics,
    };
  });
}
