import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { InventoryWorkspace } from '@/components/admin/inventory/inventory-workspace';
import { ensureInventoryActor } from '@/lib/inventory/auth';
import { fetchInventoryBootstrap } from '@/lib/inventory/service';

export const dynamic = 'force-dynamic';

export default async function InventoryAdminPage() {
  const supabase = await createSupabaseRSCClient();
  const { profile } = await ensureInventoryActor(supabase, true);

  if (!profile) {
    redirect('/home');
  }

  const bootstrap = await fetchInventoryBootstrap(supabase);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Inventory</p>
        <h1 className="text-3xl font-semibold text-on-surface sm:text-4xl">Inventory workspace</h1>
        <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
          Manage stock across IHARC locations, attribute incoming donations, and keep reconciliation aligned with outreach teams.
        </p>
      </header>

      <InventoryWorkspace bootstrap={bootstrap} actorProfileId={profile.id} />
    </div>
  );
}
