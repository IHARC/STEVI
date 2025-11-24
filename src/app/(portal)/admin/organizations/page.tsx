import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
import { createOrganizationAction, promoteOrgAdminAction } from './actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';

export const dynamic = 'force-dynamic';

type OrganizationRow = {
  id: number;
  name: string;
  website: string | null;
  organization_type: string | null;
  is_active: boolean | null;
};

export default async function AdminOrganizationsPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/login?next=/admin/organizations');
  }

  if (!access.canAccessAdminWorkspace) {
    redirect(resolveDefaultWorkspacePath(access));
  }

  await ensurePortalProfile(supabase, access.userId);
  const core = supabase.schema('core');
  const { data: orgs, error } = await core
    .from('organizations')
    .select('id, name, website, organization_type, is_active')
    .order('name');

  if (error) {
    throw error;
  }

  const handleCreate = async (formData: FormData) => {
    'use server';
    const result = await createOrganizationAction(formData);
    if (!result.success) {
      throw new Error(result.error);
    }
  };

  const handlePromote = async (formData: FormData) => {
    'use server';
    const result = await promoteOrgAdminAction(formData);
    if (!result.success) {
      throw new Error(result.error);
    }
  };

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
          <form className="grid gap-space-md md:grid-cols-3" action={handleCreate}>
            <div className="space-y-space-xs">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required placeholder="Community Food Bank" />
            </div>
            <div className="space-y-space-xs">
              <Label htmlFor="website">Website</Label>
              <Input id="website" name="website" type="url" placeholder="https://example.org" />
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
          <form className="grid gap-space-md md:grid-cols-3" action={handlePromote}>
            <div className="space-y-space-xs">
              <Label htmlFor="profile_id">Profile ID</Label>
              <Input id="profile_id" name="profile_id" required placeholder="UUID" />
            </div>
            <div className="space-y-space-xs">
              <Label htmlFor="organization_id">Organization</Label>
              <Select name="organization_id" required>
                <SelectTrigger id="organization_id">
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {(orgs as OrganizationRow[] | null)?.map((org) => (
                    <SelectItem key={org.id} value={String(org.id)}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <TableHead>Type</TableHead>
                <TableHead>Website</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(orgs as OrganizationRow[] | null)?.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>{org.name}</TableCell>
                  <TableCell className="capitalize">{org.organization_type ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{org.website ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={org.is_active === false ? 'secondary' : 'default'}>
                      {org.is_active === false ? 'Inactive' : 'Active'}
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
