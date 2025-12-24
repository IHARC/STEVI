'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@shared/ui/button';
import { Checkbox } from '@shared/ui/checkbox';
import { Label } from '@shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import { Textarea } from '@shared/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@shared/ui/radio-group';
import { choiceCardVariants } from '@shared/ui/choice-card';
import type { ConsentOrgSelection, ConsentScope } from '@/lib/consents';

type ConsentOverrideFormProps = {
  personId: number;
  consentScope: ConsentScope;
  orgSelections: ConsentOrgSelection[];
  preferredContactMethod: string | null;
  privacyRestrictions: string | null;
  policyVersion: string | null;
  action: (formData: FormData) => Promise<void>;
  submitLabel?: string;
  className?: string;
};

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
  { value: 'portal', label: 'Portal' },
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
  const [selectedScope, setSelectedScope] = useState<ConsentScope>(consentScope);
  const [allowedOrgIds, setAllowedOrgIds] = useState<Set<number>>(
    new Set(orgSelections.filter((org) => org.allowed).map((org) => org.id)),
  );
  const [preferredContact, setPreferredContact] = useState<string>(preferredContactMethod ?? 'email');
  const [consentMethod, setConsentMethod] = useState<string>('documented');
  const [confirmChecked, setConfirmChecked] = useState(false);

  useEffect(() => {
    setSelectedScope(consentScope);
    setAllowedOrgIds(new Set(orgSelections.filter((org) => org.allowed).map((org) => org.id)));
    setPreferredContact(preferredContactMethod ?? 'email');
    setConfirmChecked(false);
  }, [consentScope, orgSelections, preferredContactMethod]);

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
    <form action={action} className={className ?? 'space-y-4'}>
      <input type="hidden" name="person_id" value={personId} />
      <input type="hidden" name="consent_scope" value={selectedScope} />
      <input type="hidden" name="preferred_contact" value={preferredContact} />
      <input type="hidden" name="consent_method" value={consentMethod} />
      <input type="hidden" name="consent_confirm" value={confirmChecked ? 'on' : ''} />
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

      <label className="flex items-start gap-3 text-sm text-foreground">
        <Checkbox checked={confirmChecked} onCheckedChange={(value) => setConfirmChecked(Boolean(value))} className="mt-1" />
        <span>I confirm this consent was captured and documented appropriately.</span>
      </label>

      <Button type="submit" className="w-full" disabled={!confirmChecked || requiresSelection}>
        {submitLabel}
      </Button>
    </form>
  );
}
