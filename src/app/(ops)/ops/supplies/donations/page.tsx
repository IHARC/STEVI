import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { PageHeader } from '@shared/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import {
  fetchDonationCatalogAdminPage,
  fetchDonationCatalogAdminStats,
  fetchDonationCatalogCategories,
  fetchDonationCatalogInventoryItemIds,
} from '@/lib/donations/service';
import { fetchInventoryItems } from '@/lib/inventory/service';
import { DonationCatalogAdmin } from '@/components/workspace/admin/donations/donation-catalog-admin';

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

export default async function OpsSuppliesDonationsPage({ searchParams }: PageProps) {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/login?next=/ops/supplies/donations');
  }

  if (!access.canAccessOpsSteviAdmin) {
    redirect(resolveLandingPath(access));
  }

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

  const [catalogStats, catalogPage, catalogInventoryItemIds, inventoryItems, categories] = await Promise.all([
    fetchDonationCatalogAdminStats(supabase, { search: q }),
    fetchDonationCatalogAdminPage(supabase, { search: q, status, sort, page, pageSize }),
    fetchDonationCatalogInventoryItemIds(supabase),
    fetchInventoryItems(supabase),
    fetchDonationCatalogCategories(supabase),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Donation catalogue"
        description="Manage which inventory-backed items appear on iharc.ca and are available for Stripe-backed fundraising."
        breadcrumbs={[{ label: 'Supplies', href: '/ops/supplies' }, { label: 'Donation catalogue' }]}
      />

      <Card className="border-border/60">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">Catalogue overview</CardTitle>
          <CardDescription>Item-level donation settings live inside each inventory item’s Donations tab.</CardDescription>
        </CardHeader>
        <CardContent>
          <DonationCatalogAdmin
            key={`${q}:${status}:${sort}:${page}:${pageSize}`}
            inventoryItems={inventoryItems}
            catalogInventoryItemIds={catalogInventoryItemIds}
            categories={categories}
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
        </CardContent>
      </Card>
    </div>
  );
}

