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
  NEW_GOVERNMENT_VALUE,
  NEW_ORGANIZATION_VALUE,
  NO_ORGANIZATION_VALUE,
  PUBLIC_MEMBER_ROLE_LABEL,
} from '@/lib/constants';
import { LIVED_EXPERIENCE_COPY, LIVED_EXPERIENCE_OPTIONS, type LivedExperienceStatus } from '@/lib/lived-experience';

export type ProfileDetailsFormState = {
  status: 'idle' | 'success';
  error?: string;
  message?: string;
};

type Organization = {
  id: string;
  name: string;
};

type GovernmentBody = {
  id: string;
  name: string;
  level: Database['portal']['Enums']['government_level'];
};

type GovernmentRoleType = Database['portal']['Enums']['government_role_type'];
type GovernmentLevel = Database['portal']['Enums']['government_level'];
type AffiliationStatus = Database['portal']['Enums']['affiliation_status'];

type AffiliationType = Database['portal']['Enums']['affiliation_type'];

type ProfileDetailsFormProps = {
  organizations: Organization[];
  governmentBodies: GovernmentBody[];
  initialState: ProfileDetailsFormState;
  action: (state: ProfileDetailsFormState, formData: FormData) => Promise<ProfileDetailsFormState>;
  initialValues: {
    displayName: string;
    organizationId: string | null;
    governmentBodyId: string | null;
    positionTitle: string | null;
    affiliationType: AffiliationType;
    homelessnessExperience: LivedExperienceStatus;
    substanceUseExperience: LivedExperienceStatus;
    affiliationStatus: AffiliationStatus;
    governmentRoleType: GovernmentRoleType | null;
    requestedOrganizationName: string | null;
    requestedGovernmentName: string | null;
    requestedGovernmentLevel: GovernmentLevel | null;
    requestedGovernmentRole: GovernmentRoleType | null;
  };
};

export function ProfileDetailsForm({ organizations, governmentBodies, action, initialState, initialValues }: ProfileDetailsFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const initialOrgSelection = initialValues.organizationId
    ? initialValues.organizationId
    : initialValues.requestedOrganizationName
      ? NEW_ORGANIZATION_VALUE
      : NO_ORGANIZATION_VALUE;
  const initialGovernmentSelection = initialValues.governmentBodyId
    ? initialValues.governmentBodyId
    : initialValues.requestedGovernmentName
      ? NEW_GOVERNMENT_VALUE
      : NO_ORGANIZATION_VALUE;
  const [selectedOrg, setSelectedOrg] = useState(initialOrgSelection);
  const [selectedGovernment, setSelectedGovernment] = useState(initialGovernmentSelection);
  const [affiliationType, setAffiliationType] = useState<AffiliationType>(initialValues.affiliationType);
  const [homelessnessExperience, setHomelessnessExperience] = useState<LivedExperienceStatus>(
    initialValues.homelessnessExperience,
  );
  const [substanceUseExperience, setSubstanceUseExperience] = useState<LivedExperienceStatus>(
    initialValues.substanceUseExperience,
  );
  const [governmentRoleType, setGovernmentRoleType] = useState<GovernmentRoleType | null>(
    initialValues.requestedGovernmentRole ?? initialValues.governmentRoleType,
  );
  const [governmentLevel, setGovernmentLevel] = useState<GovernmentLevel | null>(
    initialValues.requestedGovernmentLevel,
  );

  const hideRoleField = affiliationType === 'community_member';
  const isAgencyPartner = affiliationType === 'agency_partner';
  const isGovernmentPartner = affiliationType === 'government_partner';
  const requestingNewOrganization = selectedOrg === NEW_ORGANIZATION_VALUE;
  const requestingNewGovernment = selectedGovernment === NEW_GOVERNMENT_VALUE;
  const organizationMap = new Map(organizations.map((org) => [org.id, org.name]));
  const governmentMap = new Map(governmentBodies.map((body) => [body.id, body]));
  const pendingSummary = (() => {
    if (initialValues.affiliationStatus !== 'pending') {
      return null;
    }

    if (initialValues.affiliationType === 'agency_partner') {
      const label = initialValues.requestedOrganizationName
        ? `"${initialValues.requestedOrganizationName}"`
        : initialValues.organizationId
          ? organizationMap.get(initialValues.organizationId) ?? 'your organization'
          : 'your organization';
      return `Pending moderator review for ${label}.`;
    }

    if (initialValues.affiliationType === 'government_partner') {
      const bodyName = initialValues.requestedGovernmentName
        ? `"${initialValues.requestedGovernmentName}"`
        : initialValues.governmentBodyId
          ? governmentMap.get(initialValues.governmentBodyId)?.name ?? 'your government team'
          : 'your government team';
      const levelLabel = initialValues.requestedGovernmentLevel
        ? formatGovernmentLevel(initialValues.requestedGovernmentLevel)
        : initialValues.governmentBodyId
          ? formatGovernmentLevel(governmentMap.get(initialValues.governmentBodyId)?.level ?? 'other')
          : null;
      return `Pending moderator review for ${bodyName}${levelLabel ? ` (${levelLabel})` : ''}.`;
    }

    return null;
  })();

  useEffect(() => {
    if (affiliationType === 'community_member') {
      startTransition(() => {
        setSelectedOrg(NO_ORGANIZATION_VALUE);
        setSelectedGovernment(NO_ORGANIZATION_VALUE);
        setGovernmentRoleType(null);
        setGovernmentLevel(null);
      });
    } else if (affiliationType === 'agency_partner') {
      startTransition(() => {
        setSelectedGovernment(NO_ORGANIZATION_VALUE);
        setGovernmentRoleType(null);
        setGovernmentLevel(null);
      });
    } else if (affiliationType === 'government_partner') {
      startTransition(() => {
        setSelectedOrg(NO_ORGANIZATION_VALUE);
      });
    }
  }, [affiliationType]);

  useEffect(() => {
    if (selectedGovernment !== NEW_GOVERNMENT_VALUE) {
      startTransition(() => {
        setGovernmentLevel(null);
      });
    }
  }, [selectedGovernment]);

  return (
    <form
      action={formAction}
      className="grid gap-6 rounded-2xl border border-outline/20 bg-surface-container-high p-6 shadow-subtle"
    >
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-on-surface">Profile details</h2>
        <p className="text-sm text-on-surface/70">
          Update how outreach teams and partner agencies reference you across STEVI appointments, documents, and notes.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="display_name">Display name</Label>
        <Input
          id="display_name"
          name="display_name"
          required
          maxLength={80}
          autoComplete="nickname"
          defaultValue={initialValues.displayName}
        />
        <p className="text-xs text-muted">
          Use the name you want staff and collaborating agencies to use in STEVI.
        </p>
      </div>

      <div className="grid gap-3">
        <Label>Affiliation</Label>
        <RadioGroup
          name="affiliation_type"
          value={affiliationType}
          onValueChange={(value) => setAffiliationType(value as AffiliationType)}
          className="grid gap-3 md:grid-cols-3"
        >
          <AffiliationOption
            id="affiliation-community"
            value="community_member"
            title="Community member"
            description="Connect as a neighbour receiving support and advocacy."
          />
          <AffiliationOption
            id="affiliation-agency"
            value="agency_partner"
            title="Agency / organization"
            description="Link your access to an agency or service partner."
          />
          <AffiliationOption
            id="affiliation-government"
            value="government_partner"
            title="Government representative"
            description="Collaborate as municipal, regional, or provincial leadership."
          />
        </RadioGroup>
        {affiliationType !== 'community_member' ? (
          <Alert className="border-primary/30 bg-primary/10 text-sm text-on-primary-container">
            <AlertTitle>Pending verification</AlertTitle>
            <AlertDescription>
              The STEVI admin team confirms agency and government roles before enabling shared records. You can keep
              collaborating as a community member while we verify.
              {pendingSummary ? (
                <span className="mt-2 block text-xs text-on-primary-container/80">{pendingSummary}</span>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : (
          <p className="text-xs text-muted">
            Community members appear as “Neighbour” to highlight lived expertise while protecting privacy.
          </p>
        )}
      </div>

      {isAgencyPartner ? (
        <div className="space-y-3 rounded-xl border border-outline/20 p-4">
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
                placeholder="Northumberland Community Living"
                defaultValue={initialValues.requestedOrganizationName ?? ''}
                required
                maxLength={160}
              />
              <p className="text-xs text-muted">
                Moderators verify new partners before enabling official responses.
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted">
              Link your organization to share updates once your affiliation is approved.
            </p>
          )}
        </div>
      ) : null}

      {isGovernmentPartner ? (
        <div className="space-y-4 rounded-xl border border-outline/20 p-4">
          <div className="grid gap-2">
            <Label htmlFor="government_body_id">Government team</Label>
            <Select name="government_body_id" value={selectedGovernment} onValueChange={setSelectedGovernment}>
              <SelectTrigger id="government_body_id">
                <SelectValue placeholder="Select your government team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_ORGANIZATION_VALUE} disabled>
                  Select your government team
                </SelectItem>
                {governmentBodies.map((body) => (
                  <SelectItem key={body.id} value={body.id}>
                    {body.name} · {formatGovernmentLevel(body.level)}
                  </SelectItem>
                ))}
                <SelectItem value={NEW_GOVERNMENT_VALUE}>Request a new government listing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <fieldset className="space-y-3 rounded-lg border border-outline/20 p-3">
            <legend className="text-sm font-semibold text-on-surface">How do you serve neighbours?</legend>
            <RadioGroup
              name="government_role_type"
              value={governmentRoleType ?? ''}
              onValueChange={(value) => setGovernmentRoleType(value ? (value as GovernmentRoleType) : null)}
              className="grid gap-2 md:grid-cols-2"
            >
              <GovernmentRoleOption
                id="profile-government-role-staff"
                value="staff"
                title="Public servant / staff"
                description="Administrative, public service, or operational role."
              />
              <GovernmentRoleOption
                id="profile-government-role-politician"
                value="politician"
                title="Elected leadership"
                description="Mayor, councillor, MP/MPP, or other elected official."
              />
            </RadioGroup>
          </fieldset>

          {requestingNewGovernment ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="government_level">Government level</Label>
                <Select
                  name="government_level"
                  value={governmentLevel ?? ''}
                  onValueChange={(value) => setGovernmentLevel(value === '' ? null : (value as GovernmentLevel))}
                >
                  <SelectTrigger id="government_level">
                    <SelectValue placeholder="Select a level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="" disabled>
                      Select a government level
                    </SelectItem>
                    <SelectItem value="municipal">Municipal</SelectItem>
                    <SelectItem value="county">County / regional</SelectItem>
                    <SelectItem value="provincial">Provincial / territorial</SelectItem>
                    <SelectItem value="federal">Federal</SelectItem>
                    <SelectItem value="other">Other / multi-jurisdictional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new_government_name">Government body name</Label>
                <Input
                  id="new_government_name"
                  name="new_government_name"
                  placeholder="Town of Cobourg Council"
                  defaultValue={initialValues.requestedGovernmentName ?? ''}
                  required
                  maxLength={160}
                />
                <p className="text-xs text-muted">
                  Moderators confirm new listings before enabling official government updates.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {hideRoleField ? (
        <input type="hidden" name="position_title" value={PUBLIC_MEMBER_ROLE_LABEL} />
      ) : (
        <div className="grid gap-2">
          <Label htmlFor="position_title">Position or role</Label>
          <Input
            id="position_title"
            name="position_title"
            defaultValue={initialValues.positionTitle ?? ''}
            maxLength={120}
            placeholder="Public Health Nurse, Town Councillor, Outreach Supervisor, ..."
          />
          <p className="text-xs text-muted">Helps neighbours understand how you collaborate through the IHARC Portal.</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="homelessness_experience">Housing lived experience badge</Label>
          <Select
            name="homelessness_experience"
            value={homelessnessExperience}
            onValueChange={(value) => setHomelessnessExperience(value as LivedExperienceStatus)}
          >
            <SelectTrigger id="homelessness_experience">
              <SelectValue placeholder="Select housing lived experience" />
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
          <p className="text-xs text-muted">
            Share only what feels right. Badges honour neighbours with lived expertise navigating homelessness.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="substance_use_experience">Substance use lived experience badge</Label>
          <Select
            name="substance_use_experience"
            value={substanceUseExperience}
            onValueChange={(value) => setSubstanceUseExperience(value as LivedExperienceStatus)}
          >
            <SelectTrigger id="substance_use_experience">
              <SelectValue placeholder="Select substance use lived experience" />
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
          <p className="text-xs text-muted">
            These badges acknowledge peers with lived experience around substance use and recovery.
          </p>
        </div>
      </div>

      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>We could not save your profile</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {state.status === 'success' && state.message ? (
        <Alert className="border-success/40 bg-success/10 text-success">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <SubmitButton />
    </form>
  );
}

function formatGovernmentLevel(level: GovernmentLevel): string {
  switch (level) {
    case 'municipal':
      return 'Municipal';
    case 'county':
      return 'County / regional';
    case 'provincial':
      return 'Provincial / territorial';
    case 'federal':
      return 'Federal';
    default:
      return 'Other';
  }
}

type GovernmentRoleOptionProps = {
  id: string;
  value: GovernmentRoleType;
  title: string;
  description: string;
};

function GovernmentRoleOption({ id, value, title, description }: GovernmentRoleOptionProps) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-lg border border-outline/30 bg-surface p-3 text-sm font-medium text-on-surface shadow-subtle transition hover:border-primary/40 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary"
    >
      <RadioGroupItem id={id} value={value} className="mt-1" />
      <span>
        {title}
        <span className="mt-1 block text-xs font-normal text-muted">{description}</span>
      </span>
    </label>
  );
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
      className="flex cursor-pointer items-start gap-3 rounded-xl border border-outline/40 bg-surface-container p-3 text-sm font-medium text-on-surface shadow-subtle transition hover:border-primary/40 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary"
    >
      <RadioGroupItem id={id} value={value} className="mt-1" />
      <span>
        {title}
        <span className="mt-1 block text-xs font-normal text-muted">{description}</span>
      </span>
    </label>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full justify-center md:w-auto">
      {pending ? 'Saving...' : 'Save profile'}
    </Button>
  );
}

function ExperienceHelper({ selectedValue }: { selectedValue: LivedExperienceStatus }) {
  const helperText = LIVED_EXPERIENCE_COPY[selectedValue]?.description;

  if (!helperText) {
    return null;
  }

  return <p className="text-xs text-muted">{helperText}</p>;
}
