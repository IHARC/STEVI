import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { fetchInventoryBootstrap } from '@/lib/inventory/service';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { PageHeader } from '@shared/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { InventoryHub } from '@workspace/admin/inventory/inventory-hub';
import {
  fetchDonationCatalogAdminPage,
  fetchDonationCatalogAdminStats,
  fetchDonationCatalogCategories,
  fetchDonationCatalogInventoryItemIds,
} from '@/lib/donations/service';
import { DonationCatalogAdmin } from '@/components/workspace/admin/donations/donation-catalog-admin';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type SuppliesTab = 'dashboard' | 'items' | 'locations' | 'organizations' | 'receipts' | 'donations';

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

function parseTab(value: string | null): SuppliesTab {
  if (
    value === 'items' ||
    value === 'locations' ||
    value === 'organizations' ||
    value === 'receipts' ||
    value === 'donations'
  ) {
    return value;
  }
  return 'dashboard';
}

export default async function OpsSuppliesPage({ searchParams }: PageProps) {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/login?next=/ops/supplies');
  }

  if (!access.canAccessInventoryOps) {
    redirect(resolveLandingPath(access));
  }

  const resolvedParams = searchParams ? await searchParams : undefined;
  const tab = parseTab(getString(resolvedParams, 'tab'));

  if (tab === 'donations' && !access.canAccessOpsSteviAdmin) {
    redirect('/ops/supplies');
  }

  const bootstrap = await fetchInventoryBootstrap(supabase);
  const canManageLocations = access.iharcRoles.includes('iharc_admin');

  let donationCatalogueContent: ReactNode | null = null;
  if (tab === 'donations' && access.canAccessOpsSteviAdmin) {
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

    const [catalogStats, catalogPage, catalogInventoryItemIds, categories] = await Promise.all([
      fetchDonationCatalogAdminStats(supabase, { search: q }),
      fetchDonationCatalogAdminPage(supabase, { search: q, status, sort, page, pageSize }),
      fetchDonationCatalogInventoryItemIds(supabase),
      fetchDonationCatalogCategories(supabase),
    ]);

    donationCatalogueContent = (
      <Card className="border-border/60">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">Donation catalogue</CardTitle>
          <CardDescription>Item-level donation settings live inside each inventory item’s Donations tab.</CardDescription>
        </CardHeader>
        <CardContent>
          <DonationCatalogAdmin
            key={`${q}:${status}:${sort}:${page}:${pageSize}`}
            inventoryItems={bootstrap.items}
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
    );
  }

  return (
    <div className="space-y-3">
      <PageHeader
        eyebrow="Operations"
        title="Supplies"
        description="Stock summary, receipts, and (admin-only) donation catalogue listings."
        meta={[{ label: 'Inventory', tone: 'info' }, { label: 'Visit-first', tone: 'neutral' }]}
      />

      <InventoryHub
        bootstrap={bootstrap}
        actorProfileId={access.profile.id}
        canManageLocations={canManageLocations}
        activeTab={tab}
        showDonationCatalogueTab={access.canAccessOpsSteviAdmin}
        donationCatalogueContent={donationCatalogueContent}
      />
    </div>
  );
}
