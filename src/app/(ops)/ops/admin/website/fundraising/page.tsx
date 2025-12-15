import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import Link from 'next/link';
import { fetchDonationCatalogAdminPage, fetchDonationCatalogAdminStats, fetchDonationCatalogInventoryItemIds } from '@/lib/donations/service';
import { fetchInventoryItems } from '@/lib/inventory/service';
import { DonationCatalogAdmin } from '@/components/workspace/admin/donations/donation-catalog-admin';
import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getString(params: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = params?.[key];
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0] ?? null;
  return null;
}

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

export default async function AdminWebsiteFundraisingPage({ searchParams }: PageProps) {
  const supabase = await createSupabaseRSCClient();

  const resolvedParams = searchParams ? await searchParams : undefined;
  const q = getString(resolvedParams, 'q') ?? '';
  const statusParam = getString(resolvedParams, 'status');
  const sortParam = getString(resolvedParams, 'sort');
  const pageParam = getString(resolvedParams, 'page');
  const pageSizeParam = getString(resolvedParams, 'pageSize');

  const status = statusParam === 'all' || statusParam === 'hidden' || statusParam === 'active' ? statusParam : 'active';
  const sort = sortParam === 'title' || sortParam === 'stock' || sortParam === 'priority' ? sortParam : 'priority';
  const page = parsePositiveInt(pageParam, 0);
  const pageSizeRaw = parsePositiveInt(pageSizeParam, 50);
  const pageSize = pageSizeRaw === 25 || pageSizeRaw === 50 || pageSizeRaw === 100 ? pageSizeRaw : 50;

  const [catalogStats, catalogPage, catalogInventoryItemIds, inventoryItems] = await Promise.all([
    fetchDonationCatalogAdminStats(supabase, { search: q }),
    fetchDonationCatalogAdminPage(supabase, { search: q, status, sort, page, pageSize }),
    fetchDonationCatalogInventoryItemIds(supabase),
    fetchInventoryItems(supabase),
  ]);

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

          <DonationCatalogAdmin
            key={`${q}:${status}:${sort}:${page}:${pageSize}`}
            inventoryItems={inventoryItems}
            catalogInventoryItemIds={catalogInventoryItemIds}
            items={catalogPage.items}
            total={catalogPage.total}
            stats={catalogStats}
            initial={{
              q,
              status,
              sort,
              page,
              pageSize,
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
