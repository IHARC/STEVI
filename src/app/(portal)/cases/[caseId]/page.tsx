import { notFound, redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { fetchClientCaseActivities, fetchClientCaseDetail } from '@/lib/cases/fetchers';
import { submitClientCaseUpdateAction } from '@/lib/cases/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';

export const dynamic = 'force-dynamic';

type CasePageProps = {
  params: Promise<{ caseId: string }>;
};

export default async function CaseDetailPage({ params }: CasePageProps) {
  const { caseId } = await params;
  const parsedId = Number.parseInt(caseId, 10);
  if (!parsedId || Number.isNaN(parsedId)) {
    notFound();
  }

  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);
  if (!access) redirect(`/login?next=/cases/${caseId}`);
  if (!access.isProfileApproved) {
    redirect(resolveDefaultWorkspacePath(access));
  }

  const detail = await fetchClientCaseDetail(supabase, access.userId, parsedId);
  if (!detail) notFound();

  const activities = await fetchClientCaseActivities(supabase, detail.personId, 25);

  return (
    <div className="page-shell page-stack">
      <header className="flex flex-col gap-space-2xs sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-space-2xs">
          <p className="text-label-sm font-semibold uppercase text-muted-foreground">Case #{detail.caseNumber ?? detail.id}</p>
          <h1 className="text-headline-lg text-on-surface sm:text-display-sm">{detail.caseType ?? 'Support case'}</h1>
          <p className="text-body-md text-muted-foreground">Managed by {detail.caseManagerName}</p>
        </div>
        <Badge variant={detail.status === 'active' ? 'default' : 'secondary'} className="capitalize">
          {detail.status ?? 'active'}
        </Badge>
      </header>

      <div className="grid gap-space-lg lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader className="space-y-space-2xs">
            <CardTitle className="text-title-md">Timeline</CardTitle>
            <CardDescription>Updates that your case manager marked as shareable with you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-space-md">
            {activities.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">No client-visible updates yet.</p>
            ) : (
              <ul className="space-y-space-sm">
                {activities.map((item) => (
                  <li key={item.id} className="rounded-xl border border-outline/30 bg-surface-container p-space-md">
                    <div className="flex items-center justify-between gap-space-sm">
                      <div>
                        <p className="text-title-sm text-on-surface">{item.title}</p>
                        <p className="text-body-sm text-muted-foreground">{item.activityType}</p>
                      </div>
                      <p className="text-label-sm text-muted-foreground">
                        {new Date(item.activityDate).toLocaleDateString()}
                      </p>
                    </div>
                    {item.description ? (
                      <p className="mt-space-2xs text-body-sm text-on-surface/80">{item.description}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="space-y-space-2xs">
            <CardTitle className="text-title-md">Send an update</CardTitle>
            <CardDescription>Share new info or changes. Your case manager will follow up using your consent settings.</CardDescription>
          </CardHeader>
          <CardContent>
            <ClientUpdateForm caseId={detail.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ClientUpdateForm({ caseId }: { caseId: number }) {
  'use client';

  const action = submitClientCaseUpdateAction;

  return (
    <form action={action} className="space-y-space-sm">
      <input type="hidden" name="case_id" value={caseId} />
      <div className="grid gap-space-2xs">
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" name="message" rows={4} placeholder="Share an update for your worker" required minLength={8} />
      </div>
      <Button type="submit" className="w-full">Send update</Button>
    </form>
  );
}
