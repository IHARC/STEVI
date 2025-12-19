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
import { normalizeEnumParam, toSearchParams } from '@/lib/search-params';
import { PageHeader } from '@shared/layout/page-header';
import { InventoryItemDetail } from '@/components/workspace/inventory/item-detail/InventoryItemDetail';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ itemId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OpsInventoryItemDetailPage({ params, searchParams }: PageProps) {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);
  const { itemId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const canonicalParams = toSearchParams(resolvedSearchParams);
  const { redirected } = normalizeEnumParam(canonicalParams, 'view', ['items'] as const, 'items');
  if (redirected) {
    redirect(`/ops/inventory/items/${itemId}?${canonicalParams.toString()}`);
  }

  if (!access) {
    redirect(`/login?next=${encodeURIComponent(`/ops/inventory/items/${itemId}?view=items`)}`);
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

  const tab = canonicalParams.get('tab');
  const initialTab = tab === 'stock' ? 'stock' : 'inventory';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title={item.name}
        description="Inventory details and stock history."
        breadcrumbs={[
          { label: 'Inventory', href: '/ops/inventory?view=items' },
          { label: 'Items', href: '/ops/inventory?view=items' },
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
        initialTab={initialTab}
      />
    </div>
  );
}
