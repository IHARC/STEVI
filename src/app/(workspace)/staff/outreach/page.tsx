import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { fetchOutreachLogs } from '@/lib/staff/fetchers';
import { OutreachTabs } from './outreach-tabs';

export const dynamic = 'force-dynamic';

export default async function StaffOutreachLogPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessStaffWorkspace) {
    redirect(resolveLandingPath(access));
  }

  const logs = await fetchOutreachLogs(supabase, access.userId, 10);

  return (
    <div className="mx-auto w-full max-w-6xl flex flex-col gap-6 px-4 py-8 md:px-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Outreach</p>
          <h1 className="text-3xl text-foreground">Field operations</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Capture notes and coordinate outreach in one workspace.
          </p>
        </div>
        <OutreachTabs />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent outreach</CardTitle>
          <CardDescription>Logged interactions scoped by RLS.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-foreground/80">
          {logs.map((log) => (
            <article key={log.id} className="rounded-lg border border-border/40 p-3">
              <p className="font-medium text-foreground">{log.title}</p>
              <p className="text-muted-foreground">{log.summary ?? 'Summary pending'}</p>
              <p className="text-xs text-muted-foreground">
                {log.location ? `${log.location} · ` : ''}
                {log.occurredAt}
              </p>
            </article>
          ))}
          {logs.length === 0 ? (
            <p className="text-muted-foreground">No outreach entries yet. Capture new interactions to see them here.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
