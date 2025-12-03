import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function InventoryItemsPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessInventoryWorkspace) {
    redirect(resolveLandingPath(access));
  }

  return (
    <div className="page-shell page-stack">
      <PageHeader
        eyebrow="Inventory"
        title="Items & stock levels"
        description="Review stock balances by item and location. Connect this view to the inventory RPCs and storage when ready."
      />
      <Card>
        <CardContent className="space-y-space-2xs py-space-md text-body-md text-muted-foreground">
          <p>Wire this page to v_items_with_balances and existing inventory RPCs. Keep adjustments audited and RLS-compliant.</p>
          <p>Consider tabs for locations, categories, and recent transactions when implementing.</p>
        </CardContent>
      </Card>
    </div>
  );
}

