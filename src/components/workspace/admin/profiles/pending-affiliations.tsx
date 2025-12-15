'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Combobox, type ComboboxOption } from '@shared/ui/combobox';
import { Input } from '@shared/ui/input';
import { NativeSelect } from '@shared/ui/native-select';
import { Panel } from '@shared/ui/panel';
import { ScrollArea } from '@shared/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@shared/ui/sheet';
import { useToast } from '@shared/ui/use-toast';
import { approveAffiliationAction, declineAffiliationAction } from '@/app/(ops)/ops/admin/profiles/actions';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
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
  const isLargeScreen = useMediaQuery('(min-width: 1024px)');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(pending[0]?.id ?? '');
  const [mobileOpen, setMobileOpen] = useState(false);
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

  const filteredPending = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pending;
    return pending.filter((entry) => {
      const haystack = [
        entry.displayName,
        entry.positionTitle ?? '',
        entry.organizationName ?? '',
        entry.requestedOrganizationName ?? '',
        entry.requestedGovernmentName ?? '',
        entry.requestedGovernmentLevel ?? '',
        entry.affiliationType,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [pending, search]);

  const selectedEntry = useMemo(
    () => filteredPending.find((entry) => entry.id === selectedId) ?? filteredPending[0] ?? null,
    [filteredPending, selectedId],
  );

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

  const handleSelect = (id: string) => {
    setSelectedId(id);
    if (!isLargeScreen) setMobileOpen(true);
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">Pending verification queue</CardTitle>
          <CardDescription>Approve agency and government representatives so they can collaborate on STEVI right away.</CardDescription>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
          <Badge variant="outline" className="self-start text-xs uppercase sm:self-end">
            {pendingCountLabel}
          </Badge>
          <Input
            className="w-full sm:w-72"
            placeholder="Search requests…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </CardHeader>

      <CardContent>
        {filteredPending.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No pending requests. New partner applications will surface here automatically.
          </p>
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-[minmax(320px,440px),1fr]">
              <Panel asChild surface="background" borderTone="subtle" padding="none">
                <section>
                  <div className="flex items-center justify-between gap-2 border-b border-border/15 px-4 py-3">
                    <Badge variant="secondary">{filteredPending.length} shown</Badge>
                    <span className="text-xs text-muted-foreground">Select a request to review</span>
                  </div>

                  <ScrollArea className="h-[62vh] pr-1">
                    <ul className="space-y-2 p-3">
                      {filteredPending.map((entry) => {
                        const isSelected = entry.id === selectedEntry?.id;
                        const requestedDate = formatDate(entry.affiliationRequestedAt);
                        return (
                          <li key={entry.id}>
                            <Panel
                              asChild
                              borderTone="subtle"
                              padding="sm"
                              interactive
                              className={cn('w-full text-left', isSelected ? 'border-primary/50' : null)}
                            >
                              <button type="button" onClick={() => handleSelect(entry.id)}>
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-foreground">{entry.displayName}</p>
                                    <p className="truncate text-xs text-muted-foreground">
                                      {entry.positionTitle ?? entry.organizationName ?? '—'}
                                    </p>
                                  </div>
                                  <Badge variant="outline">{AFFILIATION_LABELS[entry.affiliationType]}</Badge>
                                </div>
                                {requestedDate ? (
                                  <p className="mt-2 text-xs text-muted-foreground">Requested {requestedDate}</p>
                                ) : null}
                              </button>
                            </Panel>
                          </li>
                        );
                      })}
                    </ul>
                  </ScrollArea>
                </section>
              </Panel>

              <aside className="hidden lg:block">
                {selectedEntry ? (
                  <div className="sticky top-28 max-h-[calc(100vh-9rem)] overflow-y-auto pr-1">
                    <PendingAffiliationEditor
                      key={selectedEntry.id}
                      entry={selectedEntry}
                      organizationOptions={organizationOptions}
                      orgValue={orgSelections[selectedEntry.id] ?? ''}
                      govRoleValue={govRoleSelections[selectedEntry.id] ?? 'staff'}
                      onOrgChange={(value) => setOrgSelections((prev) => ({ ...prev, [selectedEntry.id]: value }))}
                      onGovRoleChange={(value) => setGovRoleSelections((prev) => ({ ...prev, [selectedEntry.id]: value }))}
                      isPending={isPending}
                      onApprove={() => handleApprove(selectedEntry.id)}
                      onDecline={() => handleDecline(selectedEntry.id)}
                    />
                  </div>
                ) : null}
              </aside>
            </div>

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetContent side="right" className="w-full max-w-[560px] lg:hidden">
                <SheetHeader className="text-left">
                  <SheetTitle>Review request</SheetTitle>
                </SheetHeader>
                <div className="mt-4 max-h-[80vh] overflow-y-auto pr-1">
                  {selectedEntry ? (
                    <PendingAffiliationEditor
                      key={selectedEntry.id}
                      entry={selectedEntry}
                      organizationOptions={organizationOptions}
                      orgValue={orgSelections[selectedEntry.id] ?? ''}
                      govRoleValue={govRoleSelections[selectedEntry.id] ?? 'staff'}
                      onOrgChange={(value) => setOrgSelections((prev) => ({ ...prev, [selectedEntry.id]: value }))}
                      onGovRoleChange={(value) => setGovRoleSelections((prev) => ({ ...prev, [selectedEntry.id]: value }))}
                      isPending={isPending}
                      onApprove={() => handleApprove(selectedEntry.id)}
                      onDecline={() => handleDecline(selectedEntry.id)}
                    />
                  ) : null}
                </div>
              </SheetContent>
            </Sheet>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PendingAffiliationEditor({
  entry,
  organizationOptions,
  orgValue,
  govRoleValue,
  onOrgChange,
  onGovRoleChange,
  isPending,
  onApprove,
  onDecline,
}: {
  entry: PendingAffiliation;
  organizationOptions: { community: { id: string; label: string }[]; government: { id: string; label: string }[] };
  orgValue: string;
  govRoleValue: string;
  onOrgChange: (value: string) => void;
  onGovRoleChange: (value: string) => void;
  isPending: boolean;
  onApprove: () => void;
  onDecline: () => void;
}) {
  const requestedDate = formatDate(entry.affiliationRequestedAt);
  const requestedLevel = formatGovernmentLevel(entry.requestedGovernmentLevel);
  const currentOrg = entry.affiliationType === 'government_partner' ? organizationOptions.government : organizationOptions.community;

  const orgPickerOptions: ComboboxOption[] = useMemo(
    () => [{ value: '', label: 'Select organization' }, ...currentOrg.map((option) => ({ value: option.id, label: option.label }))],
    [currentOrg],
  );

  return (
    <Panel asChild borderTone="subtle" className="space-y-4">
      <article>
      <header className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-foreground">{entry.displayName}</h3>
          <Badge variant="secondary">{AFFILIATION_LABELS[entry.affiliationType]}</Badge>
        </div>
        {entry.positionTitle ? <p className="text-sm text-muted-foreground">{entry.positionTitle}</p> : null}
        {entry.organizationName ? <p className="text-xs text-muted-foreground">Linked to {entry.organizationName}</p> : null}
        {requestedDate ? (
          <p className="text-xs text-muted-foreground">
            Requested {requestedDate}{' '}
            {entry.requestedOrganizationName
              ? `• ${entry.requestedOrganizationName}`
              : entry.requestedGovernmentName
                ? `• ${entry.requestedGovernmentName}${requestedLevel ? ` (${requestedLevel})` : ''}`
                : null}
          </p>
        ) : null}
      </header>

      <div className="grid gap-4 border-t border-border/20 pt-4 lg:grid-cols-[minmax(0,420px)_auto] lg:items-end">
        <div className="space-y-3">
          <label className="grid gap-2 text-sm text-foreground">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Approved organization</span>
            <Combobox
              value={orgValue}
              onValueChange={onOrgChange}
              options={orgPickerOptions}
              placeholder="Select organization"
              searchPlaceholder="Search organizations…"
              disabled={isPending}
              buttonClassName="rounded-lg"
            />
          </label>

          {entry.affiliationType === 'government_partner' ? (
            <label className="grid gap-2 text-sm text-foreground">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Role type</span>
              <NativeSelect
                value={govRoleValue}
                onChange={(event) => onGovRoleChange(event.target.value)}
                disabled={isPending}
                className="rounded-lg"
              >
                <option value="staff">Public servant / staff</option>
                <option value="politician">Elected leadership</option>
              </NativeSelect>
            </label>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3 lg:justify-end">
          <Button onClick={onApprove} disabled={isPending} className="min-w-[120px]">
            Approve
          </Button>
          <Button variant="outline" onClick={onDecline} disabled={isPending} className="min-w-[120px]">
            Decline
          </Button>
        </div>
      </div>
      </article>
    </Panel>
  );
}
