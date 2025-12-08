'use client';

import { useState } from 'react';
import { Button } from '@shared/ui/button';
import { Checkbox } from '@shared/ui/checkbox';
import { Label } from '@shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import { Textarea } from '@shared/ui/textarea';

type ConsentOverrideFormProps = {
  personId: number;
  dataSharingConsent: boolean;
  preferredContactMethod: string | null;
  privacyRestrictions: string | null;
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

export function ConsentOverrideForm({
  personId,
  dataSharingConsent,
  preferredContactMethod,
  privacyRestrictions,
  action,
  submitLabel = 'Save override',
  className,
}: ConsentOverrideFormProps) {
  const [sharing, setSharing] = useState<boolean>(Boolean(dataSharingConsent));
  const [preferredContact, setPreferredContact] = useState<string>(preferredContactMethod ?? 'email');

  return (
    <form action={action} className={className ?? 'space-y-3'}>
      <input type="hidden" name="person_id" value={personId} />
      <input type="hidden" name="data_sharing" value={sharing ? 'on' : 'off'} />
      <input type="hidden" name="preferred_contact" value={preferredContact} />

      <label className="flex items-center gap-3 text-sm text-foreground">
        <Checkbox
          checked={sharing}
          onCheckedChange={(value) => setSharing(Boolean(value))}
          aria-label="Allow data sharing"
        />
        <span>Allow data sharing</span>
      </label>

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
          placeholder="Document verbal consent changes or safety constraints."
        />
      </div>

      <Button type="submit" className="w-full">
        {submitLabel}
      </Button>
    </form>
  );
}
