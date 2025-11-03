import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

type AdminTask = {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  href: string;
};

const adminTasks: AdminTask[] = [
  {
    id: 'profile-verification',
    title: 'Profile verification queue',
    description:
      'Approve new agency and government partner requests so they can access STEVI documents and appointments.',
    actionLabel: 'Review pending profiles',
    href: '#profiles',
  },
  {
    id: 'documents',
    title: 'Secure document locker',
    description: 'Upload or expire shared files. Use this to deliver housing documents or consent forms.',
    actionLabel: 'Open document tools',
    href: '#documents',
  },
  {
    id: 'notifications',
    title: 'Notifications & outreach',
    description: 'Send appointment reminders or community alerts. Messages sync with STEVI Ops activity logs.',
    actionLabel: 'Compose message',
    href: '#notifications',
  },
];

export default async function AdminPage() {
  const supabase = await createSupabaseRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/admin');
  }

  const profile = await ensurePortalProfile(supabase, user.id);
  if (!['moderator', 'admin'].includes(profile.role)) {
    redirect('/home');
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Team tools</p>
        <h1 className="text-3xl font-semibold text-on-surface sm:text-4xl">STEVI admin workspace</h1>
        <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
          Manage profile access, documents, and notifications for neighbours using the STEVI client portal. These tools
          mirror the admin capabilities that previously lived inside the marketing site.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {adminTasks.map((task) => (
          <Card key={task.id}>
            <CardHeader>
              <CardTitle className="text-lg">{task.title}</CardTitle>
              <CardDescription>{task.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild className="w-full">
                <a href={task.href}>{task.actionLabel}</a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      <section id="profiles" className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Pending verifications</CardTitle>
            <CardDescription>
              Approve or decline agency and government affiliation requests submitted by portal members.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Profile verification workflows will be migrated from the legacy portal shortly.</p>
            <p>
              Until then, continue to process requests using STEVI Ops. We will backfill this queue in the next sprint.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Invitations</CardTitle>
            <CardDescription>
              Send new invitations to agency partners directly from STEVI and track their status.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Invitation management is being migrated from the marketing repo. Documentation will land in{' '}
              <code className="rounded bg-surface-container px-2 py-1">docs/admin/invitations.md</code>.
            </p>
            <p>For now, continue to use the existing Supabase function or STEVI Ops interface.</p>
          </CardContent>
        </Card>
      </section>

      <section id="documents">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Document locker</CardTitle>
            <CardDescription>
              Upload files to the <code>portal-attachments</code> bucket with per-client expiry rules.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Document tools will surface here as we migrate the moderation and attachment flows.</p>
            <p>
              In the interim, use the STEVI Ops attachment uploader. We’ll wire this page to the same Supabase edge
              functions so clients can receive files in their locker.
            </p>
          </CardContent>
        </Card>
      </section>

      <section id="notifications">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Notifications</CardTitle>
            <CardDescription>
              Queue SMS or email notifications using the existing Supabase stored procedures.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              We will migrate notification templates and delivery controls from the marketing repo. This section stays as
              a placeholder until the stored procedures are exposed here.
            </p>
            <p>
              Remember to respect consent preferences captured on each profile. Use the profile page to confirm opt-in
              status before sending alerts.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
