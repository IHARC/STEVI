import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import type { SupabaseRSCClient } from '@/lib/supabase/types';
import { loadPortalAccess } from '@/lib/portal-access';
import { PageHeader } from '@shared/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { resolveLandingPath } from '@/lib/portal-navigation';

export const dynamic = 'force-dynamic';

type VisitPanel = {
  id: string;
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
  badge?: string;
  gated?: (access: Awaited<ReturnType<typeof loadPortalAccess>>) => boolean;
};

const PANELS: VisitPanel[] = [
  {
    id: 'notes',
        title: 'Notes',
        description: 'Capture Visit context, observations, and client requests. Notes will stay inside the Visit record.',
        ctaLabel: 'Coming soon',
        href: '#',
      },
  {
    id: 'tasks',
    title: 'Tasks',
    description: 'Assign follow-ups to yourself or teammates. Keep them inside the Visit to avoid orphaned work.',
        ctaLabel: 'Coming soon',
        href: '#',
      },
  {
    id: 'appointments',
    title: 'Appointments',
    description: 'Schedule or log appointments tied to this Visit. Maintain a single source for location and program context.',
        ctaLabel: 'Coming soon',
        href: '#',
      },
  {
    id: 'supplies',
    title: 'Supplies used',
    description: 'Record any items provided during the Visit. Inventory adjustments are driven by supplies logged here.',
        ctaLabel: 'Coming soon',
        href: '#',
        badge: 'Stock adjusts from Visit',
        gated: (access) => access?.canAccessInventoryWorkspace ?? false,
      },
  {
    id: 'referrals',
    title: 'Referrals',
    description: 'Create referrals from the Visit so Partners can see provenance. Directory/config lives under Partners.',
        ctaLabel: 'Coming soon',
        href: '#',
      },
  {
    id: 'attachments',
    title: 'Attachments',
    description: 'Upload documents or photos directly to the Visit. Keep visibility aligned with consent.',
        ctaLabel: 'Coming soon',
        href: '#',
      },
  {
    id: 'clinical',
    title: 'Clinical / Justice (role-gated)',
    description: 'Add vitals, clinical notes, or justice-related flags where permitted. Hidden for roles without clearance.',
        ctaLabel: 'Coming soon',
        href: '#',
        gated: (access) => access?.canAccessStaffWorkspace ?? false,
      },
    ];

export default async function NewVisitPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase as SupabaseRSCClient);

  if (!access) {
    redirect('/login?next=/workspace/visits/new');
  }

  if (!access.canAccessAdminWorkspace && !access.canAccessStaffWorkspace && !access.canAccessOrgWorkspace) {
    redirect(resolveLandingPath(access));
  }

  const orgLabel = access.organizationName ?? 'Unassigned org';
  const logHref = '/workspace/today';

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 md:px-6">
      <PageHeader
        eyebrow="Visit"
        title="New Visit"
        description="Use this Visit workspace to keep notes, tasks, referrals, and supplies together. Frontline work stays inside the Visit."
        meta={[
          { label: `Created by ${orgLabel}`, tone: 'neutral' },
          { label: 'Visibility: Org', tone: 'info' },
        ]}
        primaryAction={{ label: 'Start logging', href: logHref }}
        secondaryAction={{ label: 'Back to Today', href: '/workspace/today' }}
        breadcrumbs={[{ label: 'Today', href: '/workspace/today' }, { label: 'New Visit' }]}
      />

      <Card className="border-dashed border-border/70">
        <CardHeader>
          <CardTitle className="text-xl">Visit creation</CardTitle>
          <CardDescription>Start the Visit to capture notes, supplies, referrals, and tasks together. Supplies and referrals stay inside the Visit context.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
          <Button asChild className="w-full md:w-auto">
            <Link href={logHref}>Open Today</Link>
          </Button>
          <Button asChild variant="outline" className="w-full md:w-auto">
            <Link href="/workspace/clients">Find a client</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {PANELS.filter((panel) => !panel.gated || panel.gated(access)).map((panel) => (
          <Card key={panel.id} className="h-full border-border/70">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-lg">{panel.title}</CardTitle>
                {panel.badge ? <Badge variant="secondary">{panel.badge}</Badge> : null}
              </div>
              <CardDescription className="text-sm text-muted-foreground">{panel.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-foreground/80">
              <Button asChild variant="outline" className="w-full">
                <Link href={panel.href}>{panel.ctaLabel}</Link>
              </Button>
              <p className="text-xs text-muted-foreground">Keep consent and sharing aligned; Visit history should show who created each action.</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
