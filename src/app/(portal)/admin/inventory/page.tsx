import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { InventoryWorkspace } from '@/components/admin/inventory/inventory-workspace';
import { ensureInventoryActor } from '@/lib/inventory/auth';
import { fetchInventoryBootstrap } from '@/lib/inventory/service';

export const dynamic = 'force-dynamic';

export default async function InventoryAdminPage() {
  const supabase = await createSupabaseRSCClient();
  const { profile, roles } = await ensureInventoryActor(supabase, true);

  if (!profile) {
    redirect('/home');
  }

  const bootstrap = await fetchInventoryBootstrap(supabase);
  const canManageLocations = roles.includes('iharc_admin');

  return (
    <div className="page-shell page-stack">
      <header className="flex flex-col gap-space-xs">
        <p className="text-label-sm font-medium uppercase text-muted-foreground">Inventory</p>
        <h1 className="text-headline-lg text-on-surface sm:text-display-sm">Inventory workspace</h1>
        <p className="max-w-3xl text-body-md text-muted-foreground sm:text-body-lg">
          Manage stock across IHARC locations, attribute incoming donations, and keep reconciliation aligned with outreach teams.
        </p>
      </header>

      <InventoryWorkspace bootstrap={bootstrap} actorProfileId={profile.id} canManageLocations={canManageLocations} />
    </div>
  );
}
