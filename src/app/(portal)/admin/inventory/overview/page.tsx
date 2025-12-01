import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { InventoryWorkspace } from '@/components/admin/inventory/inventory-workspace';
import { ensureInventoryActor } from '@/lib/inventory/auth';
import { fetchInventoryBootstrap } from '@/lib/inventory/service';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';
import { WorkspacePageHeader } from '@/components/layout/workspace-page-header';

export const dynamic = 'force-dynamic';

export default async function InventoryOverviewPage() {
  const supabase = await createSupabaseRSCClient();
  const { profile, roles } = await ensureInventoryActor(supabase, true);

  if (!profile) {
    const access = await loadPortalAccess(supabase);
    redirect(resolveDefaultWorkspacePath(access));
  }

  const bootstrap = await fetchInventoryBootstrap(supabase);
  const canManageLocations = roles.includes('iharc_admin');

  return (
    <div className="page-shell page-stack">
      <WorkspacePageHeader
        eyebrow="Inventory workspace"
        title="Inventory overview"
        description="Manage stock across IHARC locations, attribute incoming donations, and keep reconciliation aligned with outreach teams."
      />

      <InventoryWorkspace bootstrap={bootstrap} actorProfileId={profile.id} canManageLocations={canManageLocations} />
    </div>
  );
}

