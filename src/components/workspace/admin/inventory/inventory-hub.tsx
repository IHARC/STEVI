'use client';

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
  activeTab: 'dashboard' | 'items' | 'locations' | 'organizations' | 'receipts';
};

export function InventoryHub({
  bootstrap,
  actorProfileId,
  canManageLocations,
  activeTab,
}: InventoryHubProps) {
  const searchParams = useSearchParams();

  const buildHref = (tab: InventoryHubProps['activeTab']) => {
    const params = new URLSearchParams(searchParams?.toString());
    if (tab === 'dashboard') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    const query = params.toString();
    return query ? `/ops/inventory?${query}` : '/ops/inventory';
  };

  return (
    <Tabs value={activeTab} className="space-y-3">
      <TabsList
        className={cn(
          'grid h-auto w-full grid-cols-2 gap-1 rounded-2xl sm:grid-cols-3',
          'lg:grid-cols-5',
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
    </Tabs>
  );
}
