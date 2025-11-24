import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';

export const dynamic = 'force-dynamic';

export default async function OrgHomePage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessOrgWorkspace) {
    redirect(resolveDefaultWorkspacePath(access));
  }

  const orgName = access.profile.organization_id ? access.profile.organization_id : 'your organization';

  const tasks = [
    {
      id: 'members',
      title: 'Members',
      description: 'Manage who can access STEVI for your organization, including org admins and representatives.',
      href: '/org/members',
      action: 'Manage members',
    },
    {
      id: 'invites',
      title: 'Invitations',
      description: 'Send or revoke invitations. Invites are locked to your organization by RLS.',
      href: '/org/invites',
      action: 'Open invitations',
    },
    {
      id: 'settings',
      title: 'Organization settings',
      description: 'Update your organization profile shown to IHARC staff. Platform admins approve any changes.',
      href: '/org/settings',
      action: 'View settings',
    },
  ];

  return (
    <div className="space-y-space-lg">
      <header className="space-y-space-xs">
        <p className="text-label-sm font-medium uppercase text-muted-foreground">Organization workspace</p>
        <h1 className="text-headline-lg text-on-surface">Manage {orgName}</h1>
        <p className="max-w-3xl text-body-md text-muted-foreground">
          Controls here are scoped to your organization. Role-based policies in Supabase ensure you cannot edit other
          organizations or system settings.
        </p>
      </header>

      <section className="grid gap-space-md md:grid-cols-3">
        {tasks.map((task) => (
          <Card key={task.id}>
            <CardHeader>
              <CardTitle className="text-title-md">{task.title}</CardTitle>
              <CardDescription>{task.description}</CardDescription>
            </CardHeader>
            <CardContent />
            <CardFooter>
              <Button asChild variant="outline" className="w-full">
                <Link href={task.href}>{task.action}</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </section>
    </div>
  );
}
