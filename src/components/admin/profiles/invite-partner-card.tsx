'use client';

import { FormEvent, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { NO_ORGANIZATION_VALUE } from '@/lib/constants';
import { sendPartnerInviteAction } from '@/app/(portal)/admin/profiles/actions';
import type { OrganizationOption, ProfileInviteSummary } from './types';

type InvitePartnerCardProps = {
  actorProfileId: string;
  organizations: OrganizationOption[];
  recentInvites: ProfileInviteSummary[];
};

const AFFILIATION_OPTIONS: { value: ProfileInviteSummary['affiliationType']; label: string }[] = [
  { value: 'agency_partner', label: 'Agency or community partner' },
  { value: 'government_partner', label: 'Government partner' },
  { value: 'community_member', label: 'Community collaborator' },
];

const STATUS_LABELS: Record<ProfileInviteSummary['status'], string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

export function InvitePartnerCard({ actorProfileId, organizations, recentInvites }: InvitePartnerCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedOrg, setSelectedOrg] = useState(NO_ORGANIZATION_VALUE);

  const pendingInvites = recentInvites.filter((invite) => invite.status === 'pending');
  const organizationOptions = useMemo(
    () =>
      organizations.map((org) => ({
        value: org.id,
        label: org.name,
      })),
    [organizations],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) {
      return;
    }
    const formData = new FormData(event.currentTarget);
    formData.set('actor_profile_id', actorProfileId);

    const result = await sendPartnerInviteAction(formData);
    if (!result.success) {
      toast({
        title: 'Invitation error',
        description: result.error,
        variant: 'destructive',
      });
      return;
    }

    toast({ title: 'Invitation sent', description: 'Partners receive a secure link to register.' });
    formRef.current?.reset();
    setSelectedOrg(NO_ORGANIZATION_VALUE);
    startTransition(() => router.refresh());
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-col gap-space-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-title-lg">Invite partners</CardTitle>
          <CardDescription>
            Send a secure invitation to agency teams or government partners without leaving STEVI.
          </CardDescription>
        </div>
        <Badge variant="secondary" className="self-start">
          {pendingInvites.length} pending
        </Badge>
      </CardHeader>
      <CardContent className="space-y-space-md">
        <form ref={formRef} onSubmit={handleSubmit} className="grid gap-space-md">
          <div className="grid gap-space-sm md:grid-cols-2">
            <label className="grid gap-1 text-body-sm text-on-surface">
              <span className="text-label-sm uppercase tracking-wide text-muted-foreground">Email</span>
              <Input
                name="invite_email"
                type="email"
                placeholder="partner@example.ca"
                required
                disabled={isPending}
              />
            </label>
            <label className="grid gap-1 text-body-sm text-on-surface">
              <span className="text-label-sm uppercase tracking-wide text-muted-foreground">
                Display name (optional)
              </span>
              <Input name="invite_display_name" placeholder="Public display name" disabled={isPending} />
            </label>
          </div>
          <div className="grid gap-space-sm md:grid-cols-2">
            <label className="grid gap-1 text-body-sm text-on-surface">
              <span className="text-label-sm uppercase tracking-wide text-muted-foreground">
                Position or role (optional)
              </span>
              <Input
                name="invite_position_title"
                placeholder="Program lead, outreach worker, councillor…"
                disabled={isPending}
              />
            </label>
            <label className="grid gap-1 text-body-sm text-on-surface">
              <span className="text-label-sm uppercase tracking-wide text-muted-foreground">
                Affiliation type
              </span>
              <select
                name="invite_affiliation_type"
                defaultValue="agency_partner"
                className="rounded-[var(--md-sys-shape-corner-small)] border border-outline/40 bg-surface px-3 py-2 text-body-sm text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                disabled={isPending}
              >
                {AFFILIATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-space-sm md:grid-cols-[minmax(0,1fr)_200px] md:items-end">
            <label className="grid gap-1 text-body-sm text-on-surface">
              <span className="text-label-sm uppercase tracking-wide text-muted-foreground">
                Organization (optional)
              </span>
              <select
                name="invite_organization_id"
                value={selectedOrg}
                onChange={(event) => setSelectedOrg(event.target.value)}
                className="rounded-[var(--md-sys-shape-corner-small)] border border-outline/40 bg-surface px-3 py-2 text-body-sm text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                disabled={isPending}
              >
                <option value={NO_ORGANIZATION_VALUE}>Select organization</option>
                {organizationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" disabled={isPending}>
              Send invitation
            </Button>
          </div>
          <label className="grid gap-1 text-body-sm text-on-surface">
            <span className="text-label-sm uppercase tracking-wide text-muted-foreground">
              Message (optional)
            </span>
            <Textarea
              name="invite_message"
              placeholder="Add context about why you&apos;re inviting this partner or supports you discussed."
              className="min-h-[120px]"
              disabled={isPending}
            />
          </label>
        </form>

        {recentInvites.length ? (
          <div className="space-y-space-sm">
            <p className="text-label-sm uppercase tracking-wide text-muted-foreground">Recent invites</p>
            <ul className="divide-y divide-outline/20 rounded-[var(--md-sys-shape-corner-medium)] border border-outline/30">
              {recentInvites.map((invite) => (
                <li key={invite.id} className="flex flex-col gap-space-xs px-space-md py-space-sm sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-body-md font-medium text-on-surface">
                      {invite.displayName ?? invite.email}
                    </p>
                    <p className="text-label-sm text-muted-foreground">{invite.email}</p>
                    {invite.positionTitle ? (
                      <p className="text-label-sm text-muted-foreground">{invite.positionTitle}</p>
                    ) : null}
                    {invite.organizationName ? (
                      <p className="text-label-sm text-muted-foreground">{invite.organizationName}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-start gap-1 text-label-sm text-muted-foreground sm:items-end">
                    <Badge
                      variant={invite.status === 'pending' ? 'secondary' : 'outline'}
                      className="uppercase tracking-wide"
                    >
                      {STATUS_LABELS[invite.status]}
                    </Badge>
                    <span className="text-label-sm">
                      {new Date(invite.createdAt).toLocaleDateString('en-CA')}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
