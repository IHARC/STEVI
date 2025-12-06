import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensurePortalProfile, type PortalProfile } from '@/lib/profile';
import { ProfileDetailsForm, type ProfileDetailsFormState } from '@/components/portal/profile/profile-details-form';
import {
  ProfileContactCard,
  type EmailFormState,
  type PhoneFormState,
} from '@/components/portal/profile/profile-contact-card';
import { ProfilePasswordForm, type PasswordFormState } from '@/components/portal/profile/profile-password-form';
import { normalizeLivedExperience } from '@/lib/lived-experience';
import { normalizePhoneNumber, maskPhoneNumber } from '@/lib/phone';
import { normalizeEmail } from '@/lib/email';
import {
  NEW_ORGANIZATION_VALUE,
  NO_ORGANIZATION_VALUE,
  PUBLIC_MEMBER_ROLE_LABEL,
} from '@/lib/constants';
import type { Database } from '@/types/supabase';
import { loadProfileEnums } from '@/lib/admin-users';
import { getLivedExperienceStatuses } from '@/lib/enum-values';
import { buildLivedExperienceOptions } from '@/lib/lived-experience';
import { formatEnumLabel } from '@/lib/enum-values';

export const dynamic = 'force-dynamic';

type Organization = {
  id: string;
  name: string;
};

type AffiliationType = Database['portal']['Enums']['affiliation_type'];

const INITIAL_PROFILE_STATE: ProfileDetailsFormState = { status: 'idle' };
const INITIAL_EMAIL_STATE: EmailFormState = { status: 'idle' };
const INITIAL_PHONE_STATE: PhoneFormState = { status: 'idle' };
const INITIAL_PASSWORD_STATE: PasswordFormState = { status: 'idle' };

type UpdateProfileResult = ProfileDetailsFormState;
type UpdateEmailResult = EmailFormState;
type UpdatePhoneResult = PhoneFormState;
type UpdatePasswordResult = PasswordFormState;

export default async function PortalProfilePage() {
  const supabase = await createSupabaseRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/profile');
  }

  const profile = await ensurePortalProfile(supabase, user.id);
  const { data: organizationRowsRaw } = await supabase
    .schema('core')
    .from('organizations')
    .select('id, name, is_active')
    .eq('is_active', true)
    .order('name', { ascending: true });

  const organizationRows = (organizationRowsRaw ?? []) as Array<{ id: number; name: string }>;

  const organizations: Organization[] =
    organizationRows.map((org) => ({ id: String(org.id), name: org.name }));

  const initialOrganizationId = organizations.some((org) => Number(org.id) === Number(profile.organization_id))
    ? String(profile.organization_id)
    : null;
  const profileEnums = await loadProfileEnums(supabase);
  const allowedAffiliations = profileEnums.affiliationTypes;
  const livedExperienceValues = await getLivedExperienceStatuses(supabase);
  const livedExperienceOptions = buildLivedExperienceOptions(livedExperienceValues);
  const currentAffiliation = allowedAffiliations.includes(profile.affiliation_type as AffiliationType)
    ? (profile.affiliation_type as AffiliationType)
    : allowedAffiliations[0] ?? 'community_member';
  const initialValues = {
    displayName: profile.display_name ?? 'Community member',
    organizationId: initialOrganizationId,
    positionTitle: profile.position_title,
    affiliationType: currentAffiliation,
    homelessnessExperience: normalizeLivedExperience(profile.homelessness_experience ?? null, livedExperienceValues),
    substanceUseExperience: normalizeLivedExperience(profile.substance_use_experience ?? null, livedExperienceValues),
    affiliationStatus: profile.affiliation_status,
    requestedOrganizationName: profile.requested_organization_name,
  };

  const initialEmail = user.email ?? null;
  const initialPhone = user.phone ?? null;

  async function updateProfileDetails(_prevState: ProfileDetailsFormState, formData: FormData): Promise<UpdateProfileResult> {
    'use server';

    const supa = await createSupabaseServerClient();
    const portalClient = supa.schema('portal');

    const displayName = (formData.get('display_name') as string | null)?.trim();
    const rawAffiliation = (formData.get('affiliation_type') as string | null)?.trim() ?? currentAffiliation;
    let affiliationType = allowedAffiliations.includes(rawAffiliation as AffiliationType)
      ? (rawAffiliation as AffiliationType)
      : currentAffiliation;
    const rawAgencyOrganizationId = (formData.get('agency_organization_id') as string | null)?.trim() ?? null;
    const newOrganizationName = (formData.get('new_organization_name') as string | null)?.trim() ?? null;
    const positionTitleInput = (formData.get('position_title') as string | null)?.trim() ?? null;
    const rawHomelessnessExperience = (formData.get('homelessness_experience') as string | null) ?? livedExperienceValues[0] ?? 'none';
    const rawSubstanceUseExperience = (formData.get('substance_use_experience') as string | null) ?? livedExperienceValues[0] ?? 'none';
    const homelessnessExperience = normalizeLivedExperience(rawHomelessnessExperience, livedExperienceValues);
    const substanceUseExperience = normalizeLivedExperience(rawSubstanceUseExperience, livedExperienceValues);

    let organizationId: number | null = null;
    let requestedOrganizationName: string | null = null;

    if (affiliationType === 'agency_partner') {
      if (rawAgencyOrganizationId === NEW_ORGANIZATION_VALUE) {
        if (!newOrganizationName || newOrganizationName.length < 3) {
          return { status: 'idle', error: 'Share the organization name (minimum 3 characters).' };
        }
        requestedOrganizationName = newOrganizationName;
      } else if (rawAgencyOrganizationId && rawAgencyOrganizationId !== NO_ORGANIZATION_VALUE) {
        const parsed = Number.parseInt(rawAgencyOrganizationId, 10);
        organizationId = Number.isNaN(parsed) ? null : parsed;
      } else if (currentAffiliation === 'agency_partner' && profile.organization_id) {
        const parsed = typeof profile.organization_id === 'number' ? profile.organization_id : Number(profile.organization_id);
        organizationId = Number.isNaN(parsed) ? null : parsed;
      } else {
        return { status: 'idle', error: 'Select an organization or request a new listing.' };
      }
    }

    if (!displayName || displayName.length < 2) {
      return { status: 'idle', error: 'Share the name neighbours should see.' };
    }

    const isCommunityMember = affiliationType === 'community_member';
    const finalPositionTitle = isCommunityMember ? PUBLIC_MEMBER_ROLE_LABEL : positionTitleInput;

    const organizationChanged = organizationId !== (profile.organization_id === null ? null : Number(profile.organization_id));
    const requestingOrganization = affiliationType === 'agency_partner' && requestedOrganizationName !== null;
    const shouldReset =
      currentAffiliation !== affiliationType ||
      requestingOrganization ||
      (affiliationType === 'agency_partner' && organizationChanged);

    let affiliationStatus: PortalProfile['affiliation_status'] = profile.affiliation_status;
    let affiliationRequestedAt = profile.affiliation_requested_at;
    let affiliationReviewedAt = profile.affiliation_reviewed_at;
    let affiliationReviewedBy = profile.affiliation_reviewed_by;

    if (isCommunityMember) {
      organizationId = null;
      requestedOrganizationName = null;
      affiliationStatus = 'approved';
      affiliationRequestedAt = null;
      affiliationReviewedAt = null;
      affiliationReviewedBy = null;
    } else if (shouldReset || profile.affiliation_status === 'pending') {
      affiliationStatus = 'pending';
      affiliationRequestedAt =
        shouldReset || !profile.affiliation_requested_at ? new Date().toISOString() : profile.affiliation_requested_at;
      affiliationReviewedAt = null;
      affiliationReviewedBy = null;
    }

    if (affiliationStatus !== 'pending') {
      requestedOrganizationName = null;
    }



    try {
      const updatePayload: Partial<PortalProfile> = {
        display_name: displayName,
        organization_id: organizationId,
        requested_organization_name: requestedOrganizationName,
        position_title: finalPositionTitle,
        affiliation_type: affiliationType,
        affiliation_status: affiliationStatus,
        affiliation_requested_at: affiliationRequestedAt,
        affiliation_reviewed_at: affiliationReviewedAt,
        affiliation_reviewed_by: affiliationReviewedBy,
        homelessness_experience: homelessnessExperience,
        substance_use_experience: substanceUseExperience,
      };

      const { error } = await portalClient.from('profiles').update(updatePayload).eq('id', profile.id);

      if (error) {
        throw error;
      }

      await revalidatePath('/profile');
      return { status: 'success', message: 'Profile updated.' };
    } catch (error) {
      if (error instanceof Error) {
        return { status: 'idle', error: error.message };
      }
      return { status: 'idle', error: 'We could not update your profile right now.' };
    }
  }

  async function updateEmail(_prevState: EmailFormState, formData: FormData): Promise<UpdateEmailResult> {
    'use server';

    const supa = await createSupabaseServerClient();
    const {
      data: { user: currentUser },
    } = await supa.auth.getUser();

    if (!currentUser) {
      return { status: 'idle', error: 'Sign in to update your contact details.' };
    }

    const emailInput = normalizeEmail(formData.get('email'));

    if (!emailInput) {
      if (!currentUser.email) {
        return { status: 'idle', message: 'Email remains empty. Add one when you are ready.' };
      }
      return { status: 'idle', error: 'Enter a valid email address to update your account.' };
    }

    if (currentUser.email && currentUser.email.toLowerCase() === emailInput) {
      return { status: 'idle', message: 'This email is already active on your account.' };
    }

    try {
      const { error } = await supa.auth.updateUser({ email: emailInput });
      if (error) {
        throw error;
      }

      return {
        status: 'success',
        message: 'Check your inbox to confirm the update. We will switch emails once you verify.',
      };
    } catch (error) {
      if (error instanceof Error) {
        return { status: 'idle', error: error.message };
      }
      return { status: 'idle', error: 'We could not update your email right now.' };
    }
  }

  async function updatePhone(prevState: PhoneFormState, formData: FormData): Promise<UpdatePhoneResult> {
    'use server';

    const supa = await createSupabaseServerClient();
    const {
      data: { user: currentUser },
    } = await supa.auth.getUser();

    if (!currentUser) {
      return { status: 'idle', error: 'Sign in to update your contact details.' };
    }

    const intent = (formData.get('intent') as string | null) ?? '';
    const stage = (formData.get('stage') as string | null) ?? 'request';

    if (intent === 'cancel') {
      return { status: 'idle' };
    }

    if (stage === 'verify') {
      const otpCode = (formData.get('otp_code') as string | null)?.trim();
      const rawPhone = (formData.get('otp_phone') as string | null) ?? (formData.get('phone') as string | null) ?? '';
      const normalizedPhone = normalizePhoneNumber(rawPhone);

      if (!normalizedPhone) {
        return { status: 'otp_sent', error: 'Enter the phone number we texted the code to.' };
      }

      if (!otpCode || otpCode.length < 4) {
        return {
          status: 'otp_sent',
          phone: normalizedPhone,
          maskedPhone: maskPhoneNumber(normalizedPhone) ?? normalizedPhone,
          error: 'Enter the 6-digit code from your text message.',
        };
      }

      try {
        const { error: verifyError } = await supa.auth.verifyOtp({
          phone: normalizedPhone,
          token: otpCode,
          type: 'phone_change',
        });

        if (verifyError) {
          throw verifyError;
        }

        await revalidatePath('/profile');
        return {
          status: 'success',
          phone: normalizedPhone,
          message: 'Phone number verified.',
        };
      } catch (error) {
        const masked = maskPhoneNumber(normalizedPhone) ?? normalizedPhone;
        if (error instanceof Error) {
          return { status: 'otp_sent', phone: normalizedPhone, maskedPhone: masked, error: error.message };
        }
        return {
          status: 'otp_sent',
          phone: normalizedPhone,
          maskedPhone: masked,
          error: 'We could not verify that code. Try again.',
        };
      }
    }

    const rawPhone = (formData.get('phone') as string | null) ?? '';
    const normalizedPhone = normalizePhoneNumber(rawPhone);

    if (!normalizedPhone) {
      return { status: 'idle', error: 'Enter a valid phone number with country code (e.g. +16475551234).' };
    }

    if (currentUser.phone && normalizePhoneNumber(currentUser.phone) === normalizedPhone) {
      return { status: 'idle', message: 'This phone number is already active on your account.' };
    }

    try {
      const { error } = await supa.auth.updateUser({ phone: normalizedPhone });
      if (error) {
        throw error;
      }

      return {
        status: 'otp_sent',
        phone: normalizedPhone,
        maskedPhone: maskPhoneNumber(normalizedPhone) ?? normalizedPhone,
        message: 'We sent a 6-digit verification code to your phone.',
      };
    } catch (error) {
      if (error instanceof Error) {
        return { status: 'idle', error: error.message };
      }
      return { status: 'idle', error: 'We could not send a verification code. Try again shortly.' };
    }
  }

  async function updatePassword(_prevState: PasswordFormState, formData: FormData): Promise<UpdatePasswordResult> {
    'use server';

    const supa = await createSupabaseServerClient();
    const {
      data: { user: currentUser },
    } = await supa.auth.getUser();

    if (!currentUser) {
      return { status: 'idle', error: 'Sign in to update your password.' };
    }

    const currentPassword = (formData.get('current_password') as string | null) ?? '';
    const newPassword = (formData.get('new_password') as string | null) ?? '';
    const confirmPassword = (formData.get('confirm_password') as string | null) ?? '';

    if (!currentPassword) {
      return { status: 'idle', error: 'Enter your current password to continue.' };
    }
    if (newPassword.length < 8) {
      return { status: 'idle', error: 'New password must be at least 8 characters.' };
    }
    if (newPassword !== confirmPassword) {
      return { status: 'idle', error: 'New passwords do not match.' };
    }

    try {
      if (currentUser.email) {
        const { error: reauthError } = await supa.auth.signInWithPassword({
          email: currentUser.email,
          password: currentPassword,
        });
        if (reauthError) {
          return { status: 'idle', error: 'Current password is incorrect.' };
        }
      } else if (currentUser.phone) {
        const { error: reauthError } = await supa.auth.signInWithPassword({
          phone: currentUser.phone,
          password: currentPassword,
        });
        if (reauthError) {
          return { status: 'idle', error: 'Current password is incorrect.' };
        }
      } else {
        return {
          status: 'idle',
          error: 'No contact information found. Add an email or phone before updating the password.',
        };
      }

      const { error: updateError } = await supa.auth.updateUser({ password: newPassword });
      if (updateError) {
        throw updateError;
      }

      return { status: 'success', message: 'Password updated. Use your new password next time you sign in.' };
    } catch (error) {
      if (error instanceof Error) {
        return { status: 'idle', error: error.message };
      }
      return { status: 'idle', error: 'We could not update your password right now.' };
    }
  }

  const awaitingVerification = profile.affiliation_status === 'pending';
  const affiliationRevoked = profile.affiliation_status === 'revoked';
  const hasEmail = Boolean(initialEmail);
  const hasPhone = Boolean(initialPhone);

  return (
    <div className="mx-auto w-full max-w-6xl flex flex-col gap-6 px-4 py-8 md:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl text-foreground">Account settings</h1>
        <p className="max-w-3xl text-sm text-foreground/70">
          Keep your profile details and contact information up to date so neighbours know how you collaborate.
        </p>
      </header>

      {awaitingVerification ? (
        <div className="rounded-2xl border border-primary bg-primary/10 p-4 text-sm text-primary">
          We are confirming your IHARC team role. You can keep contributing as a community member while we
          verify.
        </div>
      ) : null}

      {affiliationRevoked ? (
        <div className="rounded-2xl border border-destructive bg-destructive/10 p-4 text-sm text-destructive-foreground">
          Your verified affiliation was revoked. Reach out to IHARC administrators if circumstances have changed.
        </div>
      ) : null}

      <ProfileDetailsForm
        organizations={organizations}
        action={updateProfileDetails}
        initialState={INITIAL_PROFILE_STATE}
        initialValues={initialValues}
        affiliationOptions={profileEnums.affiliationTypes.map((value) => ({
          value: value as AffiliationType,
          label: formatEnumLabel(value),
        }))}
        livedExperienceOptions={livedExperienceOptions as Array<{ value: Database['portal']['Enums']['lived_experience_status']; label: string; description: string }>}
      />

      <ProfileContactCard
        initialEmail={initialEmail}
        initialPhone={initialPhone}
        emailAction={updateEmail}
        phoneAction={updatePhone}
        initialEmailState={INITIAL_EMAIL_STATE}
        initialPhoneState={INITIAL_PHONE_STATE}
      />

      <ProfilePasswordForm
        action={updatePassword}
        initialState={INITIAL_PASSWORD_STATE}
        hasEmail={hasEmail}
        hasPhone={hasPhone}
      />
    </div>
  );
}
