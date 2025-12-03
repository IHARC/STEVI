import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function DonationsMappingPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessInventoryWorkspace) {
    redirect(resolveLandingPath(access));
  }

  return (
    <div className="page-shell page-stack">
      <PageHeader
        eyebrow="Inventory"
        title="Donations mapping"
        description="Link incoming donations to inventory items and locations. Align this with the donations catalogue and RLS."
      />
      <Card>
        <CardContent className="space-y-space-2xs py-space-md text-body-md text-muted-foreground">
          <p>Stub for mapping donation records to inventory items. Surface unmatched donations, proposed mappings, and audit notes.</p>
          <p>Ensure updates respect consent flags and log actions via the existing audit function when implemented.</p>
        </CardContent>
      </Card>
    </div>
  );
}

