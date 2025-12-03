import { notFound, redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { fetchStaffCaseActivities, fetchStaffCaseDetail } from '@/lib/cases/fetchers';
import { staffAddCaseNoteAction } from '@/lib/cases/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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
    <div className="space-y-space-lg">
      <header className="flex flex-col gap-space-2xs sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-space-2xs">
          <p className="text-label-sm font-semibold uppercase text-muted-foreground">Case #{detail.caseNumber ?? detail.id}</p>
          <h1 className="text-headline-lg text-on-surface sm:text-display-sm">{detail.caseType ?? 'Support case'}</h1>
          <p className="text-body-md text-muted-foreground">Person ID: {detail.personId}</p>
        </div>
        <Badge variant={detail.status === 'active' ? 'default' : 'secondary'} className="capitalize">
          {detail.status ?? 'active'}
        </Badge>
      </header>

      <div className="grid gap-space-lg lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader className="space-y-space-2xs">
            <CardTitle className="text-title-md">Full timeline</CardTitle>
            <CardDescription>Activity is limited by RLS to what you are permitted to view.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-space-sm">
            {activities.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">No activity logged yet.</p>
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
            <CardTitle className="text-title-md">Add note</CardTitle>
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
    <form action={action} className="space-y-space-sm">
      <input type="hidden" name="case_id" value={caseId} />
      <div className="space-y-space-2xs">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required maxLength={160} placeholder="Brief note title" />
      </div>
      <div className="space-y-space-2xs">
        <Label htmlFor="description">Details</Label>
        <Textarea id="description" name="description" rows={4} placeholder="Add context, steps, or outcomes." />
      </div>
      <Button type="submit" className="w-full">Save note</Button>
    </form>
  );
}
