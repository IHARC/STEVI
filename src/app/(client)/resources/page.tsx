import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { PageHeader } from '@shared/layout/page-header';
import { Card, CardContent } from '@shared/ui/card';

export const dynamic = 'force-dynamic';

export default async function ClientResourcesPage() {
  const supabase = await createSupabaseRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/resources');
  }

  await ensurePortalProfile(supabase, user.id);

  return (
    <div className="mx-auto w-full max-w-6xl flex flex-col gap-6 px-4 py-8 md:px-6">
      <PageHeader
        eyebrow="Client portal"
        title="Resources"
        description="Browse resources shared with you. This view will mirror the marketing catalogue with client-specific visibility."
      />
      <Card>
        <CardContent className="space-y-1 py-4 text-sm text-muted-foreground">
          <p>Resources will appear here once wired to Supabase content. Expect filters by topic, accessibility, and language.</p>
          <p>All entries should be sanitized before display and respect any consent or visibility flags.</p>
        </CardContent>
      </Card>
    </div>
  );
}

