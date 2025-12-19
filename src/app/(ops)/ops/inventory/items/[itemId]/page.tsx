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

export default async function OpsInventoryItemDetailPage({ params, searchParams }: PageProps) {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);
  const { itemId } = await params;

  if (!access) {
    redirect(`/login?next=${encodeURIComponent(`/ops/inventory/items/${itemId}`)}`);
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
  const initialTab = tab === 'stock' ? 'stock' : 'inventory';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title={item.name}
        description="Inventory details and stock history."
        breadcrumbs={[
          { label: 'Inventory', href: '/ops/inventory?tab=items' },
          { label: 'Items', href: '/ops/inventory?tab=items' },
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
