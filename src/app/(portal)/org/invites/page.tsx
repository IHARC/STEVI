import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { createOrgInviteAction } from './actions';

export const dynamic = 'force-dynamic';

type InviteRow = {
  id: string;
  email: string;
  display_name: string | null;
  status: string;
  created_at: string;
};

const dateFormatter = new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short' });

function formatDate(value: string) {
  try {
    return dateFormatter.format(new Date(value));
  } catch {
    return value;
  }
}

export default async function OrgInvitesPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canManageOrgInvites || !access.organizationId) {
    redirect('/home');
  }

  const portal = supabase.schema('portal');
  const { data: invites, error } = await portal
    .from('profile_invites')
    .select('id, email, display_name, status, created_at')
    .eq('organization_id', access.organizationId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return (
    <div className="space-y-space-lg">
      <header className="space-y-space-xs">
        <p className="text-label-sm font-medium uppercase text-muted-foreground">Organization</p>
        <h1 className="text-headline-lg">Invitations</h1>
        <p className="max-w-2xl text-body-md text-muted-foreground">
          Invitations are scoped to your organization. Recipients will be linked to your org when they accept.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Send invite</CardTitle>
          <CardDescription>Creates a pending invitation locked to your organization.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-space-md md:grid-cols-2" action={createOrgInviteAction}>
            <div className="space-y-space-xs">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="person@example.org" />
            </div>
            <div className="space-y-space-xs">
              <Label htmlFor="display_name">Display name (optional)</Label>
              <Input id="display_name" name="display_name" placeholder="Jordan Smith" />
            </div>
            <div className="space-y-space-xs md:col-span-2">
              <Label htmlFor="position_title">Role or title (optional)</Label>
              <Input id="position_title" name="position_title" placeholder="Coordinator" />
            </div>
            <div className="space-y-space-xs md:col-span-2">
              <Label htmlFor="message">Message (optional)</Label>
              <textarea
                id="message"
                name="message"
                className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                placeholder="Add context for this invite"
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit">Send invite</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent invites</CardTitle>
          <CardDescription>Showing last 50 invites tied to your organization.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(invites as InviteRow[] | null)?.map((invite) => (
                <TableRow key={invite.id}>
                  <TableCell>{invite.email}</TableCell>
                  <TableCell>{invite.display_name ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={invite.status === 'pending' ? 'secondary' : 'default'} className="capitalize">
                      {invite.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(invite.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
