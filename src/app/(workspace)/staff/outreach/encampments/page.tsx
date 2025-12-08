import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { PageHeader } from '@shared/layout/page-header';
import { Card, CardContent } from '@shared/ui/card';
import { OutreachTabs } from '../outreach-tabs';

export const dynamic = 'force-dynamic';

export default async function EncampmentsPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessStaffWorkspace) {
    redirect(resolveLandingPath(access));
  }

  return (
    <div className="mx-auto w-full max-w-6xl flex flex-col gap-6 px-4 py-8 md:px-6">
      <div className="flex flex-col gap-3">
        <PageHeader
          eyebrow="Staff tools"
          title="Encampment list"
          description="Track encampment locations, contacts, and outreach visits."
        />
        <OutreachTabs />
      </div>
      <Card>
        <CardContent className="space-y-1 py-4 text-sm text-muted-foreground">
          <p>Stub for encampment tracking. Add map pins, contact details, and visit history once data is available.</p>
          <p>Remember to respect consent flags and capture audit events for updates.</p>
        </CardContent>
      </Card>
    </div>
  );
}
