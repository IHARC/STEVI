import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { getPortalRoles } from '@/lib/ihar-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PendingAffiliationsSection } from '@/components/admin/profiles/pending-affiliations';
import { InvitePartnerCard } from '@/components/admin/profiles/invite-partner-card';
import type {
  OrganizationOption,
  PendingAffiliation,
  ProfileInviteSummary,
} from '@/components/admin/profiles/types';
import type { Database } from '@/types/supabase';

type OrganizationRow = { id: number; name: string; organization_type: string | null };
type PendingProfileRow = Pick<
  Database['portal']['Tables']['profiles']['Row'],
  | 'id'
  | 'display_name'
  | 'position_title'
  | 'affiliation_type'
  | 'affiliation_status'
  | 'affiliation_requested_at'
  | 'organization_id'
  | 'requested_organization_name'
  | 'requested_government_name'
  | 'requested_government_level'
  | 'requested_government_role'
  | 'government_role_type'
>;
type ProfileInviteRow = Pick<
  Database['portal']['Tables']['profile_invites']['Row'],
  'id' | 'email' | 'display_name' | 'position_title' | 'affiliation_type' | 'status' | 'created_at'
>;

export const dynamic = 'force-dynamic';

export default async function AdminProfilesPage() {
  const supabase = await createSupabaseRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/admin/profiles');
  }

  const portalRoles = getPortalRoles(user);
  if (!portalRoles.includes('portal_admin') && !portalRoles.includes('portal_moderator')) {
    redirect('/home');
  }

  await ensurePortalProfile(supabase, user.id);
  const portal = supabase.schema('portal');
  const core = supabase.schema('core');

  const [organizationsResponse, pendingResponse, invitesResponse] = await Promise.all([
    core.from('organizations').select('id, name, organization_type').order('name'),
    portal
      .from('profiles')
      .select(
        `
          id,
          display_name,
          position_title,
          affiliation_type,
          affiliation_status,
          affiliation_requested_at,
          organization_id,
          requested_organization_name,
          requested_government_name,
          requested_government_level,
          requested_government_role,
          government_role_type,
        `,
      )
      .eq('affiliation_status', 'pending')
      .order('affiliation_requested_at', { ascending: true })
      .limit(50),
    portal
      .from('profile_invites')
      .select(
        `
          id,
          email,
          display_name,
          position_title,
          affiliation_type,
          status,
          created_at
        `,
      )
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  if (organizationsResponse.error) {
    throw organizationsResponse.error;
  }
  if (pendingResponse.error) {
    throw pendingResponse.error;
  }
  if (invitesResponse.error) {
    throw invitesResponse.error;
  }

  const organizationRows = (organizationsResponse.data ?? []) as OrganizationRow[];
  const organizations: OrganizationOption[] = organizationRows.map((org) => ({
    id: String(org.id),
    name: org.name,
    governmentLevel: null,
  }));

  const pendingRows = (pendingResponse.data ?? []) as PendingProfileRow[];
  const organizationsById = new Map(organizations.map((org) => [org.id, org]));
  const pendingAffiliations: PendingAffiliation[] = pendingRows.map((entry) => {
    const orgId = entry.organization_id === null ? null : String(entry.organization_id);
    const orgOption = orgId ? organizationsById.get(orgId) : null;
    return {
      id: entry.id,
      displayName: entry.display_name,
      positionTitle: entry.position_title,
      affiliationType: entry.affiliation_type,
      affiliationStatus: entry.affiliation_status,
      affiliationRequestedAt: entry.affiliation_requested_at,
      organizationId: orgOption?.id ?? null,
      organizationName: orgOption?.name ?? null,
      requestedOrganizationName: entry.requested_organization_name,
      requestedGovernmentName: entry.requested_government_name,
      requestedGovernmentLevel: entry.requested_government_level,
      requestedGovernmentRole: entry.requested_government_role,
      governmentRoleType: entry.government_role_type,
    };
  });

  const inviteRows = (invitesResponse.data ?? []) as ProfileInviteRow[];
  const recentInvites: ProfileInviteSummary[] = inviteRows.map((invite) => {
    return {
      id: invite.id,
      email: invite.email ?? '',
      displayName: invite.display_name,
      positionTitle: invite.position_title,
      affiliationType: invite.affiliation_type,
      status: invite.status,
      createdAt: invite.created_at,
      organizationName: null,
    };
  });

  const agencyOrgs = organizations.filter(
    (org) => !(org.name.toLowerCase().includes('government') || org.name.toLowerCase().includes('county')),
  );
  const governmentOrgs = organizations.filter(
    (org) => org.name.toLowerCase().includes('government') || org.name.toLowerCase().includes('county'),
  );
  const pendingInviteCount = recentInvites.filter((invite) => invite.status === 'pending').length;

  return (
    <div className="page-shell page-stack">
      <header className="flex flex-col gap-space-xs">
        <p className="text-label-sm font-medium uppercase text-muted-foreground">
          Access &amp; verification
        </p>
        <h1 className="text-headline-lg text-on-surface sm:text-display-sm">Profile verification &amp; invitations</h1>
        <p className="max-w-3xl text-body-md text-muted-foreground sm:text-body-lg">
          Approve partner affiliations, refresh organization links, and send invitations so trusted collaborators can
          reach STEVI in seconds.
        </p>
      </header>

      <section className="grid gap-space-md md:grid-cols-3">
        <SummaryCard
          title="Pending verifications"
          value={pendingAffiliations.length.toString()}
          description="Awaiting moderator review"
        />
        <SummaryCard
          title="Recent invites"
          value={recentInvites.length.toString()}
          description="Last 10 invitations sent"
        />
        <SummaryCard
          title="Open invites"
          value={pendingInviteCount.toString()}
          description="Recipients yet to respond"
        />
      </section>

      <PendingAffiliationsSection
        pending={pendingAffiliations}
        communityOrganizations={agencyOrgs}
        governmentOrganizations={governmentOrgs}
      />

      <InvitePartnerCard organizations={organizations} recentInvites={recentInvites} />
    </div>
  );
}

type SummaryCardProps = {
  title: string;
  value: string;
  description: string;
};

function SummaryCard({ title, value, description }: SummaryCardProps) {
  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between gap-space-sm">
        <CardTitle className="text-title-sm">{title}</CardTitle>
        <Badge variant="outline" className="text-label-sm">
          {value}
        </Badge>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-body-sm text-muted-foreground">{description}</CardDescription>
      </CardContent>
    </Card>
  );
}
