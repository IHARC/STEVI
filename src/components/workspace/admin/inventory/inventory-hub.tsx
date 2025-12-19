'use client';

import { useSearchParams } from 'next/navigation';
import { PageTabNav, type PageTab } from '@shared/layout/page-tab-nav';
import type { InventoryBootstrap } from '@/lib/inventory/types';
import { InventoryDashboardSection } from './inventory-dashboard';
import { InventoryItemsSection } from './inventory-items';
import { InventoryLocationsSection } from './inventory-locations';
import { InventoryReceiptsSection } from './inventory-receipts';

type InventoryHubProps = {
  bootstrap: InventoryBootstrap;
  actorProfileId: string;
  canManageLocations: boolean;
  activeTab: 'dashboard' | 'items' | 'locations' | 'receipts';
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
    params.set('view', tab);
    const query = params.toString();
    return query ? `/ops/inventory?${query}` : `/ops/inventory?view=${tab}`;
  };

  return (
    <div className="space-y-3">
      <PageTabNav
        tabs={[
          { label: 'Dashboard', href: buildHref('dashboard') },
          { label: 'Items', href: buildHref('items') },
          { label: 'Locations', href: buildHref('locations') },
          { label: 'Receipts', href: buildHref('receipts') },
        ] satisfies PageTab[]}
        activeHref={buildHref(activeTab)}
      />

      {activeTab === 'dashboard' ? (
        <InventoryDashboardSection dashboard={bootstrap.dashboard} />
      ) : null}

      {activeTab === 'items' ? (
        <InventoryItemsSection
          items={bootstrap.items}
          locations={bootstrap.locations}
          organizations={bootstrap.organizations}
          actorProfileId={actorProfileId}
        />
      ) : null}

      {activeTab === 'locations' ? (
        <InventoryLocationsSection
          locations={bootstrap.locations}
          actorProfileId={actorProfileId}
          canManageLocations={canManageLocations}
        />
      ) : null}

      {activeTab === 'receipts' ? (
        <InventoryReceiptsSection
          receipts={bootstrap.receipts}
          organizations={bootstrap.organizations}
          actorProfileId={actorProfileId}
        />
      ) : null}
    </div>
  );
}
