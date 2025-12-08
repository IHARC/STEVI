import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { PageHeader } from '@shared/layout/page-header';
import { Card, CardContent } from '@shared/ui/card';

export const dynamic = 'force-dynamic';

export default async function DonationsMappingPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessInventoryWorkspace) {
    redirect(resolveLandingPath(access));
  }

  return (
    <div className="mx-auto w-full max-w-6xl flex flex-col gap-6 px-4 py-8 md:px-6">
      <PageHeader
        eyebrow="Inventory"
        title="Donations mapping"
        description="Link incoming donations to inventory items and locations. Align this with the donations catalogue and RLS."
      />
      <Card>
        <CardContent className="space-y-1 py-4 text-sm text-muted-foreground">
          <p>Stub for mapping donation records to inventory items. Surface unmatched donations, proposed mappings, and audit notes.</p>
          <p>Ensure updates respect consent flags and log actions via the existing audit function when implemented.</p>
        </CardContent>
      </Card>
    </div>
  );
}

