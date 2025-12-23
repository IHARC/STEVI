import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import type { SupabaseRSCClient } from '@/lib/supabase/types';
import { loadPortalAccess } from '@/lib/portal-access';
import { PageHeader } from '@shared/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Button } from '@shared/ui/button';
import { resolveLandingPath } from '@/lib/portal-navigation';

export const dynamic = 'force-dynamic';

export default async function NewVisitPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase as SupabaseRSCClient);

  if (!access) {
    redirect('/auth/start?next=/ops/visits/new');
  }

  if (!access.canAccessOpsAdmin && !access.canAccessOpsFrontline && !access.canAccessOpsOrg) {
    redirect(resolveLandingPath(access));
  }

  const canStartVisit = access.canAccessOpsAdmin || access.canAccessOpsFrontline;
  const orgMissing = canStartVisit && !access.organizationId;
  const orgSelectionHref = '/ops/profile';
  const orgOptionsCount = access.actingOrgChoicesCount;

  if (orgMissing) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Visit"
          title="Select an acting organization"
          description="Choose your organization before starting a Visit. This keeps provenance, referrals, and supplies tied to the right tenant."
          primaryAction={{ label: 'Select organization', href: orgSelectionHref }}
          secondaryAction={{ label: 'Back to Today', href: '/ops/today' }}
          meta={[
            { label: orgOptionsCount && orgOptionsCount > 1 ? 'Multiple orgs available' : 'Org required', tone: 'warning' },
          ]}
          breadcrumbs={[{ label: 'Today', href: '/ops/today' }, { label: 'New Visit' }]}
        />

        <Card className="border-dashed border-border/70">
          <CardHeader>
            <CardTitle className="text-xl">Set acting org to continue</CardTitle>
            <CardDescription>Visit creation is blocked until you pick which organization you’re acting on behalf of.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-foreground/80">
            <p>Pick your acting org from account settings (or use the Acting org switcher in the header). This ensures every Visit, referral, and supply adjustment records provenance.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild className="flex-1">
                <Link href={orgSelectionHref}>Open account settings</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/ops/today">Return to Today</Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">If you only have one organization, we’ll auto-select it next time you sign in.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const orgLabel = access.organizationName ?? 'Unassigned org';
  const logHref = '/ops/today';

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Visit"
        title="New Visit"
        description="Use this Visit flow to keep notes, tasks, referrals, and supplies together. Frontline work stays inside the Visit."
        meta={[
          { label: `Created by ${orgLabel}`, tone: 'neutral' },
          { label: 'Visibility: Org', tone: 'info' },
        ]}
        primaryAction={{ label: 'Start logging', href: logHref }}
        secondaryAction={{ label: 'Back to Today', href: '/ops/today' }}
        breadcrumbs={[{ label: 'Today', href: '/ops/today' }, { label: 'New Visit' }]}
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
            <Link href="/ops/clients?view=directory">Find a client</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-xl">Visit actions available now</CardTitle>
          <CardDescription>Stay on the visit-first rail using the Ops tools that are live today.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-foreground/80">
          <ul className="space-y-2 text-muted-foreground">
            <li>
              <Link href="/ops/today" className="font-semibold text-foreground hover:underline">Open Today</Link>
              {' '}to start or resume a Visit with your acting org applied.
            </li>
            <li>
              <Link href="/ops/clients?view=directory" className="font-semibold text-foreground hover:underline">Find or create a person</Link>
              {' '}to anchor the Visit and keep intake aligned to your org.
            </li>
            <li>
              <Link href="/ops/programs?view=overview" className="font-semibold text-foreground hover:underline">Check programs & shifts</Link>
              {' '}before logging so Visits capture the right context.
            </li>
            <li>
              <Link href="/ops/inventory?view=dashboard" className="font-semibold text-foreground hover:underline">Review inventory</Link>
              {' '}to prep stock and keep Visit adjustments in sync with inventory controls.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
