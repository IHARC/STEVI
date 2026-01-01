'use client';

import { useActionState, useMemo, useState } from 'react';
import { Button } from '@shared/ui/button';
import { Checkbox } from '@shared/ui/checkbox';
import { Label } from '@shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import { Textarea } from '@shared/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@shared/ui/radio-group';
import { choiceCardVariants } from '@shared/ui/choice-card';
import type { ConsentOrgSelection, ConsentScope } from '@/lib/consents';
import type { ActionState } from '@/lib/server-actions/validate';

type ConsentOverrideFormProps = {
  personId: number;
  consentScope: ConsentScope;
  orgSelections: ConsentOrgSelection[];
  preferredContactMethod: string | null;
  privacyRestrictions: string | null;
  policyVersion: string | null;
  action: (formData: FormData) => Promise<ActionState<{ message?: string }>>;
  submitLabel?: string;
  className?: string;
};

type ConsentOverrideState = ActionState<{ message?: string }>;

const initialState: ConsentOverrideState = { status: 'idle' };

const CONTACT_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'both', label: 'Both' },
  { value: 'none', label: 'None' },
];

const METHOD_OPTIONS = [
  { value: 'documented', label: 'Documented' },
  { value: 'verbal', label: 'Verbal' },
  { value: 'staff_assisted', label: 'Staff assisted' },
];

export function ConsentOverrideForm({
  personId,
  consentScope,
  orgSelections,
  preferredContactMethod,
  privacyRestrictions,
  policyVersion,
  action,
  submitLabel = 'Save override',
  className,
}: ConsentOverrideFormProps) {
  const orgKey = orgSelections.map((org) => `${org.id}:${org.allowed ? '1' : '0'}`).join('|');
  const formKey = `${personId}:${consentScope}:${preferredContactMethod ?? 'none'}:${privacyRestrictions ?? ''}:${orgKey}`;

  return (
    <ConsentOverrideFormInner
      key={formKey}
      personId={personId}
      consentScope={consentScope}
      orgSelections={orgSelections}
      preferredContactMethod={preferredContactMethod}
      privacyRestrictions={privacyRestrictions}
      policyVersion={policyVersion}
      action={action}
      submitLabel={submitLabel}
      className={className}
    />
  );
}

function ConsentOverrideFormInner({
  personId,
  consentScope,
  orgSelections,
  preferredContactMethod,
  privacyRestrictions,
  policyVersion,
  action,
  submitLabel = 'Save override',
  className,
}: ConsentOverrideFormProps) {
  const [state, formAction] = useActionState(
    (_prev: ConsentOverrideState, formData: FormData) => action(formData),
    initialState,
  );
  const [selectedScope, setSelectedScope] = useState<ConsentScope>(consentScope);
  const [allowedOrgIds, setAllowedOrgIds] = useState<Set<number>>(
    () => new Set(orgSelections.filter((org) => org.allowed).map((org) => org.id)),
  );
  const [preferredContact, setPreferredContact] = useState<string>(preferredContactMethod ?? 'email');
  const [consentMethod, setConsentMethod] = useState<string>('documented');
  const [staffAttested, setStaffAttested] = useState(false);
  const [clientAttested, setClientAttested] = useState(false);
  const resolvedState = 'status' in state ? null : state;
  const errorMessage = resolvedState && !resolvedState.ok ? resolvedState.error : null;
  const successMessage = resolvedState && resolvedState.ok ? resolvedState.data?.message : null;

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
    <form action={formAction} className={className ?? 'space-y-4'}>
      <input type="hidden" name="person_id" value={personId} />
      <input type="hidden" name="consent_scope" value={selectedScope} />
      <input type="hidden" name="preferred_contact" value={preferredContact} />
      <input type="hidden" name="consent_method" value={consentMethod} />
      <input type="hidden" name="consent_confirm" value={staffAttested && clientAttested ? 'on' : ''} />
      <input type="hidden" name="attested_by_staff" value={staffAttested ? 'on' : ''} />
      <input type="hidden" name="attested_by_client" value={clientAttested ? 'on' : ''} />
      {policyVersion ? <input type="hidden" name="policy_version" value={policyVersion} /> : null}
      {Array.from(allowedOrgIds).map((orgId) => (
        <input key={`org-${orgId}`} type="hidden" name="org_allowed_ids" value={orgId} />
      ))}

      <section className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Consent scope</Label>
          <p className="text-xs text-muted-foreground">Document the scope the client agreed to.</p>
        </div>
        <RadioGroup value={selectedScope} onValueChange={(value) => handleScopeChange(value as ConsentScope)}>
          <label className={choiceCardVariants({ surface: 'background', padding: 'compact' })}>
            <RadioGroupItem value="all_orgs" />
            <div>
              <p className="text-sm font-medium">All participating orgs</p>
              <p className="text-xs text-muted-foreground">Default consent across partners.</p>
            </div>
          </label>
          <label className={choiceCardVariants({ surface: 'background', padding: 'compact' })}>
            <RadioGroupItem value="selected_orgs" />
            <div>
              <p className="text-sm font-medium">Selected orgs</p>
              <p className="text-xs text-muted-foreground">Only specific partners can access.</p>
            </div>
          </label>
          <label className={choiceCardVariants({ surface: 'background', padding: 'compact' })}>
            <RadioGroupItem value="none" />
            <div>
              <p className="text-sm font-medium">IHARC only</p>
              <p className="text-xs text-muted-foreground">No partner access.</p>
            </div>
          </label>
        </RadioGroup>
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Participating organizations</Label>
          <p className="text-xs text-muted-foreground">
            {orgCount ? 'Toggle access for each partner.' : 'No partner organizations configured.'}
          </p>
        </div>
        <div className="grid gap-2">
          {orgSelections.map((org) => {
            const checked = allowedOrgIds.has(org.id);
            return (
              <label key={org.id} className="flex items-start gap-3 rounded-2xl border border-border/40 bg-muted/40 p-3">
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
        {requiresSelection ? <p className="text-xs text-destructive">Select at least one organization.</p> : null}
      </section>

      <div className="space-y-1">
        <Label className="text-xs">Consent method</Label>
        <Select value={consentMethod} onValueChange={setConsentMethod}>
          <SelectTrigger>
            <SelectValue placeholder="Select consent method" />
          </SelectTrigger>
          <SelectContent>
            {METHOD_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Preferred contact</Label>
        <Select value={preferredContact} onValueChange={setPreferredContact}>
          <SelectTrigger>
            <SelectValue placeholder="Select contact method" />
          </SelectTrigger>
          <SelectContent>
            {CONTACT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor={`privacy_${personId}`} className="text-xs">
          Privacy notes
        </Label>
        <Textarea
          id={`privacy_${personId}`}
          name="privacy_restrictions"
          defaultValue={privacyRestrictions ?? ''}
          rows={3}
          placeholder="Safety constraints or contact restrictions."
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor={`consent_notes_${personId}`} className="text-xs">
          Consent notes
        </Label>
        <Textarea
          id={`consent_notes_${personId}`}
          name="consent_notes"
          rows={3}
          placeholder="Document the consent conversation or evidence."
        />
      </div>

      <section className="space-y-2 rounded-2xl border border-border/40 bg-muted/30 p-3 text-sm text-foreground">
        <p className="font-semibold">Required attestations</p>
        <label className="flex items-start gap-3">
          <Checkbox checked={staffAttested} onCheckedChange={(value) => setStaffAttested(Boolean(value))} className="mt-1" />
          <span>I confirm the client was present and consent was explained in plain language.</span>
        </label>
        <label className="flex items-start gap-3">
          <Checkbox checked={clientAttested} onCheckedChange={(value) => setClientAttested(Boolean(value))} className="mt-1" />
          <span>The client confirms they understand and agree to these sharing selections.</span>
        </label>
      </section>

      <Button type="submit" className="w-full" disabled={!staffAttested || !clientAttested || requiresSelection}>
        {submitLabel}
      </Button>
      {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}
      {successMessage ? <p className="text-xs text-emerald-600">{successMessage}</p> : null}
    </form>
  );
}
