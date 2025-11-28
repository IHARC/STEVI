import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';
import { fetchOrgInvites, type OrgInviteRecord } from '@/lib/org/fetchers';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { checkRateLimit, type RateLimitResult } from '@/lib/rate-limit';
import { InviteSheet } from './invite-sheet';
import { ORG_INVITE_EVENT, ORG_INVITE_RATE_LIMIT } from './constants';

export const dynamic = 'force-dynamic';

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
    redirect(resolveDefaultWorkspacePath(access));
  }

  const [invites, rateLimit]: [OrgInviteRecord[], RateLimitResult] = await Promise.all([
    fetchOrgInvites(supabase, access.organizationId, 50),
    checkRateLimit({
      supabase,
      type: ORG_INVITE_EVENT,
      limit: ORG_INVITE_RATE_LIMIT.limit,
      cooldownMs: ORG_INVITE_RATE_LIMIT.cooldownMs,
    }),
  ]);

  return (
    <div className="page-shell page-stack">
      <header className="flex flex-wrap items-start justify-between gap-space-md">
        <div className="space-y-space-2xs">
          <p className="text-label-sm font-medium uppercase text-muted-foreground">Organization</p>
          <h1 className="text-headline-lg text-on-surface sm:text-display-sm">Invitations</h1>
          <p className="max-w-3xl text-body-md text-muted-foreground">
            Invitations stay locked to your organization by Supabase RLS. Rate limits keep accidental resends in check.
          </p>
        </div>
        <InviteSheet rateLimit={rateLimit} />
      </header>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-space-sm">
          <div>
            <CardTitle>Recent invites</CardTitle>
            <CardDescription>Showing the last 50 invitations tied to your organization.</CardDescription>
          </div>
          <Badge variant={rateLimit.allowed ? 'secondary' : 'destructive'} className="capitalize">
            {rateLimit.allowed ? 'Limit clear' : 'Rate limited'}
          </Badge>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.map((invite) => (
                <TableRow key={invite.id}>
                  <TableCell className="text-on-surface">{invite.email}</TableCell>
                  <TableCell>{invite.display_name ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{invite.position_title ?? '—'}</TableCell>
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
