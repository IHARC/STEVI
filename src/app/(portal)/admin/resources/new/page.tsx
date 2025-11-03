import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { ResourceForm } from '../resource-form';
import { createResourcePage } from '../actions';

export const dynamic = 'force-dynamic';

export default async function AdminResourceNewPage() {
  const supabase = await createSupabaseRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/admin/resources/new');
  }

  const profile = await ensurePortalProfile(supabase, user.id);
  if (profile.role !== 'admin') {
    redirect('/home');
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10 text-on-surface">
      <div className="flex flex-col gap-3">
        <Button asChild variant="ghost" className="w-fit">
          <Link href="/admin/resources">← Back to admin resources</Link>
        </Button>
        <h1 className="text-3xl font-semibold">Create resource</h1>
        <p className="text-sm text-on-surface/70">
          Publish delegations, data briefings, or policy notes so neighbours can co-design solutions with real-time context.
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Compose new report or delegation</CardTitle>
          <CardDescription>
            Keep the tone compassionate and community-first. Verify all numbers and remind neighbours to call 911 during emergencies.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <ResourceForm mode="create" profileId={profile.id} action={createResourcePage} />
        </CardContent>
      </Card>
    </div>
  );
}
