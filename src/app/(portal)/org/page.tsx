import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';
import { fetchOrgInvites, fetchOrgMembersWithRoles, type OrgInviteRecord, type OrgMemberRecord } from '@/lib/org/fetchers';
import type { Database } from '@/types/supabase';
import { WorkspacePageHeader } from '@/components/layout/workspace-page-header';
import { StatTile } from '@/components/ui/stat-tile';

export const dynamic = 'force-dynamic';

const dateFormatter = new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short' });

type OrganizationRow = Pick<
  Database['core']['Tables']['organizations']['Row'],
  | 'id'
  | 'name'
  | 'status'
  | 'partnership_type'
  | 'organization_type'
  | 'website'
  | 'contact_email'
  | 'contact_phone'
  | 'contact_person'
  | 'contact_title'
  | 'is_active'
  | 'updated_at'
>;

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  active: 'default',
  pending: 'outline',
  under_review: 'outline',
  inactive: 'secondary',
};

function formatDate(value: string | null) {
  if (!value) return 'Not yet seen';
  try {
    return dateFormatter.format(new Date(value));
  } catch {
    return value;
  }
}

export default async function OrgHomePage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessOrgWorkspace || !access.organizationId) {
    redirect(resolveDefaultWorkspacePath(access));
  }

  const members: OrgMemberRecord[] = await fetchOrgMembersWithRoles(supabase, access.organizationId);
  const invites: OrgInviteRecord[] = await fetchOrgInvites(supabase, access.organizationId, 30);
  const organizationResult = await supabase
    .schema('core')
    .from('organizations')
    .select(
      'id, name, status, partnership_type, organization_type, website, contact_email, contact_phone, contact_person, contact_title, is_active, updated_at',
    )
    .eq('id', access.organizationId)
    .maybeSingle();

  if (organizationResult.error) {
    throw organizationResult.error;
  }

  const organization = (organizationResult.data ?? null) as OrganizationRow | null;

  const approvedMembers = members.filter((member) => member.affiliation_status === 'approved');
  const adminCount = members.filter((member) => member.portal_roles.includes('portal_org_admin')).length;
  const repCount = members.filter((member) => member.portal_roles.includes('portal_org_rep')).length;
  const pendingInvites = invites.filter((invite) => invite.status === 'pending').length;

  const lastSeenTimestamp = approvedMembers.reduce((latest, member) => {
    const ts = member.last_seen_at ? Date.parse(member.last_seen_at) : 0;
    return Number.isNaN(ts) ? latest : Math.max(latest, ts);
  }, 0);

  const orgName = organization?.name ?? 'your organization';
  const lastSeenLabel = lastSeenTimestamp ? formatDate(new Date(lastSeenTimestamp).toISOString()) : 'No recent activity';

  type OrgSummaryCard = { id: string; label: string; value: string; tone?: 'default' | 'warning' | 'info' };

  const summaryCards: OrgSummaryCard[] = [
    { id: 'members', label: 'Approved members', value: approvedMembers.length.toLocaleString() },
    { id: 'admins', label: 'Org admins', value: adminCount.toLocaleString() },
    { id: 'reps', label: 'Org reps', value: repCount.toLocaleString() },
    {
      id: 'invites',
      label: 'Pending invites',
      value: pendingInvites.toLocaleString(),
      tone: pendingInvites > 0 ? 'warning' : 'default',
    },
  ];

  const recentActivity = approvedMembers
    .map((member) => ({
      ...member,
      lastSeenDate: member.last_seen_at ? new Date(member.last_seen_at) : null,
    }))
    .sort((a, b) => (b.lastSeenDate?.getTime() ?? 0) - (a.lastSeenDate?.getTime() ?? 0))
    .slice(0, 5);

  const accessHealth: { id: string; message: string; tone: 'warning' | 'info' | 'ok' }[] = [];
  if (adminCount === 0) {
    accessHealth.push({ id: 'no-admin', message: 'Add at least one org admin to keep access resilient.', tone: 'warning' });
  }
  if (repCount === 0) {
    accessHealth.push({ id: 'no-rep', message: 'Assign an org rep who can liaise with IHARC and manage invites.', tone: 'info' });
  }
  if (!organization?.contact_email) {
    accessHealth.push({ id: 'contact', message: 'Add a contact email so staff can reach your team quickly.', tone: 'info' });
  }
  if (lastSeenTimestamp === 0) {
    accessHealth.push({ id: 'no-activity', message: 'No member has signed in yet.', tone: 'warning' });
  }

  return (
    <div className="page-shell page-stack">
      <WorkspacePageHeader
        eyebrow="Organization workspace"
        title={`Manage ${orgName}`}
        description="Track how your team is using STEVI, keep member access healthy, and jump into invites or settings without leaving the organization workspace. All data respects Supabase RLS for your organization."
        primaryAction={{ label: 'Invite members', href: '/org/invites' }}
        secondaryAction={{ label: 'Manage members', href: '/org/members' }}
      >
        <div className="flex flex-wrap gap-space-xs">
          {organization?.status ? (
            <Badge variant={STATUS_VARIANT[organization.status] ?? 'outline'} className="capitalize">
              {organization.status.replaceAll('_', ' ')}
            </Badge>
          ) : null}
          <Badge variant="secondary" className="capitalize">
            {access.portalRoles.includes('portal_org_admin') ? 'Org admin' : 'Org representative'}
          </Badge>
        </div>
      </WorkspacePageHeader>

      <section className="grid gap-space-sm sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <StatTile key={card.id} label={card.label} value={card.value} tone={card.tone} />
        ))}
      </section>

      <section className="grid gap-space-md lg:grid-cols-[2fr,1fr]">
        <Card className="h-full">
          <CardHeader className="flex items-start justify-between gap-space-sm">
            <div>
              <CardTitle className="text-title-lg">Recent member activity</CardTitle>
              <CardDescription>Most recent sign-ins from approved members.</CardDescription>
            </div>
            <Badge variant="secondary">Last seen {lastSeenLabel}</Badge>
          </CardHeader>
          <CardContent className="space-y-space-sm">
            {recentActivity.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">No member activity yet.</p>
            ) : (
              <ul className="divide-y divide-outline/15">
                {recentActivity.map((member) => (
                  <li key={member.id} className="flex items-center justify-between gap-space-sm py-space-sm">
                    <div className="space-y-space-2xs">
                      <p className="text-body-md font-medium text-on-surface">{member.display_name}</p>
                      <p className="text-label-sm text-muted-foreground">
                        {member.position_title ?? 'Team member'}
                      </p>
                      <div className="flex flex-wrap gap-space-2xs text-label-sm text-muted-foreground">
                        {member.portal_roles.map((role) => (
                          <Badge key={role} variant="outline" className="capitalize">
                            {role.replaceAll('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-right text-label-sm text-muted-foreground">
                      <p className="font-medium text-on-surface">{formatDate(member.last_seen_at)}</p>
                      <p>Last seen</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-title-lg">Access health</CardTitle>
            <CardDescription>Keep at least one admin and a clear contact on file.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-space-sm">
            {accessHealth.length === 0 ? (
              <div className="rounded-2xl border border-outline/12 bg-surface-container-high px-space-md py-space-sm text-body-sm text-on-surface">
                <p className="font-medium">All set</p>
                <p className="text-muted-foreground">You have admins, reps, and contact details in place.</p>
              </div>
            ) : (
              <ul className="space-y-space-xs">
                {accessHealth.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-space-sm rounded-2xl border border-outline/12 bg-surface-container-high px-space-md py-space-sm"
                  >
                    <Badge variant={item.tone === 'warning' ? 'destructive' : 'secondary'} className="mt-0.5">
                      {item.tone === 'warning' ? 'Action' : 'Info'}
                    </Badge>
                    <p className="text-body-sm text-on-surface">{item.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-space-md lg:grid-cols-[1.2fr,1fr]">
        <Card className="h-full">
          <CardHeader className="flex items-center justify-between gap-space-sm">
            <div>
              <CardTitle className="text-title-lg">Invite pipeline</CardTitle>
              <CardDescription>Recent invitations scoped to your organization.</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/org/invites">Open invitations</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-space-sm">
            {invites.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">No invites sent yet.</p>
            ) : (
              <ul className="divide-y divide-outline/15">
                {invites.slice(0, 6).map((invite) => (
                  <InviteListItem key={invite.id} invite={invite} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-title-lg">Organization snapshot</CardTitle>
            <CardDescription>Contact and status details staff can reference.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-space-sm text-body-sm text-on-surface">
            <div className="grid gap-space-xs">
              <p className="font-medium">Status</p>
              <div className="flex flex-wrap gap-space-2xs text-label-sm text-muted-foreground">
                {organization?.status ? (
                  <Badge variant={STATUS_VARIANT[organization.status] ?? 'outline'} className="capitalize">
                    {organization.status.replaceAll('_', ' ')}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">Unknown</span>
                )}
                {organization?.updated_at ? (
                  <span className="text-muted-foreground">Updated {formatDate(organization.updated_at)}</span>
                ) : null}
              </div>
            </div>

            <div className="grid gap-space-2xs">
              <p className="font-medium">Contact</p>
              <p className="text-muted-foreground">
                {organization?.contact_person ?? 'Not provided'}
                {organization?.contact_title ? `, ${organization.contact_title}` : ''}
              </p>
              <p className="text-muted-foreground">{organization?.contact_email ?? 'Add contact email'}</p>
              <p className="text-muted-foreground">{organization?.contact_phone ?? 'Add contact phone'}</p>
            </div>

            <div className="grid gap-space-2xs">
              <p className="font-medium">Org type</p>
              <p className="text-muted-foreground capitalize">
                {organization?.organization_type?.replaceAll('_', ' ') ?? 'Not set'}
              </p>
            </div>

            <div className="grid gap-space-2xs">
              <p className="font-medium">Partnership</p>
              <p className="text-muted-foreground capitalize">
                {organization?.partnership_type?.replaceAll('_', ' ') ?? 'Not set'}
              </p>
            </div>

            <div className="grid gap-space-2xs">
              <p className="font-medium">Website</p>
              {organization?.website ? (
                <a
                  href={organization.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {organization.website}
                </a>
              ) : (
                <p className="text-muted-foreground">Add a website in settings.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function InviteListItem({ invite }: { invite: OrgInviteRecord }) {
  const statusVariant = invite.status === 'pending' ? 'secondary' : invite.status === 'accepted' ? 'default' : 'outline';

  return (
    <li className="flex items-start justify-between gap-space-sm py-space-sm">
      <div className="space-y-space-2xs">
        <p className="text-body-md font-medium text-on-surface">{invite.display_name ?? invite.email}</p>
        <p className="text-label-sm text-muted-foreground">{invite.email}</p>
        {invite.position_title ? (
          <p className="text-label-sm text-muted-foreground">{invite.position_title}</p>
        ) : null}
      </div>
      <div className="text-right text-label-sm text-muted-foreground">
        <Badge variant={statusVariant as 'default' | 'secondary' | 'outline'} className="capitalize">
          {invite.status}
        </Badge>
        <p className="mt-space-2xs">Sent {formatDate(invite.created_at)}</p>
      </div>
    </li>
  );
}
