import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function MessagesPage() {
  const supabase = await createSupabaseRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/messages');
  }

  await ensurePortalProfile(supabase, user.id);

  return (
    <div className="page-shell page-stack">
      <PageHeader
        eyebrow="Client portal"
        title="Messages"
        description="Stay in touch with outreach staff. Secure messages will appear here once wired to the messaging backend."
      />
      <Card>
        <CardContent className="space-y-space-2xs py-space-md text-body-md text-muted-foreground">
          <p>Messaging is coming soon. For now, use Support to reach the team or reply to SMS notifications.</p>
          <p>When implemented, messages should respect consent flags and use sanitized rich text.</p>
        </CardContent>
      </Card>
    </div>
  );
}
