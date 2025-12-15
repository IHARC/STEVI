import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensureInventoryActor } from '@/lib/inventory/auth';
import { fetchInventoryBootstrap } from '@/lib/inventory/service';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { PageHeader } from '@shared/layout/page-header';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/ui/card';
import { InventoryHub } from '@workspace/admin/inventory/inventory-hub';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function OpsSuppliesPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/login?next=/ops/supplies');
  }

  if (!access.canAccessInventoryOps && !access.canAccessOpsAdmin) {
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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Supplies"
        description="Stock summary, receipts, and (admin-only) donation catalogue listings."
        meta={[{ label: 'Inventory', tone: 'info' }, { label: 'Visit-first', tone: 'neutral' }]}
        actions={
          access.canAccessOpsSteviAdmin ? (
            <Button asChild variant="secondary" size="sm">
              <Link href="/ops/supplies/donations">Open donation catalogue</Link>
            </Button>
          ) : null
        }
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
