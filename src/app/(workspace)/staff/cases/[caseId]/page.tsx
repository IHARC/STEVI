import { notFound, redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { fetchStaffCaseActivities, fetchStaffCaseDetail } from '@/lib/cases/fetchers';
import { staffAddCaseNoteAction } from '@/lib/cases/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Label } from '@shared/ui/label';
import { Textarea } from '@shared/ui/textarea';
import { Input } from '@shared/ui/input';
import { resolveLandingPath } from '@/lib/portal-navigation';

export const dynamic = 'force-dynamic';

type CaseProps = { params: Promise<{ caseId: string }> };

export default async function StaffCaseDetailPage({ params }: CaseProps) {
  const { caseId } = await params;
  const parsed = Number.parseInt(caseId, 10);
  if (!parsed || Number.isNaN(parsed)) notFound();

  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);
  if (!access) redirect(`/login?next=/staff/cases/${caseId}`);
  if (!access.canAccessStaffWorkspace) redirect(resolveLandingPath(access));

  const detail = await fetchStaffCaseDetail(supabase, parsed);
  if (!detail) notFound();

  const activities = await fetchStaffCaseActivities(supabase, detail.personId, 80);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Case #{detail.caseNumber ?? detail.id}</p>
          <h1 className="text-3xl text-foreground sm:text-4xl">{detail.caseType ?? 'Support case'}</h1>
          <p className="text-sm text-muted-foreground">Person ID: {detail.personId}</p>
        </div>
        <Badge variant={detail.status === 'active' ? 'default' : 'secondary'} className="capitalize">
          {detail.status ?? 'active'}
        </Badge>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Full timeline</CardTitle>
            <CardDescription>Activity is limited by RLS to what you are permitted to view.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity logged yet.</p>
            ) : (
              <ul className="space-y-3">
                {activities.map((item) => (
                  <li key={item.id} className="rounded-xl border border-border/30 bg-card p-4">
                    <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-base text-foreground">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.activityType}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.activityDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {item.createdByOrg ? (
                      <Badge variant="outline" className="border-border/70">
                        Created by {item.createdByOrg}
                      </Badge>
                    ) : null}
                    <Badge variant={item.sharedWithClient ? 'secondary' : 'outline'} className="border-border/70">
                      Visibility: {item.sharedWithClient ? 'Shared with client' : 'Internal'}
                    </Badge>
                  </div>
                  {item.description ? (
                    <p className="mt-1 text-sm text-foreground/80">{item.description}</p>
                  ) : null}
                </li>
              ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Add note</CardTitle>
            <CardDescription>Notes are internal to staff unless explicitly shared with the client elsewhere.</CardDescription>
          </CardHeader>
          <CardContent>
            <StaffNoteForm caseId={detail.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StaffNoteForm({ caseId }: { caseId: number }) {
  'use client';

  const action = staffAddCaseNoteAction;

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="case_id" value={caseId} />
      <div className="space-y-1">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required maxLength={160} placeholder="Brief note title" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="description">Details</Label>
        <Textarea id="description" name="description" rows={4} placeholder="Add context, steps, or outcomes." />
      </div>
      <Button type="submit" className="w-full">Save note</Button>
    </form>
  );
}
