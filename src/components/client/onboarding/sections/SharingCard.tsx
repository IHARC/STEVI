'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';
import { Badge } from '@shared/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Form } from '@shared/ui/form';
import { RadioGroup, RadioGroupItem } from '@shared/ui/radio-group';
import { Checkbox } from '@shared/ui/checkbox';
import { choiceCardVariants } from '@shared/ui/choice-card';
import { FormSubmit } from './FormSubmit';
import type { OnboardingActionState } from '@/app/(client)/onboarding/actions';
import type { OnboardingActor } from '@/lib/onboarding/utils';
import type { ConsentOrgSelection, ConsentScope } from '@/lib/consents';
import { sharingSchema, type SharingFormValues } from '../schemas';

export type SharingCardProps = {
  onSubmit: (formData: FormData) => void;
  state: OnboardingActionState;
  personId: number | null;
  consentScope: ConsentScope;
  orgSelections: ConsentOrgSelection[];
  policyVersion: string | null;
  actor: OnboardingActor;
  disabled?: boolean;
};

export function SharingCard({
  onSubmit,
  state,
  personId,
  consentScope,
  orgSelections,
  policyVersion,
  actor,
  disabled,
}: SharingCardProps) {
  const orgKey = orgSelections.map((org) => `${org.id}:${org.allowed ? '1' : '0'}`).join('|');
  const formKey = `${personId ?? 'new'}:${consentScope}:${policyVersion ?? 'none'}:${orgKey}`;

  return (
    <SharingCardInner
      key={formKey}
      onSubmit={onSubmit}
      state={state}
      personId={personId}
      consentScope={consentScope}
      orgSelections={orgSelections}
      policyVersion={policyVersion}
      actor={actor}
      disabled={disabled}
    />
  );
}

function SharingCardInner({
  onSubmit,
  state,
  personId,
  consentScope,
  orgSelections,
  policyVersion,
  actor,
  disabled,
}: SharingCardProps) {
  const partnerBlocked = actor === 'partner';
  const [selectedScope, setSelectedScope] = useState<ConsentScope>(consentScope);
  const [allowedOrgIds, setAllowedOrgIds] = useState<Set<number>>(
    () => new Set(orgSelections.filter((org) => org.allowed).map((org) => org.id)),
  );
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [staffAttested, setStaffAttested] = useState(false);

  const form = useForm<SharingFormValues>({
    resolver: zodResolver(sharingSchema),
    defaultValues: {
      person_id: personId ? String(personId) : '',
      consent_scope: consentScope,
      org_allowed_ids: orgSelections.filter((org) => org.allowed).map((org) => String(org.id)),
      consent_confirm: false,
    },
  });

  useEffect(() => {
    form.setValue('consent_scope', selectedScope);
  }, [form, selectedScope]);

  useEffect(() => {
    form.setValue('org_allowed_ids', Array.from(allowedOrgIds).map((id) => String(id)));
  }, [allowedOrgIds, form]);

  useEffect(() => {
    form.setValue('consent_confirm', confirmChecked);
  }, [confirmChecked, form]);

  const orgCount = orgSelections.length;
  const allOrgIds = useMemo(() => orgSelections.map((org) => org.id), [orgSelections]);
  const orgSelectionError = form.formState.errors.org_allowed_ids?.message;
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

  const handleValidation = async (event: FormEvent<HTMLFormElement>) => {
    const valid = await form.trigger();
    if (!valid) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <Card className="border-border/40 bg-background">
      <CardHeader>
        <CardTitle className="text-xl">3. Data sharing</CardTitle>
        <CardDescription>Choose who can access your IHARC record.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form action={onSubmit} className="space-y-4" onSubmit={handleValidation}>
            <input type="hidden" name="person_id" value={personId ? String(personId) : ''} />
            <input type="hidden" name="consent_scope" value={selectedScope} />
            <input type="hidden" name="consent_confirm" value={confirmChecked ? 'on' : ''} />
            {actor === 'staff' ? (
              <input type="hidden" name="attested_by_staff" value={staffAttested ? 'on' : ''} />
            ) : null}
            {policyVersion ? <input type="hidden" name="policy_version" value={policyVersion} /> : null}
            {Array.from(allowedOrgIds).map((orgId) => (
              <input key={`org-${orgId}`} type="hidden" name="org_allowed_ids" value={orgId} />
            ))}

            <fieldset disabled={disabled || partnerBlocked} className="space-y-4">
              {partnerBlocked ? (
                <Alert variant="destructive">
                  <AlertTitle>Partner accounts cannot set sharing</AlertTitle>
                  <AlertDescription>
                    Sharing preferences must be set by the client or IHARC staff. Ask them to complete onboarding.
                  </AlertDescription>
                </Alert>
              ) : null}

              <section className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">Sharing scope</p>
                  <p className="text-sm text-muted-foreground">Default is to share with all participating organizations.</p>
                </div>
                <RadioGroup value={selectedScope} onValueChange={(value) => handleScopeChange(value as ConsentScope)}>
                  <label className={choiceCardVariants({ surface: 'background', padding: 'compact' })}>
                    <RadioGroupItem value="all_orgs" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-base font-medium">All participating orgs</p>
                        <Badge variant="outline">Recommended</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Fastest referrals and coordinated care.</p>
                    </div>
                  </label>
                  <label className={choiceCardVariants({ surface: 'background', padding: 'compact' })}>
                    <RadioGroupItem value="selected_orgs" />
                    <div>
                      <p className="text-base font-medium">Only selected orgs</p>
                      <p className="text-sm text-muted-foreground">Pick specific partners that can access your record.</p>
                    </div>
                  </label>
                  <label className={choiceCardVariants({ surface: 'background', padding: 'compact' })}>
                    <RadioGroupItem value="none" />
                    <div>
                      <p className="text-base font-medium">IHARC only</p>
                      <p className="text-sm text-muted-foreground">Partners must request consent before access.</p>
                    </div>
                  </label>
                </RadioGroup>
              </section>

              <section className="space-y-3">
                <Alert className="border-border/40 bg-muted/30">
                  <AlertTitle>Why this matters</AlertTitle>
                  <AlertDescription>
                    Sharing lets IHARC coordinate care with partner organizations you already work with. You stay in control
                    and can update these choices later.
                  </AlertDescription>
                </Alert>
                {selectedScope === 'none' ? (
                  <Alert variant="destructive">
                    <AlertTitle>IHARC-only access</AlertTitle>
                    <AlertDescription>
                      Partner organizations cannot view your record without a new consent request, which can slow referrals
                      and coordinated care.
                    </AlertDescription>
                  </Alert>
                ) : null}
              </section>

              <section className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">Participating organizations</p>
                  <p className="text-sm text-muted-foreground">
                    {orgCount ? 'Toggle access for each partner.' : 'No partner organizations configured.'}
                  </p>
                </div>
                <div className="grid gap-2">
                  {orgSelections.map((org) => {
                    const checked = allowedOrgIds.has(org.id);
                    return (
                      <label key={org.id} className="flex items-start gap-3 rounded-2xl border border-border/50 bg-muted/30 p-3">
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
                {orgSelectionError ? <p className="text-sm text-destructive">{orgSelectionError}</p> : null}
              </section>

              <label className="flex items-start gap-3 rounded-2xl border border-border/30 bg-muted p-4 text-sm text-foreground">
                <Checkbox checked={confirmChecked} onCheckedChange={(value) => setConfirmChecked(Boolean(value))} className="mt-1" />
                <span>I am the client (or authorized representative) and confirm this data-sharing choice.</span>
              </label>
              {actor === 'staff' ? (
                <label className="flex items-start gap-3 rounded-2xl border border-border/30 bg-muted p-4 text-sm text-foreground">
                  <Checkbox checked={staffAttested} onCheckedChange={(value) => setStaffAttested(Boolean(value))} className="mt-1" />
                  <span>I confirm the client is present and I explained consent in plain language.</span>
                </label>
              ) : null}
            </fieldset>

            {state.status === 'error' ? (
              <Alert variant="destructive">
                <AlertTitle>Unable to save preference</AlertTitle>
                <AlertDescription>{state.message ?? 'Try again in a moment.'}</AlertDescription>
              </Alert>
            ) : null}
            {state.status === 'success' ? (
              <Alert variant="default" className="border-primary/30 bg-primary/10 text-primary">
                <AlertTitle>Sharing preference saved</AlertTitle>
                <AlertDescription>Your choice is recorded.</AlertDescription>
              </Alert>
            ) : null}

            <FormSubmit
              disabled={
                disabled ||
                partnerBlocked ||
                !confirmChecked ||
                requiresSelection ||
                (actor === 'staff' && !staffAttested)
              }
              pendingLabel="Saving…"
            >
              Save preference
            </FormSubmit>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
