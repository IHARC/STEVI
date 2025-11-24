import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';

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
    id: 'inventory',
    title: 'Inventory workspace',
    description:
      'Track stock levels, receive donations, and manage partner organisations across IHARC locations.',
    actionLabel: 'Open inventory tools',
    href: '/admin/inventory',
  },
  {
    id: 'resources',
    title: 'Resource library',
    description:
      'Publish delegations, policy briefs, and outreach reports that power the marketing site and STEVI resources.',
    actionLabel: 'Manage resources',
    href: '/admin/resources',
  },
  {
    id: 'policies',
    title: 'Policies & procedures',
    description: 'Manage IHARC policies / SOPs for public transparency and STEVI client guidance in one place.',
    actionLabel: 'Manage policies',
    href: '/admin/policies',
  },
  {
    id: 'marketing-footer',
    title: 'Public site footer',
    description: 'Update the footer text displayed on every page of the public IHARC marketing site.',
    actionLabel: 'Edit footer copy',
    href: '/admin/marketing/footer',
  },
  {
    id: 'profile-verification',
    title: 'Profile verification queue',
    description:
      'Approve new agency and government partner requests so they can access STEVI documents and appointments.',
    actionLabel: 'Review pending profiles',
    href: '/admin/profiles',
  },
  {
    id: 'user-management',
    title: 'User management',
    description: 'Browse all clients, partners, and staff with filters, pagination, and role controls.',
    actionLabel: 'Manage users',
    href: '/admin/users',
  },
  {
    id: 'organizations',
    title: 'Organizations',
    description: 'Create and verify partner organizations. Org admins stay scoped to their own records.',
    actionLabel: 'Manage organizations',
    href: '/admin/organizations',
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
    href: '/admin/notifications',
  },
];

export default async function AdminPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/login?next=/admin');
  }

  if (!access.canAccessAdminWorkspace) {
    redirect(resolveDefaultWorkspacePath(access));
  }

  await ensurePortalProfile(supabase, access.userId);

  return (
    <div className="page-shell page-stack">
      <header className="flex flex-col gap-space-xs">
        <p className="text-label-sm font-medium uppercase text-muted-foreground">Team tools</p>
        <h1 className="text-headline-lg text-on-surface sm:text-display-sm">STEVI admin workspace</h1>
        <p className="max-w-3xl text-body-md text-muted-foreground sm:text-body-lg">
          Manage profile access, documents, and notifications for neighbours using the STEVI client portal. These tools
          mirror the admin capabilities that previously lived inside the marketing site.
        </p>
      </header>

      <section className="grid gap-space-md md:grid-cols-3">
        {adminTasks.map((task) => (
          <Card key={task.id}>
            <CardHeader>
              <CardTitle className="text-title-md">{task.title}</CardTitle>
              <CardDescription>{task.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild className="w-full">
                <Link href={task.href}>{task.actionLabel}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      <section id="resources">
        <Card>
          <CardHeader className="flex flex-col gap-space-sm sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-title-lg">Resource management</CardTitle>
              <CardDescription>
                Publish or update the reports and guides neighbours rely on. Changes sync to the marketing site and STEVI
                client resource directory.
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/resources">Open resource library</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-space-sm text-body-sm text-muted-foreground">
            <p>
              We migrated the resource management tools from the marketing repo. Use the resource library to create new
              posts, update drafts, and retire outdated content without leaving STEVI.
            </p>
            <p>
              Publishing here revalidates both the STEVI portal and the marketing experience so clients and the public
              see updates right away.
            </p>
          </CardContent>
        </Card>
      </section>

      <section id="profiles" className="grid gap-space-md lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-col gap-space-sm">
            <div>
              <CardTitle className="text-title-lg">Verification workspace</CardTitle>
              <CardDescription>
                Review pending agency and government affiliations, assign organizations, and refresh role claims in one place.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-space-sm text-body-sm text-muted-foreground">
            <p>
              Moderators can now approve or decline requests directly within STEVI. Approvals auto-refresh Supabase role claims,
              revalidate caches, and log every decision for auditing.
            </p>
            <ul className="list-disc space-y-space-xs pl-5">
              <li>Assign verified community organizations or government teams before approving.</li>
              <li>Automatically grant or revoke <code className="rounded bg-surface-container-low px-1">org_rep</code> roles.</li>
              <li>Keep partner history tidy by clearing requested organization/government details after review.</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline">
              <Link href="/admin/profiles">Open verification workspace</Link>
            </Button>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader className="flex flex-col gap-space-sm">
            <div>
              <CardTitle className="text-title-lg">Direct invitations</CardTitle>
              <CardDescription>
                Send secure invitations with optional context that lands in partners’ inboxes within seconds.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-space-sm text-body-sm text-muted-foreground">
            <p>
              The invitation form now lives in STEVI. It invokes the <code className="rounded bg-surface-container-low px-1">portal-admin-invite</code>{' '}
              Edge Function so Supabase audit logs stay intact and delivery mirrors the marketing site.
            </p>
            <p>Recent invitations appear alongside the form with status badges (pending, accepted, expired, cancelled) for quick follow-up.</p>
          </CardContent>
          <CardFooter>
            <Button asChild>
              <Link href="/admin/profiles">Manage invites</Link>
            </Button>
          </CardFooter>
        </Card>
      </section>

      <section id="documents">
        <Card>
          <CardHeader>
            <CardTitle className="text-title-lg">Document locker</CardTitle>
            <CardDescription>
              Upload files to the <code>portal-attachments</code> bucket with per-client expiry rules.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-space-sm text-body-sm text-muted-foreground">
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
            <CardTitle className="text-title-lg">Notifications</CardTitle>
            <CardDescription>
              Queue SMS or email notifications using the existing Supabase stored procedures.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-space-sm text-body-sm text-muted-foreground">
            <p>
              The notifications workspace now lives in STEVI. It calls <code className="rounded bg-surface-container-low px-1">portal_queue_notification</code> and triggers the{' '}
              <code className="rounded bg-surface-container-low px-1">portal-alerts</code> Edge Function automatically when delivery secrets are configured.
            </p>
            <p>
              Compose messages with HTML or JSON payloads, respect each profile’s consent flags, and review delivery logs pulled straight from{' '}
              <code className="rounded bg-surface-container-low px-1">portal.notifications</code>.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline">
              <Link href="/admin/notifications">Open notifications workspace</Link>
            </Button>
          </CardFooter>
        </Card>
      </section>
    </div>
  );
}
