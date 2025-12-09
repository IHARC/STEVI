import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Button } from '@shared/ui/button';
import { Badge } from '@shared/ui/badge';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { fetchOrgInvites, fetchOrgMembersWithRoles, type OrgInviteRecord, type OrgMemberRecord } from '@/lib/org/fetchers';
import type { Database } from '@/types/supabase';
import { PageHeader } from '@shared/layout/page-header';
import { StatTile } from '@shared/ui/stat-tile';
import { OrgTabs } from './org-tabs';

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
    redirect(resolveLandingPath(access));
  }

  const isOrgAdmin = access.portalRoles.includes('portal_org_admin') || access.canAccessAdminWorkspace;

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

  const orgActions = [
    { id: 'users', label: 'Users', description: 'Manage members and roles.', href: '/org/members', requires: isOrgAdmin },
    { id: 'roles', label: 'Roles & permissions', description: 'Control access and visibility.', href: '/org/members', requires: isOrgAdmin },
    { id: 'tenant', label: 'Tenant settings', description: 'Domains, defaults, and preferences.', href: '/org/settings', requires: isOrgAdmin },
    { id: 'brand', label: 'Brand & website', description: 'Logos, colors, and public pages.', href: '/org/settings', requires: isOrgAdmin },
    { id: 'policies', label: 'Policies', description: 'Configure policy acknowledgements.', href: '/org/settings', requires: isOrgAdmin },
    { id: 'integrations', label: 'Integrations', description: 'Connect tools and data flows.', href: '/org/settings', requires: isOrgAdmin },
  ].filter((item) => item.requires);

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
    <div className="mx-auto w-full max-w-6xl flex flex-col gap-6 px-4 py-8 md:px-6">
      <PageHeader
        eyebrow="Organization"
        title={`Manage ${orgName}`}
        description="Track how your team is using STEVI, keep member access healthy, and jump into invites or settings from the same app. All data respects Supabase RLS for your organization."
        primaryAction={{ label: 'Invite members', href: '/org/invites' }}
        secondaryAction={{ label: 'Manage members', href: '/org/members' }}
      >
        <div className="flex flex-wrap gap-2">
          {organization?.status ? (
            <Badge variant={STATUS_VARIANT[organization.status] ?? 'outline'} className="capitalize">
              {organization.status.replaceAll('_', ' ')}
            </Badge>
          ) : null}
          <Badge variant="secondary" className="capitalize">
            {access.portalRoles.includes('portal_org_admin') ? 'Org admin' : 'Org representative'}
          </Badge>
        </div>
      </PageHeader>

      {orgActions.length ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {orgActions.map((action) => (
            <Card key={action.id} className="border-border/60">
              <CardHeader>
                <CardTitle className="text-lg">{action.label}</CardTitle>
                <CardDescription>{action.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link href={action.href}>Open</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}

      <OrgTabs />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <StatTile key={card.id} label={card.label} value={card.value} tone={card.tone} />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <Card className="h-full">
          <CardHeader className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">Recent member activity</CardTitle>
              <CardDescription>Most recent sign-ins from approved members.</CardDescription>
            </div>
            <Badge variant="secondary">Last seen {lastSeenLabel}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No member activity yet.</p>
            ) : (
              <ul className="divide-y divide-outline/15">
                {recentActivity.map((member) => (
                  <li key={member.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">{member.display_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {member.position_title ?? 'Team member'}
                      </p>
                      <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                        {member.portal_roles.map((role) => (
                          <Badge key={role} variant="outline" className="capitalize">
                            {role.replaceAll('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p className="font-medium text-foreground">{formatDate(member.last_seen_at)}</p>
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
            <CardTitle className="text-xl">Access health</CardTitle>
            <CardDescription>Keep at least one admin and a clear contact on file.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {accessHealth.length === 0 ? (
              <div className="rounded-2xl border border-border/30 bg-card px-4 py-3 text-sm text-foreground">
                <p className="font-medium">All set</p>
                <p className="text-muted-foreground">You have admins, reps, and contact details in place.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {accessHealth.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-3 rounded-2xl border border-border/30 bg-card px-4 py-3"
                  >
                    <Badge variant={item.tone === 'warning' ? 'destructive' : 'secondary'} className="mt-0.5">
                      {item.tone === 'warning' ? 'Action' : 'Info'}
                    </Badge>
                    <p className="text-sm text-foreground">{item.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr,1fr]">
        <Card className="h-full">
          <CardHeader className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl">Invite pipeline</CardTitle>
              <CardDescription>Recent invitations scoped to your organization.</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/org/invites">Open invitations</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {invites.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invites sent yet.</p>
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
            <CardTitle className="text-xl">Organization snapshot</CardTitle>
            <CardDescription>Contact and status details staff can reference.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-foreground">
            <div className="grid gap-2">
              <p className="font-medium">Status</p>
              <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
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

            <div className="grid gap-1">
              <p className="font-medium">Contact</p>
              <p className="text-muted-foreground">
                {organization?.contact_person ?? 'Not provided'}
                {organization?.contact_title ? `, ${organization.contact_title}` : ''}
              </p>
              <p className="text-muted-foreground">{organization?.contact_email ?? 'Add contact email'}</p>
              <p className="text-muted-foreground">{organization?.contact_phone ?? 'Add contact phone'}</p>
            </div>

            <div className="grid gap-1">
              <p className="font-medium">Org type</p>
              <p className="text-muted-foreground capitalize">
                {organization?.organization_type?.replaceAll('_', ' ') ?? 'Not set'}
              </p>
            </div>

            <div className="grid gap-1">
              <p className="font-medium">Partnership</p>
              <p className="text-muted-foreground capitalize">
                {organization?.partnership_type?.replaceAll('_', ' ') ?? 'Not set'}
              </p>
            </div>

            <div className="grid gap-1">
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
    <li className="flex items-start justify-between gap-3 py-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{invite.display_name ?? invite.email}</p>
        <p className="text-xs text-muted-foreground">{invite.email}</p>
        {invite.position_title ? (
          <p className="text-xs text-muted-foreground">{invite.position_title}</p>
        ) : null}
      </div>
      <div className="text-right text-xs text-muted-foreground">
        <Badge variant={statusVariant as 'default' | 'secondary' | 'outline'} className="capitalize">
          {invite.status}
        </Badge>
        <p className="mt-1">Sent {formatDate(invite.created_at)}</p>
      </div>
    </li>
  );
}
