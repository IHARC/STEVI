'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/ui/tabs';
import type { InventoryBootstrap } from '@/lib/inventory/types';
import { InventoryDashboardSection } from './inventory-dashboard';
import { InventoryItemsSection } from './inventory-items';
import { InventoryLocationsSection } from './inventory-locations';
import { InventoryOrganizationsSection } from './inventory-organizations';
import { InventoryReceiptsSection } from './inventory-receipts';

type InventoryHubProps = {
  bootstrap: InventoryBootstrap;
  actorProfileId: string;
  canManageLocations: boolean;
};

const DEFAULT_TAB = 'dashboard';

export function InventoryHub({ bootstrap, actorProfileId, canManageLocations }: InventoryHubProps) {
  const [activeTab, setActiveTab] = useState<string>(DEFAULT_TAB);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
      <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-2xl sm:grid-cols-3 lg:grid-cols-5">
        <TabsTrigger value="dashboard" className="w-full rounded-xl px-3 text-xs font-semibold">
            Dashboard
        </TabsTrigger>
        <TabsTrigger value="items" className="w-full rounded-xl px-3 text-xs font-semibold">
            Items
        </TabsTrigger>
        <TabsTrigger value="locations" className="w-full rounded-xl px-3 text-xs font-semibold">
            Locations
        </TabsTrigger>
        <TabsTrigger value="organizations" className="w-full rounded-xl px-3 text-xs font-semibold">
            Organisations
        </TabsTrigger>
        <TabsTrigger value="receipts" className="w-full rounded-xl px-3 text-xs font-semibold">
            Receipts
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
