import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { fetchDonationCatalogAdmin } from '@/lib/donations/service';
import { fetchInventoryItems } from '@/lib/inventory/service';
import { DonationCatalogAdmin } from '@/components/admin/donations/donation-catalog-admin';

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
    <div className="page-shell page-stack">
      <header className="flex flex-col gap-space-xs">
        <p className="text-label-sm font-medium uppercase text-muted-foreground">Donations</p>
        <h1 className="text-headline-lg text-on-surface sm:text-display-sm">Donation catalogue</h1>
        <p className="max-w-3xl text-body-md text-muted-foreground sm:text-body-lg">
          Manage the public donation catalogue, link items to inventory, and keep live metrics in sync with the marketing
          site. All payment logic stays inside STEVI and Supabase.
        </p>
      </header>

      <DonationCatalogAdmin catalog={catalog} inventoryItems={inventoryItems} />
    </div>
  );
}
