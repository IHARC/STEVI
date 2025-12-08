import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { PageHeader } from '@shared/layout/page-header';
import { Card, CardContent } from '@shared/ui/card';

export const dynamic = 'force-dynamic';

export default async function InventoryItemsPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessInventoryWorkspace) {
    redirect(resolveLandingPath(access));
  }

  return (
    <div className="mx-auto w-full max-w-6xl flex flex-col gap-6 px-4 py-8 md:px-6">
      <PageHeader
        eyebrow="Inventory"
        title="Items & stock levels"
        description="Review stock balances by item and location. Connect this view to the inventory RPCs and storage when ready."
      />
      <Card>
        <CardContent className="space-y-1 py-4 text-sm text-muted-foreground">
          <p>Wire this page to v_items_with_balances and existing inventory RPCs. Keep adjustments audited and RLS-compliant.</p>
          <p>Consider tabs for locations, categories, and recent transactions when implementing.</p>
        </CardContent>
      </Card>
    </div>
  );
}

