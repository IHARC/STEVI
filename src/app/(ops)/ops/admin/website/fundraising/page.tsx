import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import Link from 'next/link';
import { fetchDonationCatalogAdmin } from '@/lib/donations/service';
import { fetchInventoryItems } from '@/lib/inventory/service';
import { DonationCatalogAdmin } from '@/components/workspace/admin/donations/donation-catalog-admin';
import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';

export const dynamic = 'force-dynamic';

export default async function AdminWebsiteFundraisingPage() {
  const supabase = await createSupabaseRSCClient();

  const [catalog, inventoryItems] = await Promise.all([fetchDonationCatalogAdmin(supabase), fetchInventoryItems(supabase)]);

  return (
    <Card className="border-border/60">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Donations catalogue</CardTitle>
        <CardDescription>
          Manage the donation options shown on iharc.ca. Items are inventory-backed and can be synced to Stripe prices.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <Alert>
            <AlertTitle>Stripe + webhooks moved</AlertTitle>
            <AlertDescription>
              Donations Stripe mode, credentials, webhook health, and the reconciliation inbox now live under Integrations.
            </AlertDescription>
            <div className="mt-3">
              <Button asChild variant="secondary" size="sm">
                <Link href="/ops/admin/integrations/donations">Open donations integrations</Link>
              </Button>
            </div>
          </Alert>

          <DonationCatalogAdmin catalog={catalog} inventoryItems={inventoryItems} />
        </div>
      </CardContent>
    </Card>
  );
}
