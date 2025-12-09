import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Badge } from '@shared/ui/badge';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { fetchOrgInvites, type OrgInviteRecord } from '@/lib/org/fetchers';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/ui/table';
import { checkRateLimit, type RateLimitResult } from '@/lib/rate-limit';
import { InviteSheet } from './invite-sheet';
import { ORG_INVITE_EVENT, ORG_INVITE_RATE_LIMIT } from './constants';
import { OrgTabs } from '../org-tabs';

export const dynamic = 'force-dynamic';

const dateFormatter = new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short' });

function formatDate(value: string) {
  try {
    return dateFormatter.format(new Date(value));
  } catch {
    return value;
  }
}

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function OrgInvitesPage({ searchParams }: PageProps) {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect(resolveLandingPath(access));
  }

  const resolved = searchParams ? await searchParams : undefined;
  const orgParam = resolved?.orgId ?? resolved?.org ?? resolved?.organizationId;
  const parsedOrg = Array.isArray(orgParam) ? Number.parseInt(orgParam[0] ?? '', 10) : Number.parseInt(orgParam ?? '', 10);
  const requestedOrgId = Number.isFinite(parsedOrg) ? parsedOrg : null;
  const targetOrgId = access.organizationId ?? requestedOrgId ?? null;

  if (!targetOrgId && access.canAccessAdminWorkspace) {
    redirect('/org');
  }

  if (!targetOrgId || (!access.canManageOrgInvites && !access.canAccessAdminWorkspace)) {
    redirect(resolveLandingPath(access));
  }

  const [invites, rateLimit]: [OrgInviteRecord[], RateLimitResult] = await Promise.all([
    fetchOrgInvites(supabase, targetOrgId, 50),
    checkRateLimit({
      supabase,
      type: ORG_INVITE_EVENT,
      limit: ORG_INVITE_RATE_LIMIT.limit,
      cooldownMs: ORG_INVITE_RATE_LIMIT.cooldownMs,
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl flex flex-col gap-6 px-4 py-8 md:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase text-muted-foreground">Organization</p>
          <h1 className="text-3xl text-foreground sm:text-4xl">Invitations</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Invitations stay locked to your organization by Supabase RLS. Rate limits keep accidental resends in check.
          </p>
        </div>
        <InviteSheet rateLimit={rateLimit} organizationId={targetOrgId} />
      </header>

      <OrgTabs orgId={targetOrgId} />

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-3">
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
                  <TableCell className="text-foreground">{invite.email}</TableCell>
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
