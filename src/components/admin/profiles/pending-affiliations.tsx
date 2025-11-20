'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { approveAffiliationAction, declineAffiliationAction } from '@/app/(portal)/admin/profiles/actions';
import type { OrganizationOption, PendingAffiliation } from './types';

type PendingAffiliationsSectionProps = {
  pending: PendingAffiliation[];
  communityOrganizations: OrganizationOption[];
  governmentOrganizations: OrganizationOption[];
};

const dateFormatter = new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' });

const AFFILIATION_LABELS: Record<PendingAffiliation['affiliationType'], string> = {
  community_member: 'Community member',
  agency_partner: 'Agency partner',
  government_partner: 'Government partner',
};

const GOV_LEVEL_LABELS: Record<string, string> = {
  municipal: 'Municipal',
  county: 'County / regional',
  provincial: 'Provincial / territorial',
  federal: 'Federal',
  other: 'Other',
};

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }
  try {
    return dateFormatter.format(new Date(value));
  } catch {
    return value;
  }
}

function formatGovernmentLevel(value: string | null) {
  if (!value) {
    return null;
  }
  return GOV_LEVEL_LABELS[value] ?? value;
}

const createOrgSelectionMap = (pending: PendingAffiliation[]) =>
  Object.fromEntries(pending.map((entry) => [entry.id, entry.organizationId ?? '']));

const createGovRoleSelectionMap = (pending: PendingAffiliation[]) =>
  Object.fromEntries(
    pending.map((entry) => [
      entry.id,
      entry.requestedGovernmentRole ?? entry.governmentRoleType ?? 'staff',
    ]),
  );

export function PendingAffiliationsSection(props: PendingAffiliationsSectionProps) {
  const resetKey = useMemo(
    () =>
      JSON.stringify(
        props.pending.map((entry) => ({
          id: entry.id,
          org: entry.organizationId ?? '',
          govRole: entry.governmentRoleType ?? '',
          requested: entry.requestedGovernmentRole ?? '',
        })),
      ),
    [props.pending],
  );

  return <PendingAffiliationsContent key={resetKey} {...props} />;
}

function PendingAffiliationsContent({
  pending,
  communityOrganizations,
  governmentOrganizations,
}: PendingAffiliationsSectionProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [orgSelections, setOrgSelections] = useState<Record<string, string>>(() =>
    createOrgSelectionMap(pending),
  );
  const [govRoleSelections, setGovRoleSelections] = useState<Record<string, string>>(() =>
    createGovRoleSelectionMap(pending),
  );

  const pendingCountLabel =
    pending.length === 1 ? '1 pending request' : `${pending.length} pending requests`;

  const organizationOptions = useMemo(() => {
    const community = communityOrganizations.map((org) => ({
      id: org.id,
      label: org.name,
    }));
    const government = governmentOrganizations.map((org) => ({
      id: org.id,
      label: `${org.name}${
        org.governmentLevel ? ` (${formatGovernmentLevel(org.governmentLevel)})` : ''
      }`,
    }));
    return { community, government };
  }, [communityOrganizations, governmentOrganizations]);

  const handleApprove = async (profileId: string) => {
    const formData = new FormData();
    formData.set('profile_id', profileId);
    if (orgSelections[profileId]) {
      formData.set('approved_organization_id', orgSelections[profileId]);
    }
    if (govRoleSelections[profileId]) {
      formData.set('approved_government_role', govRoleSelections[profileId]);
    }
    const result = await approveAffiliationAction(formData);
    if (!result.success) {
      toast({
        title: 'Approval failed',
        description: result.error,
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Affiliation approved', description: 'Permissions refresh automatically.' });
    startTransition(() => router.refresh());
  };

  const handleDecline = async (profileId: string) => {
    const formData = new FormData();
    formData.set('profile_id', profileId);
    const result = await declineAffiliationAction(formData);
    if (!result.success) {
      toast({
        title: 'Decline failed',
        description: result.error,
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Affiliation declined', description: 'We removed this request from the queue.' });
    startTransition(() => router.refresh());
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-col gap-space-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-title-lg">Pending verification queue</CardTitle>
          <CardDescription>
            Approve agency and government representatives so they can collaborate on STEVI right
            away.
          </CardDescription>
        </div>
        <Badge variant="outline" className="self-start text-label-sm uppercase">
          {pendingCountLabel}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-space-md">
        {pending.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">
            No pending requests. New partner applications will surface here automatically.
          </p>
        ) : (
          pending.map((entry) => {
            const requestedDate = formatDate(entry.affiliationRequestedAt);
            const requestedLevel = formatGovernmentLevel(entry.requestedGovernmentLevel);
            const currentOrg =
              entry.affiliationType === 'government_partner'
                ? organizationOptions.government
                : organizationOptions.community;
            const orgValue = orgSelections[entry.id] ?? '';
            const govRoleValue = govRoleSelections[entry.id] ?? 'staff';
            return (
              <article
                key={entry.id}
                className="rounded-xl border border-outline/30 bg-surface-container-low p-space-md shadow-level-1"
              >
                <header className="flex flex-col gap-space-2">
                  <div className="flex flex-wrap items-center gap-space-xs">
                    <h3 className="text-title-md font-semibold text-on-surface">{entry.displayName}</h3>
                    <Badge variant="secondary">{AFFILIATION_LABELS[entry.affiliationType]}</Badge>
                  </div>
                  {entry.positionTitle ? (
                    <p className="text-body-sm text-muted-foreground">{entry.positionTitle}</p>
                  ) : null}
                  {entry.organizationName ? (
                    <p className="text-label-sm text-muted-foreground">
                      Linked to {entry.organizationName}
                    </p>
                  ) : null}
                  {requestedDate ? (
                    <p className="text-label-sm text-muted-foreground">
                      Requested {requestedDate}{' '}
                      {entry.requestedOrganizationName
                        ? `• ${entry.requestedOrganizationName}`
                        : entry.requestedGovernmentName
                          ? `• ${entry.requestedGovernmentName}${
                              requestedLevel ? ` (${requestedLevel})` : ''
                            }`
                          : null}
                    </p>
                  ) : null}
                </header>
                <div className="mt-space-md flex flex-col gap-space-sm border-t border-outline/20 pt-space-sm lg:flex-row lg:items-end lg:justify-between">
                  <div className="grid gap-space-sm lg:grid-cols-[minmax(0,320px)_auto] lg:items-end lg:gap-space-md">
                    <label className="grid gap-1 text-body-sm text-on-surface">
                      <span className="text-label-sm uppercase text-muted-foreground">
                        Approved organization
                      </span>
                      <select
                        className="rounded-lg border border-outline/40 bg-surface px-3 py-2 text-body-sm text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        value={orgValue}
                        onChange={(event) =>
                          setOrgSelections((prev) => ({ ...prev, [entry.id]: event.target.value }))
                        }
                        disabled={isPending}
                      >
                        <option value="">Select organization</option>
                        {currentOrg.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {entry.affiliationType === 'government_partner' ? (
                      <label className="grid gap-1 text-body-sm text-on-surface">
                        <span className="text-label-sm uppercase text-muted-foreground">
                          Role type
                        </span>
                        <select
                          className="rounded-lg border border-outline/40 bg-surface px-3 py-2 text-body-sm text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          value={govRoleValue}
                          onChange={(event) =>
                            setGovRoleSelections((prev) => ({ ...prev, [entry.id]: event.target.value }))
                          }
                          disabled={isPending}
                        >
                          <option value="staff">Public servant / staff</option>
                          <option value="politician">Elected leadership</option>
                        </select>
                      </label>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-space-sm">
                    <Button
                      onClick={() => handleApprove(entry.id)}
                      disabled={isPending}
                      className="min-w-[120px]"
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleDecline(entry.id)}
                      disabled={isPending}
                      className="min-w-[120px]"
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
