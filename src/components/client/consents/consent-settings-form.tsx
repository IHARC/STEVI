'use client';

import { useEffect, useMemo, useState } from 'react';
import { updateConsentsAction, renewConsentAction, revokeConsentAction } from '@/lib/cases/actions';
import type { ConsentSnapshot } from '@/lib/cases/types';
import type { ConsentScope, ConsentStatus } from '@/lib/consents';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Button } from '@shared/ui/button';
import { Label } from '@shared/ui/label';
import { Textarea } from '@shared/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@shared/ui/radio-group';
import { Checkbox } from '@shared/ui/checkbox';
import { choiceCardVariants } from '@shared/ui/choice-card';
import { Badge } from '@shared/ui/badge';

export type ConsentSettingsProps = {
  personId: number;
  snapshot: ConsentSnapshot;
  policyVersion: string | null;
};

export function ConsentSettings({ personId, snapshot, policyVersion }: ConsentSettingsProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-lg">Sharing and contact preferences</CardTitle>
            <ConsentStatusBadge status={snapshot.effectiveStatus} />
          </div>
          <CardDescription>
            Updates take effect immediately and are recorded in the audit log. Consent expires automatically and must be renewed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ConsentSummary scope={snapshot.scope} expiresAt={snapshot.expiresAt} status={snapshot.effectiveStatus} />
          <ConsentForm
            personId={personId}
            consentId={snapshot.consentId}
            scope={snapshot.scope ?? 'all_orgs'}
            orgSelections={snapshot.orgSelections}
            preferredContact={snapshot.preferredContactMethod ?? 'email'}
            privacyRestrictions={snapshot.privacyRestrictions ?? ''}
            policyVersion={policyVersion}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Consent actions</CardTitle>
          <CardDescription>Renew or withdraw consent. Changes apply immediately.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <RenewConsentForm consentId={snapshot.consentId} />
          <RevokeConsentForm consentId={snapshot.consentId} />
        </CardContent>
      </Card>
    </div>
  );
}

function ConsentStatusBadge({ status }: { status: ConsentStatus | null }) {
  if (!status) {
    return <Badge variant="secondary">Not recorded</Badge>;
  }
  if (status === 'active') {
    return <Badge variant="default">Active</Badge>;
  }
  if (status === 'expired') {
    return <Badge variant="destructive">Expired</Badge>;
  }
  return <Badge variant="secondary">Revoked</Badge>;
}

function ConsentSummary({
  scope,
  expiresAt,
  status,
}: {
  scope: ConsentScope | null;
  expiresAt: string | null;
  status: ConsentStatus | null;
}) {
  const expiryLabel = expiresAt
    ? new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' }).format(new Date(expiresAt))
    : 'Not set';
  const scopeLabel =
    scope === 'all_orgs'
      ? 'All partner orgs'
      : scope === 'selected_orgs'
        ? 'Selected orgs'
        : scope === 'none'
          ? 'IHARC only'
          : 'Not set';

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/40 bg-muted/30 p-3 text-sm text-foreground/80">
      <div>
        <span className="font-semibold text-foreground">Scope:</span> {scopeLabel}
      </div>
      <div>
        <span className="font-semibold text-foreground">Expiry:</span> {expiryLabel}
      </div>
      <div>
        <span className="font-semibold text-foreground">Status:</span> {status ?? 'Not recorded'}
      </div>
    </div>
  );
}

function ConsentForm({
  personId,
  consentId,
  scope,
  orgSelections,
  preferredContact,
  privacyRestrictions,
  policyVersion,
}: {
  personId: number;
  consentId: string | null;
  scope: ConsentScope;
  orgSelections: Array<{ id: number; name: string | null; allowed: boolean }>;
  preferredContact: string;
  privacyRestrictions: string;
  policyVersion: string | null;
}) {
  const [selectedScope, setSelectedScope] = useState<ConsentScope>(scope);
  const [allowedOrgIds, setAllowedOrgIds] = useState<Set<number>>(
    new Set(orgSelections.filter((org) => org.allowed).map((org) => org.id)),
  );
  const [contactMethod, setContactMethod] = useState<string>(preferredContact || 'email');
  const [confirmChecked, setConfirmChecked] = useState(false);

  useEffect(() => {
    setSelectedScope(scope);
    setAllowedOrgIds(new Set(orgSelections.filter((org) => org.allowed).map((org) => org.id)));
    setContactMethod(preferredContact || 'email');
    setConfirmChecked(false);
  }, [scope, orgSelections]);

  const orgCount = orgSelections.length;
  const allOrgIds = useMemo(() => orgSelections.map((org) => org.id), [orgSelections]);
  const requiresSelection = selectedScope === 'selected_orgs' && allowedOrgIds.size === 0;

  const handleScopeChange = (value: ConsentScope) => {
    setSelectedScope(value);
    if (value === 'all_orgs') {
      setAllowedOrgIds(new Set(allOrgIds));
    }
    if (value === 'none') {
      setAllowedOrgIds(new Set());
    }
  };

  const toggleOrg = (orgId: number, next: boolean) => {
    setAllowedOrgIds((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(orgId);
      else copy.delete(orgId);
      return copy;
    });
  };

  return (
    <form action={updateConsentsAction} className="space-y-6">
      <input type="hidden" name="person_id" value={personId} />
      {policyVersion ? <input type="hidden" name="policy_version" value={policyVersion} /> : null}
      {consentId ? <input type="hidden" name="consent_id" value={consentId} /> : null}
      <input type="hidden" name="consent_scope" value={selectedScope} />
      <input type="hidden" name="consent_confirm" value={confirmChecked ? 'on' : ''} />
      <input type="hidden" name="preferred_contact" value={contactMethod} />
      {Array.from(allowedOrgIds).map((orgId) => (
        <input key={`org-${orgId}`} type="hidden" name="org_allowed_ids" value={orgId} />
      ))}

      <section className="space-y-3 rounded-2xl border border-border/30 bg-muted p-4">
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">Data sharing scope</p>
          <p className="text-sm text-muted-foreground">Choose how broadly IHARC can share your information with partner organizations.</p>
        </div>
        <RadioGroup value={selectedScope} onValueChange={(value) => handleScopeChange(value as ConsentScope)}>
          <label className={choiceCardVariants({ surface: 'background', padding: 'compact' })}>
            <RadioGroupItem value="all_orgs" />
            <div>
              <p className="text-base font-medium">Share with all participating orgs</p>
              <p className="text-sm text-muted-foreground">Fastest referrals and coordinated care.</p>
            </div>
          </label>
          <label className={choiceCardVariants({ surface: 'background', padding: 'compact' })}>
            <RadioGroupItem value="selected_orgs" />
            <div>
              <p className="text-base font-medium">Share with selected orgs only</p>
              <p className="text-sm text-muted-foreground">Choose which partners can access your record.</p>
            </div>
          </label>
          <label className={choiceCardVariants({ surface: 'background', padding: 'compact' })}>
            <RadioGroupItem value="none" />
            <div>
              <p className="text-base font-medium">IHARC only</p>
              <p className="text-sm text-muted-foreground">Partners cannot access your record without a new request.</p>
            </div>
          </label>
        </RadioGroup>
      </section>

      <section className="space-y-3 rounded-2xl border border-border/30 bg-muted p-4">
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">Participating organizations</p>
          <p className="text-sm text-muted-foreground">
            {orgCount ? 'Toggle access for each partner.' : 'No partner organizations configured.'}
          </p>
        </div>
        <div className="grid gap-2">
          {orgSelections.map((org) => {
            const checked = allowedOrgIds.has(org.id);
            return (
              <label key={org.id} className="flex items-start gap-3 rounded-2xl border border-border/40 bg-background p-3">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value) => toggleOrg(org.id, Boolean(value))}
                  disabled={selectedScope === 'none'}
                  className="mt-1"
                />
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">{org.name ?? `Organization ${org.id}`}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedScope === 'all_orgs'
                      ? checked
                        ? 'Allowed'
                        : 'Excluded'
                      : selectedScope === 'selected_orgs'
                        ? checked
                          ? 'Selected'
                          : 'Not selected'
                        : 'Sharing disabled'}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
        {requiresSelection ? <p className="text-sm text-destructive">Select at least one organization.</p> : null}
      </section>

      <section className="space-y-3 rounded-2xl border border-border/30 bg-muted p-4">
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">Preferred contact</p>
          <p className="text-sm text-muted-foreground">Choose how IHARC should reach you for updates and check-ins.</p>
        </div>
        <RadioGroup value={contactMethod} onValueChange={setContactMethod} className="grid gap-3 md:grid-cols-2">
          {['email', 'phone', 'both', 'none'].map((option) => (
            <label key={option} className={choiceCardVariants({ surface: 'background', padding: 'compact' })}>
              <RadioGroupItem value={option} />
              <div>
                <p className="text-base font-medium capitalize">{option}</p>
                <p className="text-sm text-muted-foreground">
                  {option === 'none'
                    ? 'We will not call or message you. Updates happen in person or via the portal.'
                    : option === 'both'
                      ? 'Use both phone and email depending on urgency.'
                      : `Prefer ${option} for routine updates.`}
                </p>
              </div>
            </label>
          ))}
        </RadioGroup>
      </section>

      <section className="space-y-1 rounded-2xl border border-border/30 bg-muted p-4">
        <Label htmlFor="privacy_restrictions" className="text-base">
          Privacy notes
        </Label>
        <p className="text-sm text-muted-foreground">Add safety notes or restrictions (e.g., “Do not leave voicemail”).</p>
        <Textarea
          id="privacy_restrictions"
          name="privacy_restrictions"
          defaultValue={privacyRestrictions}
          rows={4}
          placeholder="Any limits we must follow when contacting you."
        />
      </section>

      <label className="flex items-start gap-3 rounded-2xl border border-border/30 bg-muted p-4 text-sm text-foreground">
        <Checkbox checked={confirmChecked} onCheckedChange={(value) => setConfirmChecked(Boolean(value))} className="mt-1" />
        <span>I understand and confirm this data-sharing choice. IHARC will update partner access immediately.</span>
      </label>

      <Button type="submit" className="w-fit px-6" disabled={!confirmChecked || requiresSelection}>
        Save preferences
      </Button>
    </form>
  );
}

function RenewConsentForm({ consentId }: { consentId: string | null }) {
  return (
    <form action={renewConsentAction} className="space-y-3 rounded-2xl border border-border/30 bg-muted p-4">
      {consentId ? <input type="hidden" name="consent_id" value={consentId} /> : null}
      <p className="text-sm text-foreground/80">Extend your consent for another term without changing your selections.</p>
      <Button type="submit" disabled={!consentId} className="w-full">
        Renew consent
      </Button>
    </form>
  );
}

function RevokeConsentForm({ consentId }: { consentId: string | null }) {
  const [confirmChecked, setConfirmChecked] = useState(false);

  return (
    <form action={revokeConsentAction} className="space-y-3 rounded-2xl border border-border/30 bg-muted p-4">
      {consentId ? <input type="hidden" name="consent_id" value={consentId} /> : null}
      <input type="hidden" name="revoke_confirm" value={confirmChecked ? 'on' : ''} />
      <p className="text-sm text-foreground/80">
        Withdraw consent so partner organizations can no longer access your record. This takes effect immediately.
      </p>
      <label className="flex items-start gap-3 text-sm text-foreground">
        <Checkbox checked={confirmChecked} onCheckedChange={(value) => setConfirmChecked(Boolean(value))} className="mt-1" />
        <span>I understand that partner organizations will lose access.</span>
      </label>
      <Button type="submit" variant="destructive" disabled={!consentId || !confirmChecked} className="w-full">
        Withdraw consent
      </Button>
    </form>
  );
}
