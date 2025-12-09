import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensureInventoryActor } from '@/lib/inventory/auth';
import { fetchInventoryBootstrap } from '@/lib/inventory/service';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { PageHeader } from '@shared/layout/page-header';
import { Badge } from '@shared/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { InventoryHub } from '@workspace/admin/inventory/inventory-hub';

export const dynamic = 'force-dynamic';

export default async function WorkspaceSuppliesPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/login?next=/workspace/supplies');
  }

  if (!access.canAccessInventoryWorkspace && !access.canAccessAdminWorkspace) {
    redirect(resolveLandingPath(access));
  }

  const { profile, roles } = await ensureInventoryActor(supabase, true);

  if (!profile) {
    redirect(resolveLandingPath(access));
  }

  const bootstrap = await fetchInventoryBootstrap(supabase);
  const canManageLocations = roles.includes('iharc_admin');
  const lowStockCount = bootstrap.dashboard.summary.lowStockCount;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-6">
      <PageHeader
        eyebrow="Workspace"
        title="Supplies"
        description="Stock summary, donations, and reconciliation. Giving items must be logged from a Visit."
        meta={[{ label: 'Inventory + donations', tone: 'info' }, { label: 'Visit-first', tone: 'neutral' }]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Items" value={bootstrap.dashboard.summary.totalItems.toLocaleString()} hint="Active SKUs" />
        <SummaryCard label="Low stock" value={lowStockCount.toLocaleString()} hint="Address before visits" tone={lowStockCount > 0 ? 'warning' : 'default'} />
        <SummaryCard label="On hand" value={bootstrap.dashboard.summary.totalOnHand.toLocaleString()} hint="Across locations" />
      </div>

      <InventoryHub bootstrap={bootstrap} actorProfileId={profile.id} canManageLocations={canManageLocations} />
    </div>
  );
}

function SummaryCard({ label, value, hint, tone = 'default' }: { label: string; value: string; hint: string; tone?: 'default' | 'warning' }) {
  return (
    <Card className="border-border/60">
      <CardHeader className="flex items-center justify-between gap-2">
        <CardTitle className="text-lg">{label}</CardTitle>
        <Badge variant={tone === 'warning' ? 'destructive' : 'secondary'} className="capitalize">{tone === 'warning' ? 'Attention' : 'Healthy'}</Badge>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
