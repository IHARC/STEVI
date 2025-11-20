'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { InventoryBootstrap } from '@/lib/inventory/types';
import { InventoryDashboardSection } from './inventory-dashboard';
import { InventoryItemsSection } from './inventory-items';
import { InventoryLocationsSection } from './inventory-locations';
import { InventoryOrganizationsSection } from './inventory-organizations';
import { InventoryReceiptsSection } from './inventory-receipts';

type InventoryWorkspaceProps = {
  bootstrap: InventoryBootstrap;
  actorProfileId: string;
  canManageLocations: boolean;
};

const DEFAULT_TAB = 'dashboard';

export function InventoryWorkspace({ bootstrap, actorProfileId, canManageLocations }: InventoryWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<string>(DEFAULT_TAB);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex w-full flex-wrap justify-start gap-2 bg-transparent p-0">
          <TabsTrigger value="dashboard" className="rounded-full border px-4 py-1 text-body-md">
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="items" className="rounded-full border px-4 py-1 text-body-md">
            Items
          </TabsTrigger>
          <TabsTrigger value="locations" className="rounded-full border px-4 py-1 text-body-md">
            Locations
          </TabsTrigger>
          <TabsTrigger value="organizations" className="rounded-full border px-4 py-1 text-body-md">
            Organisations
          </TabsTrigger>
          <TabsTrigger value="receipts" className="rounded-full border px-4 py-1 text-body-md">
            Receipts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <InventoryDashboardSection dashboard={bootstrap.dashboard} />
        </TabsContent>

        <TabsContent value="items">
          <InventoryItemsSection
            items={bootstrap.items}
            locations={bootstrap.locations}
            organizations={bootstrap.organizations}
            categories={bootstrap.categories}
            actorProfileId={actorProfileId}
          />
        </TabsContent>

        <TabsContent value="locations">
          <InventoryLocationsSection
            locations={bootstrap.locations}
            actorProfileId={actorProfileId}
            canManageLocations={canManageLocations}
          />
        </TabsContent>

        <TabsContent value="organizations">
          <InventoryOrganizationsSection organizations={bootstrap.organizations} actorProfileId={actorProfileId} />
        </TabsContent>

        <TabsContent value="receipts">
          <InventoryReceiptsSection
            receipts={bootstrap.receipts}
            organizations={bootstrap.organizations}
            actorProfileId={actorProfileId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
