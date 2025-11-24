import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';
import { fetchOutreachLogs } from '@/lib/staff/fetchers';

export const dynamic = 'force-dynamic';

export default async function StaffOutreachLogPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessStaffWorkspace) {
    redirect(resolveDefaultWorkspacePath(access));
  }

  const logs = await fetchOutreachLogs(supabase, access.userId, 10);

  return (
    <div className="space-y-space-lg">
      <header className="space-y-space-2xs">
        <p className="text-label-sm font-semibold uppercase text-muted-foreground">Outreach</p>
        <h1 className="text-headline-lg text-on-surface">Field log</h1>
        <p className="max-w-3xl text-body-md text-muted-foreground">
          Capture quick outreach notes without navigating through the client portal. Sync this surface with Supabase
          edge functions once the schema for shared logs is finalised.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-title-md">Recent outreach</CardTitle>
          <CardDescription>Logged interactions scoped by RLS.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-space-sm text-body-sm text-on-surface/80">
          {logs.map((log) => (
            <article key={log.id} className="rounded-lg border border-outline/20 p-space-sm">
              <p className="font-medium text-on-surface">{log.title}</p>
              <p className="text-muted-foreground">{log.summary ?? 'Summary pending'}</p>
              <p className="text-label-sm text-muted-foreground">
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
