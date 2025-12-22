import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { fetchInventoryBootstrap } from '@/lib/inventory/service';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { PageHeader } from '@shared/layout/page-header';
import { InventoryHub } from '@workspace/admin/inventory/inventory-hub';
import { normalizeEnumParam, toSearchParams } from '@/lib/search-params';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const VIEWS = ['dashboard', 'items', 'locations', 'receipts'] as const;

export default async function OpsInventoryPage({ searchParams }: PageProps) {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect(`/login?next=${encodeURIComponent('/ops/inventory?view=dashboard')}`);
  }

  if (!access.canAccessInventoryOps) {
    redirect(resolveLandingPath(access));
  }

  const resolvedParams = searchParams ? await searchParams : undefined;
  const params = toSearchParams(resolvedParams);
  const { value: tab, redirected } = normalizeEnumParam(params, 'view', VIEWS, 'dashboard');
  if (redirected) {
    redirect(`/ops/inventory?${params.toString()}`);
  }

  const bootstrap = await fetchInventoryBootstrap(supabase);
  const canManageLocations = access.canManageInventoryLocations;

  return (
    <div className="space-y-3">
      <PageHeader
        eyebrow="Operations"
        title="Inventory"
        description="Stock summary, receipts, and inventory tools."
        meta={[{ label: 'Inventory', tone: 'info' }, { label: 'Visit-first', tone: 'neutral' }]}
      />

      <InventoryHub
        bootstrap={bootstrap}
        actorProfileId={access.profile.id}
        canManageLocations={canManageLocations}
        activeTab={tab}
      />
    </div>
  );
}
