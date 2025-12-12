import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { PageHeader } from '@shared/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { EmptyState } from '@shared/ui/empty-state';
import { ensureInventoryActor } from '@/lib/inventory/auth';
import { fetchInventoryBootstrap } from '@/lib/inventory/service';
import { InventoryHub } from '@workspace/admin/inventory/inventory-hub';
import { AdminTabs } from '../admin-tabs';

export const dynamic = 'force-dynamic';

export default async function AdminInventoryPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessOpsSteviAdmin) {
    redirect(resolveLandingPath(access));
  }

  if (!access.canAccessInventoryOps) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-6">
        <PageHeader
          eyebrow="STEVI Admin"
          title="Inventory & Donations"
          description="Global inventory tools are not enabled for your role."
          primaryAction={{ label: 'Back to overview', href: '/ops/admin' }}
        />
        <AdminTabs />
        <EmptyState
          title="Inventory access required"
          description="Ask an IHARC super admin to grant inventory permissions."
        />
      </div>
    );
  }

  const { profile, roles } = await ensureInventoryActor(supabase);
  const bootstrap = await fetchInventoryBootstrap(supabase);
  const canManageLocations = roles.includes('iharc_admin');

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-6">
      <PageHeader
        eyebrow="STEVI Admin"
        title="Inventory & Donations"
        description="Global stock, receipts, and org participation."
        primaryAction={{ label: 'Back to overview', href: '/ops/admin' }}
      />

      <AdminTabs />

      <Card className="border-border/60">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">Inventory hub</CardTitle>
          <CardDescription>Manage stock, locations, organizations, and receipts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <InventoryHub bootstrap={bootstrap} actorProfileId={profile.id} canManageLocations={canManageLocations} />
        </CardContent>
      </Card>
    </div>
  );
}

