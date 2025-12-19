import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensureInventoryActor } from '@/lib/inventory/auth';
import { fetchInventoryItems, fetchInventoryLocations } from '@/lib/inventory/service';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { normalizeEnumParam, toSearchParams } from '@/lib/search-params';
import { PageHeader } from '@shared/layout/page-header';
import { InventoryItemCreate } from '@/components/workspace/inventory/item-detail/InventoryItemCreate';

export const dynamic = 'force-dynamic';

export default async function OpsInventoryNewItemPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const canonicalParams = toSearchParams(resolvedSearchParams);
  const { redirected } = normalizeEnumParam(canonicalParams, 'view', ['items'] as const, 'items');
  if (redirected) {
    redirect(`/ops/inventory/items/new?${canonicalParams.toString()}`);
  }
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect(`/login?next=${encodeURIComponent('/ops/inventory/items/new?view=items')}`);
  }

  if (!access.canAccessInventoryOps && !access.canAccessOpsAdmin) {
    redirect(resolveLandingPath(access));
  }

  const { profile } = await ensureInventoryActor(supabase, true);
  const [items, locations] = await Promise.all([fetchInventoryItems(supabase), fetchInventoryLocations(supabase)]);

  const categories = Array.from(
    new Set(
      items
        .map((item) => item.category)
        .filter((category): category is string => typeof category === 'string' && category.trim().length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Create inventory item"
        description="Add a new item for outreach and donation-backed supplies."
        breadcrumbs={[
          { label: 'Inventory', href: '/ops/inventory?view=items' },
          { label: 'Items', href: '/ops/inventory?view=items' },
          { label: 'Create item' },
        ]}
      />

      <InventoryItemCreate actorProfileId={profile.id} categories={categories} locations={locations} />
    </div>
  );
}
