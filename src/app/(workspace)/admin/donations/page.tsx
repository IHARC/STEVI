import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { fetchDonationCatalogAdmin } from '@/lib/donations/service';
import { fetchInventoryItems } from '@/lib/inventory/service';
import { DonationCatalogAdmin } from '@workspace/admin/donations/donation-catalog-admin';

export const dynamic = 'force-dynamic';

export default async function DonationsAdminPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.iharcRoles.includes('iharc_admin')) {
    redirect('/admin');
  }

  const [catalog, inventoryItems] = await Promise.all([
    fetchDonationCatalogAdmin(supabase),
    fetchInventoryItems(supabase).catch(() => []),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl flex flex-col gap-6 px-4 py-8 md:px-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase text-muted-foreground">Donations</p>
        <h1 className="text-xl text-foreground sm:text-2xl">Donation catalogue</h1>
        <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
          Manage the public donation catalogue, link items to inventory, and keep live metrics in sync with the marketing
          site. All payment logic stays inside STEVI and Supabase.
        </p>
      </header>

      <DonationCatalogAdmin catalog={catalog} inventoryItems={inventoryItems} />
    </div>
  );
}
