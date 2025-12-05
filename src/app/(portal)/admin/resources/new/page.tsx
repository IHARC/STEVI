import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
import { ResourceForm } from '../resource-form';
import { createResourcePage } from '../actions';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { fetchResourceEnumOptions } from '@/lib/resources';

export const dynamic = 'force-dynamic';

export default async function AdminResourceNewPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/login?next=/admin/resources/new');
  }

  if (!access.canManageResources) {
    redirect(resolveLandingPath(access));
  }

  await ensurePortalProfile(supabase, access.userId);
  const enumOptions = await fetchResourceEnumOptions();

  return (
    <div className="mx-auto w-full max-w-6xl flex flex-col gap-6 px-4 py-8 md:px-6 text-foreground">
      <div className="mx-auto w-full max-w-[min(100%,52rem)] space-y-3">
        <Button asChild variant="ghost" className="w-fit">
          <Link href="/admin/resources">← Back to admin resources</Link>
        </Button>
        <h1 className="text-3xl">Create resource</h1>
        <p className="text-sm text-foreground/70">
          Publish delegations, data briefings, or policy notes so neighbours can co-design solutions with real-time context.
        </p>
      </div>

      <Card className="mx-auto w-full max-w-[min(100%,52rem)]">
        <CardHeader>
          <CardTitle className="text-xl">Compose new report or delegation</CardTitle>
          <CardDescription>
            Keep the tone compassionate and community-first. Verify all numbers and remind neighbours to call 911 during emergencies.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ResourceForm mode="create" action={createResourcePage} kindOptions={enumOptions.kinds} />
        </CardContent>
      </Card>
    </div>
  );
}
