'use client';

import { startTransition, useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Database } from '@/types/supabase';
import {
  NEW_ORGANIZATION_VALUE,
  NO_ORGANIZATION_VALUE,
  PUBLIC_MEMBER_ROLE_LABEL,
} from '@/lib/constants';
import {
  LIVED_EXPERIENCE_COPY,
  LIVED_EXPERIENCE_OPTIONS,
  type LivedExperienceStatus,
} from '@/lib/lived-experience';

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

const ALLOWED_AFFILIATIONS: readonly AffiliationType[] = ['community_member', 'agency_partner'];

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
};

export function ProfileDetailsForm({
  organizations,
  initialState,
  action,
  initialValues,
}: ProfileDetailsFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  const initialOrgSelection =
    initialValues.organizationId ??
    (initialValues.requestedOrganizationName ? NEW_ORGANIZATION_VALUE : NO_ORGANIZATION_VALUE);

  const [selectedOrg, setSelectedOrg] = useState(initialOrgSelection);
  const initialAffiliation = ALLOWED_AFFILIATIONS.includes(initialValues.affiliationType)
    ? initialValues.affiliationType
    : 'agency_partner';
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

  const isAgencyPartner = affiliationType === 'agency_partner';
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
      className="space-y-space-lg rounded-3xl border border-outline/40 bg-surface p-space-lg shadow-level-1"
    >
      <div className="flex flex-col gap-space-xs">
        <h2 className="text-title-lg font-medium text-on-surface">Profile details</h2>
        <p className="text-body-sm text-muted-foreground">
          Update how neighbours see you in STEVI and confirm the IHARC role you collaborate with.
        </p>
      </div>

      {pendingVerificationCopy ? (
        <Alert className="border-primary bg-primary-container text-body-sm text-on-primary-container">
          <AlertTitle>Verification in progress</AlertTitle>
          <AlertDescription>{pendingVerificationCopy}</AlertDescription>
        </Alert>
      ) : null}

      {state.status === 'success' && state.message ? (
        <Alert className="border-primary bg-primary-container text-body-sm text-on-primary-container">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      {state.error ? (
        <Alert variant="destructive" className="text-body-sm">
          <AlertTitle>We could not save your updates</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-space-xs">
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

      <div className="grid gap-space-sm">
        <Label>How do you collaborate with IHARC?</Label>
        <RadioGroup
          name="affiliation_type"
          value={affiliationType}
          onValueChange={(value) => setAffiliationType(value as AffiliationType)}
          className="grid gap-space-sm md:grid-cols-2"
        >
          <AffiliationOption
            id="profile-affiliation-community"
            value="community_member"
            title="Community member"
            description="Share ideas, support plans, and collaborate as a neighbour."
          />
          <AffiliationOption
            id="profile-affiliation-agency"
            value="agency_partner"
            title="IHARC staff or partner"
            description="Request verified publishing on behalf of outreach teams or trusted partners."
          />
        </RadioGroup>
      </div>

      {isAgencyPartner ? (
        <div className="space-y-space-sm rounded-xl border border-outline/20 p-space-md">
          <div className="grid gap-space-xs">
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
            <div className="grid gap-space-xs">
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

          <div className="grid gap-space-xs">
            <Label htmlFor="position_title">Role or position</Label>
            <Input
              id="position_title"
              name="position_title"
              placeholder="Outreach worker, volunteer coordinator, peer navigator…"
              required
              defaultValue={initialValues.positionTitle ?? ''}
            />
            <p className="text-label-sm text-muted-foreground">
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

      <div className="grid gap-space-xs">
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
            {LIVED_EXPERIENCE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ExperienceHelper selectedValue={homelessnessExperience} />
      </div>

      <div className="grid gap-space-xs">
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
            {LIVED_EXPERIENCE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ExperienceHelper selectedValue={substanceUseExperience} />
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
};

function ExperienceHelper({ selectedValue }: ExperienceHelperProps) {
  const copy = LIVED_EXPERIENCE_COPY[selectedValue];
  if (!copy) {
    return null;
  }
  return <p className="text-label-sm text-muted-foreground">{copy.description}</p>;
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
      className="flex cursor-pointer items-start gap-space-sm rounded-xl border border-outline/40 bg-surface-container p-space-md text-body-sm font-medium text-on-surface shadow-level-1 transition state-layer-color-primary hover:border-primary hover:state-layer-hover focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:state-layer-focus"
    >
      <RadioGroupItem id={id} value={value} className="mt-1" />
      <span>
        {title}
        <span className="mt-space-2xs block text-label-sm font-normal text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}
