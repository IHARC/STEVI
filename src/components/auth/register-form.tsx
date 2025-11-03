'use client';

import { startTransition, useActionState, useEffect, useId, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Database } from '@/types/supabase';
import { GoogleAuthButton } from '@/components/auth/google-auth-button';
import { AuthDivider } from '@/components/auth/auth-divider';
import {
  NEW_GOVERNMENT_VALUE,
  NEW_ORGANIZATION_VALUE,
  NO_ORGANIZATION_VALUE,
  PUBLIC_MEMBER_ROLE_LABEL,
} from '@/lib/constants';
import { LIVED_EXPERIENCE_COPY, LIVED_EXPERIENCE_OPTIONS, type LivedExperienceStatus } from '@/lib/lived-experience';

export type FormState = {
  status: 'idle' | 'otp_pending';
  contactMethod?: ContactMethod;
  error?: string;
  phone?: string;
  maskedPhone?: string;
  message?: string;
};

type ContactMethod = 'email' | 'phone';

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

type RegisterFormProps = {
  organizations: Organization[];
  governmentBodies: GovernmentBody[];
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  nextPath: string;
  initialState: FormState;
};

type AffiliationType = Database['portal']['Enums']['affiliation_type'];

export function RegisterForm({ organizations, governmentBodies, action, nextPath, initialState }: RegisterFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const [selectedOrg, setSelectedOrg] = useState(NO_ORGANIZATION_VALUE);
  const [selectedGovernment, setSelectedGovernment] = useState(NO_ORGANIZATION_VALUE);
  const [affiliationType, setAffiliationType] = useState<AffiliationType>('community_member');
  const [homelessnessExperience, setHomelessnessExperience] = useState<LivedExperienceStatus>('none');
  const [substanceUseExperience, setSubstanceUseExperience] = useState<LivedExperienceStatus>('none');
  const [contactMethod, setContactMethod] = useState<ContactMethod>(initialState.contactMethod ?? 'email');
  const [governmentRoleType, setGovernmentRoleType] = useState<GovernmentRoleType | null>(null);
  const [governmentLevel, setGovernmentLevel] = useState<GovernmentLevel | null>(null);

  useEffect(() => {
    const nextMethod = state.contactMethod;
    if (!nextMethod || nextMethod === contactMethod) {
      return;
    }
    startTransition(() => {
      setContactMethod(nextMethod);
    });
  }, [state.contactMethod, contactMethod]);

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

  const hideRoleField = affiliationType === 'community_member';
  const otpPending = state.status === 'otp_pending';

  return (
    <form action={formAction} className="mt-8 grid gap-6 rounded-2xl border border-outline/40 bg-surface p-8 shadow-subtle">
      {otpPending ? (
        <OtpVerificationStep state={state} />
      ) : (
        <RegistrationFields
          organizations={organizations}
          governmentBodies={governmentBodies}
          selectedOrg={selectedOrg}
          onSelectOrg={setSelectedOrg}
          selectedGovernment={selectedGovernment}
          onSelectGovernment={setSelectedGovernment}
          affiliationType={affiliationType}
          onAffiliationChange={(value) => setAffiliationType(value as AffiliationType)}
          hideRoleField={hideRoleField}
          homelessnessExperience={homelessnessExperience}
          onHomelessnessChange={(value) => setHomelessnessExperience(value as LivedExperienceStatus)}
          substanceUseExperience={substanceUseExperience}
          onSubstanceUseChange={(value) => setSubstanceUseExperience(value as LivedExperienceStatus)}
          contactMethod={contactMethod}
          onContactMethodChange={(value) => setContactMethod(value as ContactMethod)}
          governmentRoleType={governmentRoleType}
          onGovernmentRoleChange={(value) =>
            setGovernmentRoleType(value ? (value as GovernmentRoleType) : null)
          }
          governmentLevel={governmentLevel}
          onGovernmentLevelChange={(value) =>
            setGovernmentLevel(value === '' ? null : (value as GovernmentLevel))
          }
          nextPath={nextPath}
        />
      )}

      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>{otpPending ? 'We could not verify that code' : 'We could not finish registration'}</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {!state.error && state.message ? (
        <Alert className="border-primary/30 bg-primary/10 text-sm text-on-primary-container">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      {otpPending ? (
        <>
          <input type="hidden" name="contact_method" value="phone" />
          <input type="hidden" name="otp_phone" value={state.phone ?? ''} />
        </>
      ) : null}

      <SubmitButton otpPending={otpPending} />
    </form>
  );
}

function OtpVerificationStep({ state }: { state: FormState }) {
  const codeFieldId = useId();
  const phoneHint = state.maskedPhone ?? state.phone ?? 'your phone number';

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-on-surface">Confirm your phone number</h2>
        <p className="text-sm text-muted">
          We texted a 6-digit code to {phoneHint}. Enter the code below to finish creating your account. Codes expire
          after 5 minutes.
        </p>
        <p className="text-xs text-muted">
          Need to switch numbers? Reload this page to start again with a different phone number.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={codeFieldId}>Verification code</Label>
        <Input
          id={codeFieldId}
          name="otp_code"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          placeholder="123456"
          required
          maxLength={6}
        />
        <p className="text-xs text-muted">Enter numbers only. We will verify instantly after submission.</p>
      </div>
    </div>
  );
}

type RegistrationFieldsProps = {
  organizations: Organization[];
  governmentBodies: GovernmentBody[];
  selectedOrg: string;
  onSelectOrg: (value: string) => void;
  selectedGovernment: string;
  onSelectGovernment: (value: string) => void;
  affiliationType: AffiliationType;
  onAffiliationChange: (value: string) => void;
  hideRoleField: boolean;
  homelessnessExperience: LivedExperienceStatus;
  onHomelessnessChange: (value: string) => void;
  substanceUseExperience: LivedExperienceStatus;
  onSubstanceUseChange: (value: string) => void;
  contactMethod: ContactMethod;
  onContactMethodChange: (value: string) => void;
  governmentRoleType: GovernmentRoleType | null;
  onGovernmentRoleChange: (value: string) => void;
  governmentLevel: GovernmentLevel | null;
  onGovernmentLevelChange: (value: string) => void;
  nextPath: string;
};

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

function RegistrationFields(props: RegistrationFieldsProps) {
  const {
    organizations,
    governmentBodies,
    selectedOrg,
    onSelectOrg,
    selectedGovernment,
    onSelectGovernment,
    affiliationType,
    onAffiliationChange,
    hideRoleField,
    homelessnessExperience,
    onHomelessnessChange,
    substanceUseExperience,
    onSubstanceUseChange,
    contactMethod,
    onContactMethodChange,
    governmentRoleType,
    onGovernmentRoleChange,
    governmentLevel,
    onGovernmentLevelChange,
    nextPath,
  } = props;
  const isAgencyPartner = affiliationType === 'agency_partner';
  const isGovernmentPartner = affiliationType === 'government_partner';
  const requestingNewOrganization = selectedOrg === NEW_ORGANIZATION_VALUE;
  const requestingNewGovernment = selectedGovernment === NEW_GOVERNMENT_VALUE;

  return (
    <div className="grid gap-6">
      <div className="space-y-3">
        <GoogleAuthButton intent="register" nextPath={nextPath} />
        <AuthDivider label="or continue by sharing details" />
      </div>

      <fieldset className="space-y-3 rounded-xl border border-outline/30 p-4">
        <legend className="text-sm font-semibold text-on-surface">How should we reach you about your account?</legend>
        <RadioGroup name="contact_method" value={contactMethod} onValueChange={onContactMethodChange} className="grid gap-3 md:grid-cols-2">
          <ContactMethodOption
            id="contact-email"
            value="email"
            title="Email"
            description="Receive confirmation links and updates at your inbox."
          />
          <ContactMethodOption
            id="contact-phone"
            value="phone"
            title="Phone"
            description="We will text a 6-digit verification code to sign you in."
          />
        </RadioGroup>
      </fieldset>

      <div className="grid gap-2">
        <Label htmlFor="display_name">Display name</Label>
        <Input
          id="display_name"
          name="display_name"
          required
          maxLength={80}
          autoComplete="nickname"
          placeholder="Name neighbours will see"
        />
        <p className="text-xs text-muted">Use first names or community roles. No identifying neighbour information.</p>
      </div>

      <div className="grid gap-3">
        <Label>How are you collaborating through the IHARC Portal?</Label>
        <RadioGroup
          name="affiliation_type"
          value={affiliationType}
          onValueChange={onAffiliationChange}
          className="grid gap-3 md:grid-cols-3"
        >
          <AffiliationOption
            id="affiliation-community"
            value="community_member"
            title="Community member"
            description="Share ideas, support plans, and collaborate as a neighbour."
          />
          <AffiliationOption
            id="affiliation-agency"
            value="agency_partner"
            title="Agency / organization"
            description="Request verified posting on behalf of a partner organization."
          />
          <AffiliationOption
            id="affiliation-government"
            value="government_partner"
            title="Government representative"
            description="Join as municipal, regional, or provincial staff or elected leadership."
          />
        </RadioGroup>
        {affiliationType !== 'community_member' ? (
          <Alert className="border-primary/30 bg-primary/10 text-sm text-on-primary-container">
            <AlertTitle>Pending verification</AlertTitle>
            <AlertDescription>
              An IHARC administrator will confirm your role before activating official posting privileges. You can still
              participate as a community member while we verify.
            </AlertDescription>
          </Alert>
        ) : (
          <p className="text-xs text-muted">
            We’ll gently note your role as “Member of the public” so collaboration highlights neighbour-led insight.
          </p>
        )}
      </div>

      {isAgencyPartner ? (
        <div className="space-y-3 rounded-xl border border-outline/20 p-4">
          <div className="grid gap-2">
            <Label htmlFor="agency_organization_id">Partner organization</Label>
            <Select name="agency_organization_id" value={selectedOrg} onValueChange={onSelectOrg}>
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
                placeholder="Northumberland County Outreach"
                required
                maxLength={160}
              />
              <p className="text-xs text-muted">
                Moderators will verify new partners before enabling official responses.
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted">
              Link your agency to unlock official responses once moderators approve your affiliation.
            </p>
          )}
        </div>
      ) : null}

      {isGovernmentPartner ? (
        <div className="space-y-4 rounded-xl border border-outline/20 p-4">
          <div className="grid gap-2">
            <Label htmlFor="government_body_id">Government team</Label>
            <Select name="government_body_id" value={selectedGovernment} onValueChange={onSelectGovernment}>
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
              onValueChange={onGovernmentRoleChange}
              className="grid gap-2 md:grid-cols-2"
            >
              <GovernmentRoleOption
                id="government-role-staff"
                value="staff"
                title="Public servant / staff"
                description="Administrative, public service, and operational roles."
              />
              <GovernmentRoleOption
                id="government-role-politician"
                value="politician"
                title="Elected leadership"
                description="Mayors, council members, MPs/MPPs, or other elected officials."
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
                  onValueChange={onGovernmentLevelChange}
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
                  required
                  maxLength={160}
                />
                <p className="text-xs text-muted">
                  Moderators will confirm this listing before enabling official government updates.
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
            maxLength={120}
            placeholder="Public Health Nurse, Mayor, Outreach Coordinator, ..."
            required
          />
          <p className="text-xs text-muted">Helps neighbours understand how you collaborate through the IHARC Portal.</p>
        </div>
      )}

      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="homelessness_experience">Housing lived experience badge</Label>
          <Select name="homelessness_experience" value={homelessnessExperience} onValueChange={onHomelessnessChange}>
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
            Share only what feels right. Badges appear beside your contributions to honour lived expertise with
            homelessness.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="substance_use_experience">Substance use lived experience badge</Label>
          <Select name="substance_use_experience" value={substanceUseExperience} onValueChange={onSubstanceUseChange}>
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
            These badges help acknowledge peers and partners with lived experience around substance use and recovery.
          </p>
        </div>
      </div>

      {contactMethod === 'email' ? (
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.ca" />
        </div>
      ) : (
        <div className="grid gap-2">
          <Label htmlFor="phone">Phone number</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            required
            placeholder="+16475551234"
          />
          <p className="text-xs text-muted">Include your country code so we can text the verification code.</p>
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="Minimum 8 characters"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="confirm_password">Confirm password</Label>
        <Input
          id="confirm_password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="Re-enter your password"
        />
      </div>
    </div>
  );
}

type ContactMethodOptionProps = {
  id: string;
  value: ContactMethod;
  title: string;
  description: string;
};

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

function ContactMethodOption({ id, value, title, description }: ContactMethodOptionProps) {
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

function SubmitButton({ otpPending }: { otpPending: boolean }) {
  const { pending } = useFormStatus();
  const label = otpPending ? 'Verify code' : 'Create account';
  const pendingLabel = otpPending ? 'Verifying code...' : 'Creating account...';

  return (
    <Button type="submit" disabled={pending} className="w-full justify-center">
      {pending ? pendingLabel : label}
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
