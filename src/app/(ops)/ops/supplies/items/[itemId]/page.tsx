import { notFound, redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensureInventoryActor } from '@/lib/inventory/auth';
import {
  fetchInventoryItemById,
  fetchInventoryItems,
  fetchInventoryLocations,
  fetchInventoryOrganizations,
  fetchInventoryReceipts,
} from '@/lib/inventory/service';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { PageHeader } from '@shared/layout/page-header';
import { InventoryItemDetail } from '@/components/workspace/inventory/item-detail/InventoryItemDetail';
import { fetchDonationCatalogCategories } from '@/lib/donations/service';
import type { DonationCatalogCategory, DonationCatalogItem, DonationCatalogMetrics } from '@/lib/donations/types';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ itemId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getString(params: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = params?.[key];
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0] ?? null;
  return null;
}

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

async function fetchDonationListingForItem(
  supabase: Awaited<ReturnType<typeof createSupabaseRSCClient>>,
  inventoryItemId: string,
): Promise<{ item: DonationCatalogItem | null; categories: DonationCatalogCategory[] }> {
  const donations = supabase.schema('donations');

  const [categories, catalogResult] = await Promise.all([
    fetchDonationCatalogCategories(supabase),
    donations
      .from('catalog_items')
      .select(
        'id, slug, title, short_description, long_description, category, inventory_item_id, unit_cost_cents, currency, default_quantity, priority, target_buffer, image_url, stripe_product_id, stripe_price_id, is_active',
      )
      .eq('inventory_item_id', inventoryItemId)
      .maybeSingle(),
  ]);

  if (catalogResult.error) throw catalogResult.error;
  const row = catalogResult.data as Record<string, unknown> | null;

  if (!row) {
    return { item: null, categories };
  }

  const catalogItemId = String(row.id);

  const [metricsResult, categoryIdsResult] = await Promise.all([
    donations
      .from('catalog_item_metrics')
      .select(
        'catalog_item_id, current_stock, target_buffer, distributed_last_30_days, distributed_last_365_days, inventory_item_name, inventory_item_category, unit_type',
      )
      .eq('catalog_item_id', catalogItemId)
      .maybeSingle(),
    donations.from('catalog_item_categories').select('category_id').eq('catalog_item_id', catalogItemId),
  ]);

  if (metricsResult.error) throw metricsResult.error;
  if (categoryIdsResult.error) throw categoryIdsResult.error;

  const metricsRow = metricsResult.data as Record<string, unknown> | null;
  const metrics =
    metricsRow && typeof metricsRow === 'object'
      ? {
          currentStock: asNumber(metricsRow.current_stock),
          targetBuffer: asNumber(metricsRow.target_buffer),
          distributedLast30Days: asNumber(metricsRow.distributed_last_30_days),
          distributedLast365Days: asNumber(metricsRow.distributed_last_365_days),
          inventoryItemName: typeof metricsRow.inventory_item_name === 'string' ? metricsRow.inventory_item_name : null,
          inventoryItemCategory: typeof metricsRow.inventory_item_category === 'string' ? metricsRow.inventory_item_category : null,
          inventoryUnitType: typeof metricsRow.unit_type === 'string' ? metricsRow.unit_type : null,
        }
      : defaultMetrics();

  const categoryIds = ((categoryIdsResult.data ?? []) as { category_id?: unknown }[])
    .map((entry) => (typeof entry.category_id === 'string' ? entry.category_id : ''))
    .filter(Boolean);

  const item: DonationCatalogItem = {
    id: catalogItemId,
    slug: String(row.slug ?? ''),
    title: String(row.title ?? ''),
    shortDescription: typeof row.short_description === 'string' ? row.short_description : null,
    longDescription: typeof row.long_description === 'string' ? row.long_description : null,
    category: typeof row.category === 'string' ? row.category : null,
    categoryIds,
    inventoryItemId: String(row.inventory_item_id ?? ''),
    unitCostCents: asNumber(row.unit_cost_cents),
    currency: typeof row.currency === 'string' ? row.currency : 'CAD',
    defaultQuantity: asNumber(row.default_quantity) ?? 1,
    priority: asNumber(row.priority) ?? 100,
    targetBuffer: asNumber(row.target_buffer),
    imageUrl: typeof row.image_url === 'string' ? row.image_url : null,
    stripeProductId: typeof row.stripe_product_id === 'string' ? row.stripe_product_id : null,
    stripePriceId: typeof row.stripe_price_id === 'string' ? row.stripe_price_id : null,
    isActive: row.is_active !== false,
    metrics,
  };

  return { item, categories };
}

export default async function OpsSuppliesItemDetailPage({ params, searchParams }: PageProps) {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);
  const { itemId } = await params;

  if (!access) {
    redirect(`/login?next=${encodeURIComponent(`/ops/supplies/items/${itemId}`)}`);
  }

  if (!access.canAccessInventoryOps && !access.canAccessOpsAdmin) {
    redirect(resolveLandingPath(access));
  }

  const { profile } = await ensureInventoryActor(supabase, true);

  const [item, locations, organizations, receipts, allItems] = await Promise.all([
    fetchInventoryItemById(supabase, itemId),
    fetchInventoryLocations(supabase),
    fetchInventoryOrganizations(supabase),
    fetchInventoryReceipts(supabase, { itemId, limit: 200 }),
    fetchInventoryItems(supabase),
  ]);

  if (!item) {
    notFound();
  }

  const categories = Array.from(
    new Set(
      allItems
        .map((entry) => entry.category)
        .filter((category): category is string => typeof category === 'string' && category.trim().length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const resolvedParams = searchParams ? await searchParams : undefined;
  const tab = getString(resolvedParams, 'tab');
  const initialTab = tab === 'stock' || tab === 'donations' ? tab : 'inventory';

  const canManageDonations = access.canAccessOpsSteviAdmin;
  const donation = canManageDonations ? await fetchDonationListingForItem(supabase, itemId) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title={item.name}
        description="Inventory details, stock history, and donation catalogue settings."
        breadcrumbs={[
          { label: 'Supplies', href: '/ops/supplies' },
          { label: 'Items', href: '/ops/supplies' },
          { label: item.name },
        ]}
      />

      <InventoryItemDetail
        item={item}
        categories={categories}
        locations={locations}
        organizations={organizations}
        receipts={receipts}
        actorProfileId={profile.id}
        canManageDonations={canManageDonations}
        donation={donation?.item ?? null}
        donationCategories={donation?.categories ?? []}
        initialTab={initialTab}
      />
    </div>
  );
}

