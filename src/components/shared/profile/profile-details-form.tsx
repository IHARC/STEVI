'use client';

import { startTransition, useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import { RadioGroup, RadioGroupItem } from '@shared/ui/radio-group';
import type { Database } from '@/types/supabase';
import {
  NEW_ORGANIZATION_VALUE,
  NO_ORGANIZATION_VALUE,
  PUBLIC_MEMBER_ROLE_LABEL,
} from '@/lib/constants';
import type { LivedExperienceStatus } from '@/lib/lived-experience';

export type ProfileDetailsFormState = {
  status: 'idle' | 'success';
  error?: string;
  message?: string;
};

type Organization = {
  id: string;
  name: string;
};

type AffiliationType = Database['portal']['Enums']['affiliation_type'];
type AffiliationStatus = Database['portal']['Enums']['affiliation_status'];

type ProfileDetailsFormProps = {
  organizations: Organization[];
  initialState: ProfileDetailsFormState;
  action: (state: ProfileDetailsFormState, formData: FormData) => Promise<ProfileDetailsFormState>;
  initialValues: {
    displayName: string;
    organizationId: string | null;
    positionTitle: string | null;
    affiliationType: AffiliationType;
    homelessnessExperience: LivedExperienceStatus;
    substanceUseExperience: LivedExperienceStatus;
    affiliationStatus: AffiliationStatus;
    requestedOrganizationName: string | null;
  };
  affiliationOptions: { value: AffiliationType; label: string }[];
  livedExperienceOptions: { value: LivedExperienceStatus; label: string; description: string }[];
};

export function ProfileDetailsForm({
  organizations,
  initialState,
  action,
  initialValues,
  affiliationOptions,
  livedExperienceOptions,
}: ProfileDetailsFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  const initialOrgSelection =
    initialValues.organizationId ??
    (initialValues.requestedOrganizationName ? NEW_ORGANIZATION_VALUE : NO_ORGANIZATION_VALUE);

  const allowedAffiliationSet = new Set(affiliationOptions.map((opt) => opt.value));
  const [selectedOrg, setSelectedOrg] = useState(initialOrgSelection);
  const initialAffiliation = allowedAffiliationSet.has(initialValues.affiliationType)
    ? initialValues.affiliationType
    : affiliationOptions[0]?.value ?? 'community_member';
  const [affiliationType, setAffiliationType] = useState<AffiliationType>(initialAffiliation);
  const [homelessnessExperience, setHomelessnessExperience] = useState<LivedExperienceStatus>(
    initialValues.homelessnessExperience,
  );
  const [substanceUseExperience, setSubstanceUseExperience] = useState<LivedExperienceStatus>(
    initialValues.substanceUseExperience,
  );

  useEffect(() => {
    if (affiliationType === 'community_member') {
      startTransition(() => {
        setSelectedOrg(NO_ORGANIZATION_VALUE);
      });
    }
  }, [affiliationType]);

  const isAgencyPartner = affiliationType !== 'community_member';
  const requestingNewOrganization = selectedOrg === NEW_ORGANIZATION_VALUE;
  const organizationMap = new Map(organizations.map((org) => [org.id, org.name]));
  const hideRoleField = affiliationType === 'community_member';
  const pendingVerificationCopy =
    initialValues.affiliationStatus === 'pending'
      ? pendingSummary({
          affiliationType: initialAffiliation,
          organizationId: initialValues.organizationId,
          requestedOrganizationName: initialValues.requestedOrganizationName,
          organizationMap,
        })
      : null;

  return (
    <form
      action={formAction}
      className="space-y-6 rounded-3xl border border-border/40 bg-background p-6 shadow-sm"
    >
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-medium text-foreground">Profile details</h2>
        <p className="text-sm text-muted-foreground">
          Update how neighbours see you in STEVI and confirm the IHARC role you collaborate with.
        </p>
      </div>

      {pendingVerificationCopy ? (
        <Alert className="border-primary bg-primary/10 text-sm text-primary">
          <AlertTitle>Verification in progress</AlertTitle>
          <AlertDescription>{pendingVerificationCopy}</AlertDescription>
        </Alert>
      ) : null}

      {state.status === 'success' && state.message ? (
        <Alert className="border-primary bg-primary/10 text-sm text-primary">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      {state.error ? (
        <Alert variant="destructive" className="text-sm">
          <AlertTitle>We could not save your updates</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="display_name">Display name</Label>
        <Input
          id="display_name"
          name="display_name"
          required
          defaultValue={initialValues.displayName}
          maxLength={80}
          placeholder="How should neighbours refer to you?"
        />
      </div>

      <div className="grid gap-3">
        <Label>How do you collaborate with IHARC?</Label>
        <RadioGroup
          name="affiliation_type"
          value={affiliationType}
          onValueChange={(value) => setAffiliationType(value as AffiliationType)}
          className="grid gap-3 md:grid-cols-2"
        >
          {affiliationOptions.map((option) => (
            <AffiliationOption
              key={option.value}
              id={`profile-affiliation-${option.value}`}
              value={option.value}
              title={option.label}
              description={`Collaborate as ${option.label}.`}
            />
          ))}
        </RadioGroup>
      </div>

      {isAgencyPartner ? (
        <div className="space-y-3 rounded-xl border border-border/40 p-4">
          <div className="grid gap-2">
            <Label htmlFor="agency_organization_id">Partner organization</Label>
            <Select name="agency_organization_id" value={selectedOrg} onValueChange={setSelectedOrg}>
              <SelectTrigger id="agency_organization_id">
                <SelectValue placeholder="Select your organization" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_ORGANIZATION_VALUE} disabled>
                  Select your organization
                </SelectItem>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
                <SelectItem value={NEW_ORGANIZATION_VALUE}>Request a new organization</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {requestingNewOrganization ? (
            <div className="grid gap-2">
              <Label htmlFor="new_organization_name">Organization name</Label>
              <Input
                id="new_organization_name"
                name="new_organization_name"
                placeholder="Northumberland Outreach Network"
                minLength={3}
                required
                defaultValue={initialValues.requestedOrganizationName ?? ''}
              />
            </div>
          ) : (
            <input type="hidden" name="new_organization_name" value="" />
          )}

          <div className="grid gap-2">
            <Label htmlFor="position_title">Role or position</Label>
            <Input
              id="position_title"
              name="position_title"
              placeholder="Outreach worker, volunteer coordinator, peer navigator…"
              required
              defaultValue={initialValues.positionTitle ?? ''}
            />
            <p className="text-xs text-muted-foreground">
              We share this internally so teams know how you collaborate with neighbours and partners.
            </p>
          </div>
        </div>
      ) : (
        <>
          <input type="hidden" name="agency_organization_id" value={NO_ORGANIZATION_VALUE} />
          <input type="hidden" name="new_organization_name" value="" />
        </>
      )}

      {hideRoleField ? (
        <input type="hidden" name="position_title" value={PUBLIC_MEMBER_ROLE_LABEL} />
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="homelessness_experience">Homelessness lived experience badge</Label>
        <Select
          name="homelessness_experience"
          value={homelessnessExperience}
          onValueChange={(value) => setHomelessnessExperience(value as LivedExperienceStatus)}
        >
          <SelectTrigger id="homelessness_experience">
            <SelectValue placeholder="Select lived experience" />
          </SelectTrigger>
          <SelectContent>
            {livedExperienceOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ExperienceHelper selectedValue={homelessnessExperience} options={livedExperienceOptions} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="substance_use_experience">Substance use lived experience badge</Label>
        <Select
          name="substance_use_experience"
          value={substanceUseExperience}
          onValueChange={(value) => setSubstanceUseExperience(value as LivedExperienceStatus)}
        >
          <SelectTrigger id="substance_use_experience">
            <SelectValue placeholder="Select lived experience" />
          </SelectTrigger>
          <SelectContent>
            {livedExperienceOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ExperienceHelper selectedValue={substanceUseExperience} options={livedExperienceOptions} />
      </div>

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}

type PendingSummaryArgs = {
  affiliationType: AffiliationType;
  organizationId: string | null;
  requestedOrganizationName: string | null;
  organizationMap: Map<string, string>;
};

function pendingSummary({
  affiliationType,
  organizationId,
  requestedOrganizationName,
  organizationMap,
}: PendingSummaryArgs): string | null {
  if (affiliationType === 'agency_partner') {
    const label = requestedOrganizationName
      ? `"${requestedOrganizationName}"`
      : organizationId
      ? organizationMap.get(organizationId) ?? 'your organization'
      : 'your organization';
    return `Pending moderator review for ${label}.`;
  }

  return null;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving…' : 'Save changes'}
    </Button>
  );
}

type ExperienceHelperProps = {
  selectedValue: LivedExperienceStatus;
  options: { value: LivedExperienceStatus; description: string }[];
};

function ExperienceHelper({ selectedValue, options }: ExperienceHelperProps) {
  const copy = options.find((option) => option.value === selectedValue);
  if (!copy) {
    return null;
  }
  return <p className="text-xs text-muted-foreground">{copy.description}</p>;
}

type AffiliationOptionProps = {
  id: string;
  value: AffiliationType;
  title: string;
  description: string;
};

function AffiliationOption({ id, value, title, description }: AffiliationOptionProps) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/40 bg-card p-4 text-sm font-medium text-foreground shadow-sm transition hover:border-primary/60 hover:bg-muted focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background"
    >
      <RadioGroupItem id={id} value={value} className="mt-1" />
      <span>
        {title}
        <span className="mt-1 block text-xs font-normal text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

