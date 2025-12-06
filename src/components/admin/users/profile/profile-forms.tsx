'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type EnumOption = { value: string; label: string };
type OrganizationOption = { id: number; name: string };

type ProfileDetails = {
  id: string;
  display_name: string;
  position_title: string | null;
  affiliation_type: string;
  affiliation_status: string;
  organization_id: number | null;
  government_role_type: string | null;
};

type ProfileFormProps = {
  profile: ProfileDetails;
  affiliationTypes: string[];
  affiliationStatuses: string[];
  governmentRoleTypes: string[];
  organizations: OrganizationOption[];
  action: (formData: FormData) => Promise<void>;
};

export function ProfileUpdateForm({
  profile,
  affiliationTypes,
  affiliationStatuses,
  governmentRoleTypes,
  organizations,
  action,
}: ProfileFormProps) {
  const [affiliationType, setAffiliationType] = useState(profile.affiliation_type);
  const [affiliationStatus, setAffiliationStatus] = useState(profile.affiliation_status);
  const [organizationId, setOrganizationId] = useState<string>(profile.organization_id ? String(profile.organization_id) : '');
  const [governmentRole, setGovernmentRole] = useState(profile.government_role_type ?? '');

  const affiliationTypeOptions = useMemo(
    () => affiliationTypes.map((value) => ({ value, label: formatEnumLabel(value.replace('_', ' ')) })),
    [affiliationTypes],
  );
  const affiliationStatusOptions = useMemo(
    () => affiliationStatuses.map((value) => ({ value, label: formatEnumLabel(value) })),
    [affiliationStatuses],
  );
  const governmentRoleOptions = useMemo(
    () => governmentRoleTypes.map((value) => ({ value, label: formatEnumLabel(value) })),
    [governmentRoleTypes],
  );

  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="profile_id" value={profile.id} />
      <input type="hidden" name="affiliation_type" value={affiliationType} />
      <input type="hidden" name="affiliation_status" value={affiliationStatus} />
      <input type="hidden" name="organization_id" value={organizationId} />
      <input type="hidden" name="government_role_type" value={governmentRole} />

      <div className="space-y-1 md:col-span-2">
        <Label htmlFor="display_name">Display name</Label>
        <Input id="display_name" name="display_name" defaultValue={profile.display_name} required />
      </div>
      <div className="space-y-1 md:col-span-2">
        <Label htmlFor="position_title">Title / role</Label>
        <Input
          id="position_title"
          name="position_title"
          defaultValue={profile.position_title ?? ''}
          placeholder="Case worker, partner lead, etc."
        />
      </div>

      <SelectField
        id="affiliation_type"
        label="Affiliation type"
        value={affiliationType}
        options={affiliationTypeOptions}
        onChange={setAffiliationType}
      />

      <SelectField
        id="affiliation_status"
        label="Status"
        value={affiliationStatus}
        options={affiliationStatusOptions}
        onChange={setAffiliationStatus}
      />

      <SelectField
        id="organization_id"
        label="Organization"
        value={organizationId}
        options={[{ value: '', label: 'No organization' }, ...organizations.map((org) => ({ value: String(org.id), label: org.name }))]}
        onChange={setOrganizationId}
      />

      <SelectField
        id="government_role_type"
        label="Government role"
        value={governmentRole}
        options={[{ value: '', label: 'Not applicable' }, ...governmentRoleOptions]}
        onChange={setGovernmentRole}
      />

      <div className="md:col-span-2 flex justify-end gap-2">
        <Button type="submit">Save changes</Button>
      </div>
    </form>
  );
}

type InviteFormProps = {
  profileId: string;
  displayName: string;
  positionTitle: string | null;
  email: string | null;
  affiliationTypes: string[];
  organizations: OrganizationOption[];
  action: (formData: FormData) => Promise<void>;
};

export function InviteUserForm({
  profileId,
  displayName,
  positionTitle,
  email,
  affiliationTypes,
  organizations,
  action,
}: InviteFormProps) {
  const [affiliationType, setAffiliationType] = useState(affiliationTypes[0] ?? '');
  const [organizationId, setOrganizationId] = useState<string>('');

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="invite_display_name" value={displayName} />
      <input type="hidden" name="invite_position_title" value={positionTitle ?? ''} />
      <input type="hidden" name="invite_affiliation_type" value={affiliationType} />
      <input type="hidden" name="invite_organization_id" value={organizationId} />
      <input type="hidden" name="profile_id" value={profileId} />

      <div className="space-y-1">
        <Label htmlFor="invite_email">Email</Label>
        <Input id="invite_email" name="invite_email" type="email" required defaultValue={email ?? ''} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="invite_affiliation_type">Affiliation</Label>
        <Select value={affiliationType} onValueChange={setAffiliationType}>
          <SelectTrigger id="invite_affiliation_type">
            <SelectValue placeholder="Select affiliation" />
          </SelectTrigger>
          <SelectContent>
            {affiliationTypes.map((value) => (
              <SelectItem key={value} value={value}>
                {formatEnumLabel(value.replace('_', ' '))}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="invite_organization_id">Organization</Label>
        <Select value={organizationId} onValueChange={setOrganizationId}>
          <SelectTrigger id="invite_organization_id">
            <SelectValue placeholder="No organization" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">No organization</SelectItem>
            {organizations.map((org) => (
              <SelectItem key={org.id} value={String(org.id)}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="invite_message">Message (optional)</Label>
        <Textarea id="invite_message" name="invite_message" placeholder="Add context or instructions." />
      </div>
      <div className="flex justify-end">
        <Button type="submit">Send invite</Button>
      </div>
    </form>
  );
}

function SelectField({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: EnumOption[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function formatEnumLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
