import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { getPortalRoles } from '@/lib/ihar-auth';
import { createOrganizationAction, promoteOrgAdminAction } from './actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

type OrganizationRow = {
  id: string;
  name: string;
  website: string | null;
  category: 'community' | 'government';
  verified: boolean;
};

export default async function AdminOrganizationsPage() {
  const supabase = await createSupabaseRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/admin/organizations');
  }

  const portalRoles = getPortalRoles(user);
  if (!portalRoles.includes('portal_admin')) {
    redirect('/home');
  }

  const profile = await ensurePortalProfile(supabase, user.id);
  const portal = supabase.schema('portal');
  const { data: orgs, error } = await portal
    .from('organizations')
    .select('id, name, website, category, verified')
    .order('name');

  if (error) {
    throw error;
  }

  return (
    <div className="space-y-space-lg">
      <header className="space-y-space-xs">
        <p className="text-label-sm font-medium uppercase text-muted-foreground">Admin</p>
        <h1 className="text-headline-lg">Organizations</h1>
        <p className="max-w-3xl text-body-md text-muted-foreground">
          Create and manage partner organizations. Organization admins are restricted to their own records via RLS.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-title-lg">Add organization</CardTitle>
          <CardDescription>New entries can be assigned to users from the profile verification queue.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-space-md md:grid-cols-3" action={createOrganizationAction}>
            <div className="space-y-space-xs">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required placeholder="Community Food Bank" />
            </div>
            <div className="space-y-space-xs">
              <Label htmlFor="website">Website</Label>
              <Input id="website" name="website" type="url" placeholder="https://example.org" />
            </div>
            <div className="space-y-space-xs">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                name="category"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                defaultValue="community"
              >
                <option value="community">Community</option>
                <option value="government">Government</option>
              </select>
            </div>
            <div className="md:col-span-3 flex justify-end">
              <Button type="submit">Create organization</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-title-lg">Assign organization admin</CardTitle>
          <CardDescription>
            Promote an existing profile to organization admin and link them to an organization. This seeds the first admin so
            the org can self-manage membership.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-space-md md:grid-cols-3" action={promoteOrgAdminAction}>
            <div className="space-y-space-xs">
              <Label htmlFor="profile_id">Profile ID</Label>
              <Input id="profile_id" name="profile_id" required placeholder="UUID" />
            </div>
            <div className="space-y-space-xs">
              <Label htmlFor="organization_id">Organization</Label>
              <select
                id="organization_id"
                name="organization_id"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                required
                defaultValue=""
              >
                <option value="" disabled>
                  Select organization
                </option>
                {(orgs as OrganizationRow[] | null)?.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3 flex justify-end">
              <Button type="submit">Promote to org admin</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-title-lg">Existing organizations</CardTitle>
          <CardDescription>Read-only list for now; edits will be added once approval flow is defined.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Website</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(orgs as OrganizationRow[] | null)?.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>{org.name}</TableCell>
                  <TableCell className="capitalize">{org.category}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{org.website ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={org.verified ? 'default' : 'secondary'}>
                      {org.verified ? 'Verified' : 'Pending'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
