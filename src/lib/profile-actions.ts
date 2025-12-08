'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { normalizeEmail } from '@/lib/email';
import { normalizePhoneNumber, maskPhoneNumber } from '@/lib/phone';
import { normalizeLivedExperience, type LivedExperienceStatus } from '@/lib/lived-experience';
import {
  NEW_ORGANIZATION_VALUE,
  NO_ORGANIZATION_VALUE,
  PUBLIC_MEMBER_ROLE_LABEL,
} from '@/lib/constants';
import type { PortalProfile } from '@/lib/profile';
import type { Database } from '@/types/supabase';
import type { ProfileDetailsFormState } from '@shared/profile/profile-details-form';
import type { EmailFormState, PhoneFormState } from '@shared/profile/profile-contact-card';
import type { PasswordFormState } from '@shared/profile/profile-password-form';

type AffiliationType = Database['portal']['Enums']['affiliation_type'];

export type ProfileActionParams = {
  profile: PortalProfile;
  currentAffiliation: AffiliationType;
  allowedAffiliations: AffiliationType[];
  livedExperienceValues: LivedExperienceStatus[];
  revalidateTarget: string;
};

export function makeProfileActions({
  profile,
  currentAffiliation,
  allowedAffiliations,
  livedExperienceValues,
  revalidateTarget,
}: ProfileActionParams) {
  async function updateProfileDetails(_prevState: ProfileDetailsFormState, formData: FormData): Promise<ProfileDetailsFormState> {
    'use server';

    const supabase = await createSupabaseServerClient();
    const portalClient = supabase.schema('portal');

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

      await revalidatePath(revalidateTarget);
      return { status: 'success', message: 'Profile updated.' } as const;
    } catch (error) {
      if (error instanceof Error) {
        return { status: 'idle', error: error.message } as const;
      }
      return { status: 'idle', error: 'We could not update your profile right now.' } as const;
    }
  }

  async function updateEmail(_prevState: EmailFormState, formData: FormData): Promise<EmailFormState> {
    'use server';

    const supa = await createSupabaseServerClient();
    const {
      data: { user: currentUser },
    } = await supa.auth.getUser();

    if (!currentUser) {
      return { status: 'idle', error: 'Sign in to update your contact details.' } as const;
    }

    const emailInput = normalizeEmail(formData.get('email'));

    if (!emailInput) {
      if (!currentUser.email) {
        return { status: 'idle', message: 'Email remains empty. Add one when you are ready.' } as const;
      }
      return { status: 'idle', error: 'Enter a valid email address to update your account.' } as const;
    }

    if (currentUser.email && currentUser.email.toLowerCase() === emailInput) {
      return { status: 'idle', message: 'This email is already active on your account.' } as const;
    }

    try {
      const { error } = await supa.auth.updateUser({ email: emailInput });
      if (error) {
        throw error;
      }

      return {
        status: 'success',
        message: 'Check your inbox to confirm the update. We will switch emails once you verify.',
      } as const;
    } catch (error) {
      if (error instanceof Error) {
        return { status: 'idle', error: error.message } as const;
      }
      return { status: 'idle', error: 'We could not update your email right now.' } as const;
    }
  }

  async function updatePhone(_prevState: PhoneFormState, formData: FormData): Promise<PhoneFormState> {
    'use server';

    const supa = await createSupabaseServerClient();
    const {
      data: { user: currentUser },
    } = await supa.auth.getUser();

    if (!currentUser) {
      return { status: 'idle', error: 'Sign in to update your contact details.' } as const;
    }

    const intent = (formData.get('intent') as string | null) ?? '';
    const stage = (formData.get('stage') as string | null) ?? 'request';

    if (intent === 'cancel') {
      return { status: 'idle' } as const;
    }

    if (stage === 'verify') {
      const otpCode = (formData.get('otp_code') as string | null)?.trim();
      const rawPhone = (formData.get('otp_phone') as string | null) ?? (formData.get('phone') as string | null) ?? '';
      const normalizedPhone = normalizePhoneNumber(rawPhone);

      if (!normalizedPhone) {
        return { status: 'otp_sent', error: 'Enter the phone number we texted the code to.' } as const;
      }

      if (!otpCode || otpCode.length < 4) {
        return {
          status: 'otp_sent',
          phone: normalizedPhone,
          maskedPhone: maskPhoneNumber(normalizedPhone) ?? normalizedPhone,
          error: 'Enter the 6-digit code from your text message.',
        } as const;
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

        await revalidatePath(revalidateTarget);
        return {
          status: 'success',
          phone: normalizedPhone,
          message: 'Phone number verified.',
        } as const;
      } catch (error) {
        const masked = maskPhoneNumber(normalizedPhone) ?? normalizedPhone;
        if (error instanceof Error) {
          return { status: 'otp_sent', phone: normalizedPhone, maskedPhone: masked, error: error.message } as const;
        }
        return {
          status: 'otp_sent',
          phone: normalizedPhone,
          maskedPhone: masked,
          error: 'We could not verify that code. Try again.',
        } as const;
      }
    }

    const rawPhone = (formData.get('phone') as string | null) ?? '';
    const normalizedPhone = normalizePhoneNumber(rawPhone);

    if (!normalizedPhone) {
      return { status: 'idle', error: 'Enter a valid phone number with country code (e.g. +16475551234).' } as const;
    }

    if (currentUser.phone && normalizePhoneNumber(currentUser.phone) === normalizedPhone) {
      return { status: 'idle', message: 'This phone number is already active on your account.' } as const;
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
      } as const;
    } catch (error) {
      if (error instanceof Error) {
        return { status: 'idle', error: error.message } as const;
      }
      return { status: 'idle', error: 'We could not send a verification code. Try again shortly.' } as const;
    }
  }

  async function updatePassword(_prevState: PasswordFormState, formData: FormData): Promise<PasswordFormState> {
    'use server';

    const supa = await createSupabaseServerClient();
    const {
      data: { user: currentUser },
    } = await supa.auth.getUser();

    if (!currentUser) {
      return { status: 'idle', error: 'Sign in to update your password.' } as const;
    }

    const currentPassword = (formData.get('current_password') as string | null) ?? '';
    const newPassword = (formData.get('new_password') as string | null) ?? '';
    const confirmPassword = (formData.get('confirm_password') as string | null) ?? '';

    if (!currentPassword) {
      return { status: 'idle', error: 'Enter your current password to continue.' } as const;
    }
    if (newPassword.length < 8) {
      return { status: 'idle', error: 'New password must be at least 8 characters.' } as const;
    }
    if (newPassword !== confirmPassword) {
      return { status: 'idle', error: 'New passwords do not match.' } as const;
    }

    try {
      if (currentUser.email) {
        const { error: reauthError } = await supa.auth.signInWithPassword({
          email: currentUser.email,
          password: currentPassword,
        });
        if (reauthError) {
          return { status: 'idle', error: 'Current password is incorrect.' } as const;
        }
      } else if (currentUser.phone) {
        const { error: reauthError } = await supa.auth.signInWithPassword({
          phone: currentUser.phone,
          password: currentPassword,
        });
        if (reauthError) {
          return { status: 'idle', error: 'Current password is incorrect.' } as const;
        }
      } else {
        return {
          status: 'idle',
          error: 'No contact information found. Add an email or phone before updating the password.',
        } as const;
      }

      const { error: updateError } = await supa.auth.updateUser({ password: newPassword });
      if (updateError) {
        throw updateError;
      }

      return { status: 'success', message: 'Password updated. Use your new password next time you sign in.' } as const;
    } catch (error) {
      if (error instanceof Error) {
        return { status: 'idle', error: error.message } as const;
      }
      return { status: 'idle', error: 'We could not update your password right now.' } as const;
    }
  }

  return {
    updateProfileDetails,
    updateEmail,
    updatePhone,
    updatePassword,
  };
}
