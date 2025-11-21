import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { toggleMemberRoleAction, removeMemberAction } from './actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

type OrgMember = {
  id: string;
  user_id: string | null;
  display_name: string;
  position_title: string | null;
  organization_id: number | null;
  last_seen_at: string | null;
  affiliation_status: string;
  portal_roles: string[];
};

function formatDate(value: string | null) {
  if (!value) return '—';
  try {
    return dateFormatter.format(new Date(value));
  } catch {
    return value;
  }
}

export default async function OrgMembersPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canManageOrgUsers || !access.organizationId) {
    redirect('/home');
  }

  const portal = supabase.schema('portal');
  const { data: memberProfiles, error } = await portal
    .from('profiles')
    .select('id, user_id, display_name, position_title, organization_id, last_seen_at, affiliation_status')
    .eq('organization_id', access.organizationId)
    .order('display_name');

  if (error) {
    throw error;
  }

  const users = (memberProfiles ?? []) as Array<{
    id: string;
    user_id: string | null;
    display_name: string;
    position_title: string | null;
    organization_id: number | null;
    last_seen_at: string | null;
    affiliation_status: string;
  }>;

  const userIds = users.map((u) => u.user_id).filter((id): id is string => Boolean(id));
  let roleMap = new Map<string, string[]>();
  if (userIds.length) {
    const { data: roleRows, error: roleError } = await supabase
      .schema('core')
      .from('user_roles')
      .select('user_id, roles:roles!inner(name)')
      .in('user_id', userIds);

    if (roleError) {
      throw roleError;
    }

    (roleRows ?? []).forEach((row: { user_id: string; roles: { name: string } | null }) => {
      const name = row.roles?.name;
      if (!name) return;
      const list = roleMap.get(row.user_id) ?? [];
      list.push(name);
      roleMap.set(row.user_id, list);
    });
  }

  const members: OrgMember[] = users.map((u) => ({
    ...u,
    portal_roles: (roleMap.get(u.user_id ?? '') ?? []).filter((role) => role.startsWith('portal_')),
  }));

  const handleToggle = async (formData: FormData) => {
    const result = await toggleMemberRoleAction(formData);
    if (!result.success) {
      throw new Error(result.error);
    }
  };

  const handleRemove = async (formData: FormData) => {
    const result = await removeMemberAction(formData);
    if (!result.success) {
      throw new Error(result.error);
    }
  };

  return (
    <div className="space-y-space-lg">
      <header className="space-y-space-xs">
        <p className="text-label-sm font-medium uppercase text-muted-foreground">Organization</p>
        <h1 className="text-headline-lg">Members</h1>
        <p className="max-w-3xl text-body-md text-muted-foreground">
          All actions here are constrained by Supabase row-level security to this organization.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-title-lg">Active members</CardTitle>
          <CardDescription>Promote to organization admin, delegate org reps, or remove access.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Last seen</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member: OrgMember) => {
                const isSelf = member.id === access.profile.id;
                const isOrgAdmin =
                  member.portal_roles.includes('portal_org_admin') || member.portal_roles.includes('portal_admin');
                const isOrgRep = member.portal_roles.includes('portal_org_rep');

                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-on-surface">{member.display_name}</span>
                        {member.position_title ? (
                          <span className="text-xs text-muted-foreground">{member.position_title}</span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-space-xs">
                        <Badge variant={isOrgAdmin ? 'default' : 'secondary'}>
                          {member.portal_roles[0] ?? 'portal_user'}
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                          {member.affiliation_status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(member.last_seen_at)}</TableCell>
                    <TableCell className="flex justify-end gap-space-xs">
                      <form action={handleToggle}>
                        <input type="hidden" name="profile_id" value={member.id} />
                        <input type="hidden" name="role_name" value="portal_org_admin" />
                        <input type="hidden" name="enable" value={(!isOrgAdmin).toString()} />
                        <Button type="submit" variant={isOrgAdmin ? 'outline' : 'default'} size="sm" disabled={isSelf}>
                          {isOrgAdmin ? 'Remove org admin' : 'Make org admin'}
                        </Button>
                      </form>
                      <form action={handleToggle}>
                        <input type="hidden" name="profile_id" value={member.id} />
                        <input type="hidden" name="role_name" value="portal_org_rep" />
                        <input type="hidden" name="enable" value={(!isOrgRep).toString()} />
                        <Button type="submit" variant={isOrgRep ? 'outline' : 'secondary'} size="sm" disabled={isSelf && isOrgAdmin}>
                          {isOrgRep ? 'Remove org rep' : 'Make org rep'}
                        </Button>
                      </form>
                      <form action={handleRemove}>
                        <input type="hidden" name="profile_id" value={member.id} />
                        <Button type="submit" variant="ghost" size="sm" disabled={isSelf}>
                          Remove
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
