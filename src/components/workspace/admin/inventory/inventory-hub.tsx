'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/ui/tabs';
import type { InventoryBootstrap } from '@/lib/inventory/types';
import { InventoryDashboardSection } from './inventory-dashboard';
import { InventoryItemsSection } from './inventory-items';
import { InventoryLocationsSection } from './inventory-locations';
import { InventoryOrganizationsSection } from './inventory-organizations';
import { InventoryReceiptsSection } from './inventory-receipts';
import { cn } from '@/lib/utils';

type InventoryHubProps = {
  bootstrap: InventoryBootstrap;
  actorProfileId: string;
  canManageLocations: boolean;
  activeTab: 'dashboard' | 'items' | 'locations' | 'organizations' | 'receipts' | 'donations';
  showDonationCatalogueTab?: boolean;
  donationCatalogueContent?: ReactNode;
};

export function InventoryHub({
  bootstrap,
  actorProfileId,
  canManageLocations,
  activeTab,
  showDonationCatalogueTab = false,
  donationCatalogueContent,
}: InventoryHubProps) {
  const searchParams = useSearchParams();
  const railColumns = showDonationCatalogueTab ? 'lg:grid-cols-6' : 'lg:grid-cols-5';

  const buildHref = (tab: InventoryHubProps['activeTab']) => {
    const params = new URLSearchParams(searchParams?.toString());
    if (tab === 'dashboard') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    const query = params.toString();
    return query ? `/ops/supplies?${query}` : '/ops/supplies';
  };

  return (
    <Tabs value={activeTab} className="space-y-3">
      <TabsList
        className={cn(
          'grid h-auto w-full grid-cols-2 gap-1 rounded-2xl sm:grid-cols-3',
          railColumns,
        )}
      >
        <TabsTrigger value="dashboard" asChild className="w-full rounded-xl px-3 text-xs font-semibold">
          <Link href={buildHref('dashboard')}>Dashboard</Link>
        </TabsTrigger>
        <TabsTrigger value="items" asChild className="w-full rounded-xl px-3 text-xs font-semibold">
          <Link href={buildHref('items')}>Items</Link>
        </TabsTrigger>
        <TabsTrigger value="locations" asChild className="w-full rounded-xl px-3 text-xs font-semibold">
          <Link href={buildHref('locations')}>Locations</Link>
        </TabsTrigger>
        <TabsTrigger value="organizations" asChild className="w-full rounded-xl px-3 text-xs font-semibold">
          <Link href={buildHref('organizations')}>Organisations</Link>
        </TabsTrigger>
        <TabsTrigger value="receipts" asChild className="w-full rounded-xl px-3 text-xs font-semibold">
          <Link href={buildHref('receipts')}>Receipts</Link>
        </TabsTrigger>
        {showDonationCatalogueTab ? (
          <TabsTrigger value="donations" asChild className="w-full rounded-xl px-3 text-xs font-semibold">
            <Link href={buildHref('donations')}>Donation catalogue</Link>
          </TabsTrigger>
        ) : null}
      </TabsList>

      <TabsContent value="dashboard" className="mt-0">
        <InventoryDashboardSection dashboard={bootstrap.dashboard} />
      </TabsContent>

      <TabsContent value="items" className="mt-0">
        <InventoryItemsSection
          items={bootstrap.items}
          locations={bootstrap.locations}
          organizations={bootstrap.organizations}
          actorProfileId={actorProfileId}
        />
      </TabsContent>

      <TabsContent value="locations" className="mt-0">
        <InventoryLocationsSection
          locations={bootstrap.locations}
          actorProfileId={actorProfileId}
          canManageLocations={canManageLocations}
        />
      </TabsContent>

      <TabsContent value="organizations" className="mt-0">
        <InventoryOrganizationsSection organizations={bootstrap.organizations} actorProfileId={actorProfileId} />
      </TabsContent>

      <TabsContent value="receipts" className="mt-0">
        <InventoryReceiptsSection
          receipts={bootstrap.receipts}
          organizations={bootstrap.organizations}
          actorProfileId={actorProfileId}
        />
      </TabsContent>

      {showDonationCatalogueTab ? (
        <TabsContent value="donations" className="mt-0">
          {donationCatalogueContent ?? (
            <div className="rounded-2xl border border-border/15 bg-background p-6 text-sm text-muted-foreground shadow-sm">
              Loading donation catalogue…
            </div>
          )}
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
