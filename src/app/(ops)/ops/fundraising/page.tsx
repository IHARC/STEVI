import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { PageHeader } from '@shared/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/ui/tabs';
import Link from 'next/link';
import { Button } from '@shared/ui/button';
import { fetchInventoryBootstrap } from '@/lib/inventory/service';
import {
  fetchDonationCatalogAdminPage,
  fetchDonationCatalogAdminStats,
  fetchDonationCatalogCategories,
  fetchDonationCatalogInventoryItemIds,
  fetchDonationPaymentsAdmin,
  fetchDonationSubscriptionsAdmin,
} from '@/lib/donations/service';
import { DonationCatalogAdmin } from '@/components/workspace/admin/donations/donation-catalog-admin';
import { DonationPaymentsTable } from '@/components/workspace/fundraising/donation-payments-table';
import { DonationSubscriptionsTable } from '@/components/workspace/fundraising/donation-subscriptions-table';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type FundraisingTab = 'overview' | 'catalogue' | 'donations' | 'subscriptions';

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

function parseTab(value: string | null): FundraisingTab {
  if (value === 'catalogue' || value === 'donations' || value === 'subscriptions') return value;
  return 'overview';
}

function buildHref(tab: FundraisingTab, params: URLSearchParams) {
  const next = new URLSearchParams(params);
  if (tab === 'overview') {
    next.delete('tab');
  } else {
    next.set('tab', tab);
  }
  return `/ops/fundraising?${next.toString()}`;
}

export default async function OpsFundraisingHubPage({ searchParams }: PageProps) {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/auth/start?next=/ops/fundraising');
  }

  if (!access.canAccessOpsSteviAdmin) {
    redirect(resolveLandingPath(access));
  }

  const resolvedParams = searchParams ? await searchParams : undefined;
  const tab = parseTab(getString(resolvedParams, 'tab'));
  const urlParams = new URLSearchParams();
  for (const [key, value] of Object.entries(resolvedParams ?? {})) {
    if (!value) continue;
    const first = Array.isArray(value) ? value[0] : value;
    if (typeof first === 'string') urlParams.set(key, first);
  }

  const catalogStats = await fetchDonationCatalogAdminStats(supabase);

  let catalogueContent: ReactNode | null = null;
  if (tab === 'catalogue') {
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

    const [bootstrap, catalogPage, catalogInventoryItemIds, categories] = await Promise.all([
      fetchInventoryBootstrap(supabase),
      fetchDonationCatalogAdminPage(supabase, { search: q, status, sort, page, pageSize }),
      fetchDonationCatalogInventoryItemIds(supabase),
      fetchDonationCatalogCategories(supabase),
    ]);

    catalogueContent = (
      <Card className="border-border/60">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">Donation catalogue</CardTitle>
          <CardDescription>Manage public donation listings shown on iharc.ca.</CardDescription>
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

  const payments = tab === 'donations' || tab === 'overview' ? await fetchDonationPaymentsAdmin(supabase, { limit: tab === 'donations' ? 200 : 10 }) : [];
  const subscriptions =
    tab === 'subscriptions' || tab === 'overview' ? await fetchDonationSubscriptionsAdmin(supabase, { limit: tab === 'subscriptions' ? 200 : 10 }) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Fundraising"
        description="Donation catalogue and donor activity for iharc.ca."
        meta={[{ label: 'IHARC only', tone: 'warning' }]}
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link href="/app-admin/integrations">Integration settings</Link>
          </Button>
        }
      />

      <Tabs value={tab} className="space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl bg-muted p-2 sm:grid-cols-4">
          <TabsTrigger value="overview" asChild className="w-full rounded-xl px-3 text-xs font-semibold">
            <Link href={buildHref('overview', urlParams)}>Overview</Link>
          </TabsTrigger>
          <TabsTrigger value="catalogue" asChild className="w-full rounded-xl px-3 text-xs font-semibold">
            <Link href={buildHref('catalogue', urlParams)}>Catalogue</Link>
          </TabsTrigger>
          <TabsTrigger value="donations" asChild className="w-full rounded-xl px-3 text-xs font-semibold">
            <Link href={buildHref('donations', urlParams)}>Donations</Link>
          </TabsTrigger>
          <TabsTrigger value="subscriptions" asChild className="w-full rounded-xl px-3 text-xs font-semibold">
            <Link href={buildHref('subscriptions', urlParams)}>Subscriptions</Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-12">
            <Card className="border-border/60 lg:col-span-4">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">Catalogue</CardTitle>
                <CardDescription>Listings on iharc.ca.</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Items</div>
                <span>{catalogStats.total}</span>
              </CardContent>
            </Card>

            <Card className="border-border/60 lg:col-span-4">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">Recent donations</CardTitle>
                <CardDescription>Latest processed payments.</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Loaded</div>
                <span>{payments.length}</span>
              </CardContent>
            </Card>

            <Card className="border-border/60 lg:col-span-4">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">Subscriptions</CardTitle>
                <CardDescription>Monthly donors.</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Loaded</div>
                <span>{subscriptions.length}</span>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border/60">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">Next steps</CardTitle>
                <CardDescription>Most common admin tasks.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button asChild variant="secondary" size="sm">
                  <Link href={buildHref('catalogue', urlParams)}>Manage catalogue</Link>
                </Button>
                <Button asChild variant="secondary" size="sm">
                  <Link href={buildHref('donations', urlParams)}>Review donations</Link>
                </Button>
                <Button asChild variant="secondary" size="sm">
                  <Link href={buildHref('subscriptions', urlParams)}>Manage subscriptions</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">Integrations</CardTitle>
                <CardDescription>Stripe keys, email sender, and webhook health.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" size="sm">
                  <Link href="/app-admin/integrations">Open integration settings</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="catalogue" className="space-y-4">
          {catalogueContent}
        </TabsContent>

        <TabsContent value="donations" className="space-y-4">
          <DonationPaymentsTable payments={payments} />
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-4">
          <DonationSubscriptionsTable subscriptions={subscriptions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

