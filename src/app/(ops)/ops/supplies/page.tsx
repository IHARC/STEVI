import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { fetchInventoryBootstrap } from '@/lib/inventory/service';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { PageHeader } from '@shared/layout/page-header';
import { Button } from '@shared/ui/button';
import { InventoryHub } from '@workspace/admin/inventory/inventory-hub';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function OpsSuppliesPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/login?next=/ops/supplies');
  }

  if (!access.canAccessInventoryOps) {
    redirect(resolveLandingPath(access));
  }

  const bootstrap = await fetchInventoryBootstrap(supabase);
  const canManageLocations = access.iharcRoles.includes('iharc_admin');

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Operations"
        title="Supplies"
        description="Stock summary, receipts, and (admin-only) donation catalogue listings."
        meta={[{ label: 'Inventory', tone: 'info' }, { label: 'Visit-first', tone: 'neutral' }]}
        actions={
          access.canAccessOpsSteviAdmin ? (
            <Button asChild variant="secondary" size="sm">
              <Link href="/ops/supplies/donations">Open donation catalogue</Link>
            </Button>
          ) : null
        }
      />

      <InventoryHub bootstrap={bootstrap} actorProfileId={access.profile.id} canManageLocations={canManageLocations} />
    </div>
  );
}
