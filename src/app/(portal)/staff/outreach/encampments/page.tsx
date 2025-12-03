import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function EncampmentsPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessStaffWorkspace) {
    redirect(resolveLandingPath(access));
  }

  return (
    <div className="page-shell page-stack">
      <PageHeader
        eyebrow="Staff tools"
        title="Encampment list"
        description="Track encampment locations, contacts, and outreach visits."
      />
      <Card>
        <CardContent className="space-y-space-2xs py-space-md text-body-md text-muted-foreground">
          <p>Stub for encampment tracking. Add map pins, contact details, and visit history once data is available.</p>
          <p>Remember to respect consent flags and capture audit events for updates.</p>
        </CardContent>
      </Card>
    </div>
  );
}

