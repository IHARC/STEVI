'use client';

import { useMemo, useState } from 'react';
import { updateConsentsAction, renewConsentAction, revokeConsentAction } from '@/lib/cases/actions';
import type { ConsentHistoryEntry, ConsentSnapshot } from '@/lib/cases/types';
import type { ConsentMethod, ConsentScope, ConsentStatus } from '@/lib/consents';
import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Button } from '@shared/ui/button';
import { Label } from '@shared/ui/label';
import { Textarea } from '@shared/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@shared/ui/radio-group';
import { Checkbox } from '@shared/ui/checkbox';
import { choiceCardVariants } from '@shared/ui/choice-card';

export type ConsentSettingsProps = {
  personId: number;
  snapshot: ConsentSnapshot;
  policyVersion: string | null;
  history: ConsentHistoryEntry[];
};

export function ConsentSettings({ personId, snapshot, policyVersion, history }: ConsentSettingsProps) {
  const allowedOrgs = snapshot.orgSelections.filter((org) => org.allowed);
  const blockedOrgs = snapshot.orgSelections.filter((org) => !org.allowed);
  const isExpired = snapshot.effectiveStatus === 'expired';
  const isRevoked = snapshot.effectiveStatus === 'revoked';
  const isIharcOnly = snapshot.scope === 'none' && snapshot.effectiveStatus === 'active';

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
          {isExpired ? (
            <Alert variant="destructive">
              <AlertTitle>Consent expired</AlertTitle>
              <AlertDescription>Partner access is paused until you renew your consent.</AlertDescription>
            </Alert>
          ) : null}
          {isRevoked ? (
            <Alert variant="destructive">
              <AlertTitle>Consent revoked</AlertTitle>
              <AlertDescription>Partner organizations no longer have access to your record.</AlertDescription>
            </Alert>
          ) : null}
          {isIharcOnly ? (
            <Alert>
              <AlertTitle>IHARC-only sharing</AlertTitle>
              <AlertDescription>
                Partner organizations cannot view your record until you approve a new request. This can slow referrals.
              </AlertDescription>
            </Alert>
          ) : null}
          <ConsentSummary
            scope={snapshot.scope}
            expiresAt={snapshot.expiresAt}
            status={snapshot.effectiveStatus}
            createdAt={snapshot.createdAt}
            updatedAt={snapshot.updatedAt}
          />
          <ConsentOrgSummary allowedOrgs={allowedOrgs} blockedOrgs={blockedOrgs} totalOrgs={snapshot.orgSelections.length} />
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

      <ConsentHistory history={history} />
    </div>
  );
}

function ConsentStatusBadge({ status }: { status: ConsentStatus | null }) {
  if (!status) {
    return <span>Not recorded</span>;
  }
  if (status === 'active') {
    return <span>Active</span>;
  }
  if (status === 'expired') {
    return <span>Expired</span>;
  }
  return <span>Revoked</span>;
}

function ConsentSummary({
  scope,
  expiresAt,
  status,
  createdAt,
  updatedAt,
}: {
  scope: ConsentScope | null;
  expiresAt: string | null;
  status: ConsentStatus | null;
  createdAt: string | null;
  updatedAt: string | null;
}) {
  const lastUpdated = updatedAt ?? createdAt;
  const scopeLabel = formatScope(scope);
  const statusLabel = formatStatus(status);
  const expiryLabel = expiresAt ? formatDate(expiresAt) : 'Not scheduled';
  const updatedLabel = lastUpdated ? formatDate(lastUpdated) : 'Not recorded';

  return (
    <dl className="grid gap-4 rounded-2xl border border-border/30 bg-muted p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <dt className="text-xs font-semibold uppercase text-muted-foreground">Scope</dt>
        <dd className="mt-1 text-sm font-medium text-foreground">{scopeLabel}</dd>
      </div>
      <div>
        <dt className="text-xs font-semibold uppercase text-muted-foreground">Status</dt>
        <dd className="mt-1 text-sm font-medium text-foreground">{statusLabel}</dd>
      </div>
      <div>
        <dt className="text-xs font-semibold uppercase text-muted-foreground">Last updated</dt>
        <dd className="mt-1 text-sm font-medium text-foreground">{updatedLabel}</dd>
      </div>
      <div>
        <dt className="text-xs font-semibold uppercase text-muted-foreground">Expires</dt>
        <dd className="mt-1 text-sm font-medium text-foreground">{expiryLabel}</dd>
      </div>
    </dl>
  );
}

function ConsentOrgSummary({
  allowedOrgs,
  blockedOrgs,
  totalOrgs,
}: {
  allowedOrgs: Array<{ id: number; name: string | null }>;
  blockedOrgs: Array<{ id: number; name: string | null }>;
  totalOrgs: number;
}) {
  const hasPartners = totalOrgs > 0;

  return (
    <section className="grid gap-4 rounded-2xl border border-border/30 bg-muted p-4 md:grid-cols-2">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-foreground">Organizations with access</p>
          <span>{allowedOrgs.length}</span>
          <span className="text-xs text-muted-foreground">of {totalOrgs}</span>
        </div>
        {!hasPartners ? (
          <p className="text-sm text-muted-foreground">No partner organizations are configured yet.</p>
        ) : allowedOrgs.length ? (
          <ul className="flex flex-wrap gap-2">
            {allowedOrgs.map((org) => (
              <li key={org.id}>
                <span>{org.name ?? `Organization ${org.id}`}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No partner organizations are enabled.</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-foreground">Organizations without access</p>
          <span>{blockedOrgs.length}</span>
        </div>
        {!hasPartners ? (
          <p className="text-sm text-muted-foreground">No partner organizations are configured yet.</p>
        ) : blockedOrgs.length ? (
          <ul className="flex flex-wrap gap-2">
            {blockedOrgs.map((org) => (
              <li key={org.id}>
                <span>{org.name ?? `Organization ${org.id}`}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">All participating partners are allowed.</p>
        )}
      </div>
    </section>
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
  const formKey = useMemo(() => {
    const orgKey = orgSelections.map((org) => `${org.id}:${org.allowed ? '1' : '0'}`).join('|');
    return `${personId}:${consentId ?? 'none'}:${scope}:${preferredContact}:${privacyRestrictions}:${orgKey}`;
  }, [consentId, orgSelections, personId, preferredContact, privacyRestrictions, scope]);

  return (
    <ConsentFormInner
      key={formKey}
      personId={personId}
      consentId={consentId}
      scope={scope}
      orgSelections={orgSelections}
      preferredContact={preferredContact}
      privacyRestrictions={privacyRestrictions}
      policyVersion={policyVersion}
    />
  );
}

function ConsentFormInner({
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
    () => new Set(orgSelections.filter((org) => org.allowed).map((org) => org.id)),
  );
  const [contactMethod, setContactMethod] = useState<string>(preferredContact || 'email');
  const [confirmChecked, setConfirmChecked] = useState(false);

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

      {selectedScope === 'none' ? (
        <Alert>
          <AlertTitle>Partner access disabled</AlertTitle>
          <AlertDescription>
            Partner organizations will need to request consent before they can view your record. This may slow referrals.
          </AlertDescription>
        </Alert>
      ) : null}

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
        <span>I am the client (or authorized representative) and confirm this data-sharing choice. IHARC will update partner access immediately.</span>
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

function ConsentHistory({ history }: { history: ConsentHistoryEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Consent history</CardTitle>
        <CardDescription>Recent consent updates tied to your record.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No consent history recorded yet.</p>
        ) : (
          <ol className="space-y-3">
            {history.map((entry) => {
              const effectiveStatus = resolveEffectiveStatus(entry);
              const showUpdated = entry.updatedAt && entry.updatedAt !== entry.createdAt;
              return (
                <li key={entry.id} className="rounded-2xl border border-border/40 bg-background p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <ConsentStatusBadge status={effectiveStatus} />
                    <span>Scope: {formatScope(entry.scope)}</span>
                    <span>Method: {formatMethod(entry.capturedMethod)}</span>
                  </div>
                  <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                    <p>Captured {formatDate(entry.createdAt)}</p>
                    {showUpdated ? <p>Updated {formatDate(entry.updatedAt!)}</p> : null}
                    {entry.expiresAt ? <p>Expires {formatDate(entry.expiresAt)}</p> : null}
                    {entry.revokedAt ? <p>Revoked {formatDate(entry.revokedAt)}</p> : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

const METHOD_LABELS: Record<ConsentMethod, string> = {
  portal: 'Client portal',
  staff_assisted: 'Staff assisted',
  verbal: 'Verbal',
  documented: 'Documented',
  migration: 'Migration',
};

const DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' });

function resolveEffectiveStatus(entry: ConsentHistoryEntry): ConsentStatus {
  if (entry.status !== 'active') return entry.status;
  if (entry.expiresAt && new Date(entry.expiresAt).getTime() <= Date.now()) {
    return 'expired';
  }
  return entry.status;
}

function formatScope(scope: ConsentScope | null) {
  if (scope === 'all_orgs') return 'All partner orgs';
  if (scope === 'selected_orgs') return 'Selected orgs';
  if (scope === 'none') return 'IHARC only';
  return 'Not recorded';
}

function formatStatus(status: ConsentStatus | null) {
  if (status === 'active') return 'Active';
  if (status === 'expired') return 'Expired';
  if (status === 'revoked') return 'Revoked';
  return 'Not recorded';
}

function formatMethod(method: ConsentMethod) {
  return METHOD_LABELS[method] ?? method;
}

function formatDate(value: string) {
  try {
    return DATE_FORMATTER.format(new Date(value));
  } catch {
    return value;
  }
}
