import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { fetchInventoryBootstrap } from '@/lib/inventory/service';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { PageHeader } from '@shared/layout/page-header';
import { InventoryHub } from '@workspace/admin/inventory/inventory-hub';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type InventoryTab = 'dashboard' | 'items' | 'locations' | 'organizations' | 'receipts';

function getString(params: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = params?.[key];
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0] ?? null;
  return null;
}

function parseTab(value: string | null): InventoryTab {
  if (value === 'items' || value === 'locations' || value === 'organizations' || value === 'receipts') {
    return value;
  }
  return 'dashboard';
}

export default async function OpsInventoryPage({ searchParams }: PageProps) {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/login?next=/ops/inventory');
  }

  if (!access.canAccessInventoryOps) {
    redirect(resolveLandingPath(access));
  }

  const resolvedParams = searchParams ? await searchParams : undefined;
  const tab = parseTab(getString(resolvedParams, 'tab'));

  const bootstrap = await fetchInventoryBootstrap(supabase);
  const canManageLocations = access.iharcRoles.includes('iharc_admin');

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
