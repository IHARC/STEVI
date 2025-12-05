import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { InventoryHub } from '@/components/admin/inventory/inventory-hub';
import { ensureInventoryActor } from '@/lib/inventory/auth';
import { fetchInventoryBootstrap } from '@/lib/inventory/service';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { PageHeader } from '@/components/layout/page-header';

export const dynamic = 'force-dynamic';

export default async function InventoryOverviewPage() {
  const supabase = await createSupabaseRSCClient();
  const { profile, roles } = await ensureInventoryActor(supabase, true);

  if (!profile) {
    const access = await loadPortalAccess(supabase);
    redirect(resolveLandingPath(access));
  }

  const bootstrap = await fetchInventoryBootstrap(supabase);
  const canManageLocations = roles.includes('iharc_admin');

  return (
    <div className="mx-auto w-full max-w-6xl flex flex-col gap-6 px-4 py-8 md:px-6">
      <PageHeader
        eyebrow="Inventory & donations"
        title="Inventory overview"
        description="Manage stock across IHARC locations, attribute incoming donations, and keep reconciliation aligned with outreach teams."
      />

      <InventoryHub bootstrap={bootstrap} actorProfileId={profile.id} canManageLocations={canManageLocations} />
    </div>
  );
}
