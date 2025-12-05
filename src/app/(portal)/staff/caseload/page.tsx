import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { fetchStaffCaseload } from '@/lib/staff/fetchers';

export const dynamic = 'force-dynamic';

export default async function StaffCaseloadPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessStaffWorkspace) {
    redirect(resolveLandingPath(access));
  }

  const caseload = await fetchStaffCaseload(supabase, access.userId);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Caseload</p>
        <h1 className="text-3xl text-foreground">Active cases</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Focus view for IHARC staff and volunteers. Sync this list with STEVI Ops once the API contract is finalised.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {caseload.map((item) => (
          <Card key={item.id} className="h-full">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div className="space-y-0.5">
                <CardTitle className="text-lg">{item.clientName}</CardTitle>
                <CardDescription>{item.nextStep ?? 'Next step pending'}</CardDescription>
              </div>
              <Badge variant={item.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                {item.status}
              </Badge>
            </CardHeader>
            <CardContent className="text-sm text-foreground/80">
              <p>RLS gating restricts this list to the staff member’s org and role.</p>
            </CardContent>
          </Card>
        ))}
        {caseload.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">No active cases</CardTitle>
              <CardDescription>Cases assigned to you will appear here automatically.</CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
