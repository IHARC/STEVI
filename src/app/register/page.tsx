import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensurePortalProfile } from '@/lib/profile';
import type { PortalProfile } from '@/lib/profile';
import type { Database } from '@/types/supabase';
import { RegisterForm } from '@/components/auth/register-form';
import { resolveNextPath, parseAuthErrorCode, type AuthErrorCode } from '@/lib/auth';
import {
  NEW_GOVERNMENT_VALUE,
  NEW_ORGANIZATION_VALUE,
  NO_ORGANIZATION_VALUE,
  PUBLIC_MEMBER_ROLE_LABEL,
} from '@/lib/constants';
import { normalizeLivedExperience } from '@/lib/lived-experience';
import { normalizePhoneNumber, maskPhoneNumber } from '@/lib/phone';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://iharc.ca';

export const dynamic = 'force-dynamic';

type ContactMethod = 'email' | 'phone';

type FormState = {
  status: 'idle' | 'otp_pending';
  contactMethod?: ContactMethod;
  error?: string;
  phone?: string;
  maskedPhone?: string;
  message?: string;
};

const INITIAL_FORM_STATE: FormState = {
  status: 'idle',
  contactMethod: 'email',
};

const ALLOWED_AFFILIATIONS: PortalProfile['affiliation_type'][] = [
  'community_member',
  'agency_partner',
  'government_partner',
];

const GOVERNMENT_LEVELS: PortalProfile['requested_government_level'][] = [
  'municipal',
  'county',
  'provincial',
  'federal',
  'other',
];

const GOVERNMENT_ROLE_TYPES: PortalProfile['requested_government_role'][] = ['staff', 'politician'];

type CommunityOrganization = {
  id: string;
  name: string;
};

type GovernmentBody = {
  id: string;
  name: string;
  level: Database['portal']['Enums']['government_level'];
};

type SearchParams = Record<string, string | string[]>;

type RegisterPageProps = {
  searchParams?: Promise<SearchParams>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const nextPath = resolveNextPath(resolvedSearchParams?.next);
  const authErrorCode = parseAuthErrorCode(resolvedSearchParams?.error);
  const initialError = authErrorCode ? getRegisterAuthErrorMessage(authErrorCode) : null;

  const supabase = await createSupabaseRSCClient();
  const portal = supabase.schema('portal');
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(nextPath);
  }

  const { data: organizationRows } = await portal
    .from('organizations')
    .select('id, name, category, government_level, verified')
    .eq('verified', true)
    .order('name', { ascending: true });

  const communityOrganizations: CommunityOrganization[] =
    (organizationRows ?? [])
      .filter((org) => org.category === 'community')
      .map((org) => ({ id: org.id, name: org.name }));

  const governmentBodies: GovernmentBody[] =
    (organizationRows ?? [])
      .filter((org): org is typeof org & { government_level: Database['portal']['Enums']['government_level'] } => {
        return org.category === 'government' && org.government_level !== null;
      })
      .map((org) => ({
        id: org.id,
        name: org.name,
        level: org.government_level,
      }));

  const initialState: FormState = initialError
    ? { ...INITIAL_FORM_STATE, error: initialError }
    : INITIAL_FORM_STATE;

  async function registerUser(_prevState: FormState, formData: FormData): Promise<FormState> {
    'use server';

    const contactMethod = normalizeContactMethod(formData.get('contact_method'));
    const otpCode = (formData.get('otp_code') as string | null)?.trim();

    if (otpCode) {
      if (contactMethod !== 'phone') {
        return { status: 'idle', contactMethod: 'email', error: 'We could not verify that code. Start again.' };
      }

      const rawPhone = (formData.get('otp_phone') as string | null) ?? '';
      const normalizedPhone = normalizePhoneNumber(rawPhone);
      if (!normalizedPhone) {
        return {
          status: 'otp_pending',
          contactMethod: 'phone',
          error: 'Enter the phone number you used to register.',
        };
      }

      try {
        const supa = await createSupabaseServerClient();
        const { error: verifyError } = await supa.auth.verifyOtp({
          phone: normalizedPhone,
          token: otpCode,
          type: 'sms',
        });

        if (verifyError) {
          return {
            status: 'otp_pending',
            contactMethod: 'phone',
            phone: normalizedPhone,
            maskedPhone: maskPhoneNumber(normalizedPhone) || normalizedPhone,
            error: verifyError.message ?? 'The code did not match. Try again.',
          };
        }

        const {
          data: { user: verifiedUser },
          error: userError,
        } = await supa.auth.getUser();

        if (userError || !verifiedUser) {
          return {
            status: 'otp_pending',
            contactMethod: 'phone',
            phone: normalizedPhone,
            maskedPhone: maskPhoneNumber(normalizedPhone) || normalizedPhone,
            error: 'We verified the code but could not finish setup. Try again.',
          };
        }

        const metadata = (verifiedUser.user_metadata ?? {}) as Record<string, unknown>;
        const pendingProfile = parsePendingPortalProfile(metadata.pending_portal_profile);

        if (pendingProfile) {
          try {
            await ensurePortalProfile(supa, verifiedUser.id, pendingProfile);
          } catch (profileError) {
            console.error('Unable to create portal profile after phone verification', profileError);
            return {
              status: 'otp_pending',
              contactMethod: 'phone',
              phone: normalizedPhone,
              maskedPhone: maskPhoneNumber(normalizedPhone) || normalizedPhone,
              error: 'We verified the code but could not finish setup. Try again.',
            };
          }

          // Best effort cleanup so the metadata does not linger.
          try {
            await supa.auth.updateUser({ data: { pending_portal_profile: null } });
          } catch (cleanupError) {
            console.warn('Failed to clear pending profile metadata after verification', cleanupError);
          }
        } else {
          await ensurePortalProfile(supa, verifiedUser.id);
        }
      } catch (error) {
        console.error('Unexpected error while verifying phone OTP', error);
        return {
          status: 'otp_pending',
          contactMethod: 'phone',
          phone: normalizedPhone,
          maskedPhone: maskPhoneNumber(normalizedPhone) || normalizedPhone,
          error: 'We could not verify that code. Try again.',
        };
      }

      redirect(nextPath);
    }

    const password = (formData.get('password') as string | null) ?? '';
    const confirmPassword = (formData.get('confirm_password') as string | null) ?? '';
    const displayName = (formData.get('display_name') as string | null)?.trim() ?? '';
    const rawAffiliation = (formData.get('affiliation_type') as string | null)?.trim() || 'community_member';
    const affiliationType = ALLOWED_AFFILIATIONS.includes(rawAffiliation as PortalProfile['affiliation_type'])
      ? (rawAffiliation as PortalProfile['affiliation_type'])
      : 'community_member';
    const rawAgencyOrganizationId = (formData.get('agency_organization_id') as string | null)?.trim() ?? null;
    const rawGovernmentBodyId = (formData.get('government_body_id') as string | null)?.trim() ?? null;
    const newOrganizationName = (formData.get('new_organization_name') as string | null)?.trim() ?? null;
    const newGovernmentName = (formData.get('new_government_name') as string | null)?.trim() ?? null;
    const rawGovernmentLevel = (formData.get('government_level') as string | null)?.trim() ?? null;
    const rawGovernmentRole = (formData.get('government_role_type') as string | null)?.trim() ?? null;
    const positionTitleInput = ((formData.get('position_title') as string | null)?.trim() ?? null);
    const rawHomelessnessExperience = (formData.get('homelessness_experience') as string | null) ?? 'none';
    const rawSubstanceUseExperience = (formData.get('substance_use_experience') as string | null) ?? 'none';
    const homelessnessExperience = normalizeLivedExperience(rawHomelessnessExperience);
    const substanceUseExperience = normalizeLivedExperience(rawSubstanceUseExperience);
    let organizationId: string | null = null;
    let requestedOrganizationName: string | null = null;
    let requestedGovernmentName: string | null = null;
    let requestedGovernmentLevel: PortalProfile['requested_government_level'] | null = null;
    let requestedGovernmentRole: PortalProfile['requested_government_role'] | null = null;
    let governmentRoleType: PortalProfile['government_role_type'] | null = null;

    if (affiliationType === 'agency_partner') {
      if (rawAgencyOrganizationId === NEW_ORGANIZATION_VALUE) {
        if (!newOrganizationName || newOrganizationName.length < 3) {
          return {
            status: 'idle',
            contactMethod,
            error: 'Share the organization name (minimum 3 characters).',
          };
        }
        requestedOrganizationName = newOrganizationName;
      } else if (rawAgencyOrganizationId && rawAgencyOrganizationId !== NO_ORGANIZATION_VALUE) {
        organizationId = rawAgencyOrganizationId;
      } else {
        return {
          status: 'idle',
          contactMethod,
          error: 'Select an existing organization or request a new listing.',
        };
      }
    } else if (affiliationType === 'government_partner') {
      const selectedGovernmentRole = GOVERNMENT_ROLE_TYPES.includes(
        rawGovernmentRole as PortalProfile['requested_government_role'],
      )
        ? (rawGovernmentRole as PortalProfile['requested_government_role'])
        : null;

      if (!selectedGovernmentRole) {
        return {
          status: 'idle',
          contactMethod,
          error: 'Select whether you are staff or elected leadership.',
        };
      }

      if (rawGovernmentBodyId === NEW_GOVERNMENT_VALUE) {
        if (!newGovernmentName || newGovernmentName.length < 3) {
          return {
            status: 'idle',
            contactMethod,
            error: 'Share the government body name (minimum 3 characters).',
          };
        }

        const selectedLevel = GOVERNMENT_LEVELS.includes(
          rawGovernmentLevel as PortalProfile['requested_government_level'],
        )
          ? (rawGovernmentLevel as PortalProfile['requested_government_level'])
          : null;

        if (!selectedLevel) {
          return {
            status: 'idle',
            contactMethod,
            error: 'Choose the level of government you represent.',
          };
        }

        requestedGovernmentName = newGovernmentName;
        requestedGovernmentLevel = selectedLevel;
        requestedGovernmentRole = selectedGovernmentRole;
      } else if (rawGovernmentBodyId && rawGovernmentBodyId !== NO_ORGANIZATION_VALUE) {
        organizationId = rawGovernmentBodyId;
        governmentRoleType = selectedGovernmentRole;
      } else {
        return {
          status: 'idle',
          contactMethod,
          error: 'Select your government team or request a new listing.',
        };
      }
    }

    if (affiliationType !== 'community_member' && !positionTitleInput) {
      return {
        status: 'idle',
        contactMethod,
        error: 'Share the position or role you hold with your agency or government team.',
      };
    }

    if (password.length < 8) {
      return { status: 'idle', contactMethod, error: 'Password must be at least 8 characters.' };
    }

    if (password !== confirmPassword) {
      return { status: 'idle', contactMethod, error: 'Confirm that both password entries match.' };
    }

    if (!displayName || displayName.length < 2) {
      return { status: 'idle', contactMethod, error: 'Share the name you would like neighbours to see.' };
    }

    const profileInput = {
      displayName,
      organizationId,
      positionTitleInput,
      affiliationType,
      homelessnessExperience,
      substanceUseExperience,
      governmentRoleType,
      requestedOrganizationName,
      requestedGovernmentName,
      requestedGovernmentLevel,
      requestedGovernmentRole,
    } satisfies ProfileFormValues;

    if (contactMethod === 'email') {
      const email = (formData.get('email') as string | null)?.trim().toLowerCase();

      if (!email || !email.includes('@')) {
        return { status: 'idle', contactMethod: 'email', error: 'Enter a valid email address.' };
      }

      try {
        const supa = await createSupabaseServerClient();
        const {
          data: signUpData,
          error: signUpError,
        } = await supa.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${APP_URL}/login`,
          },
        });

        if (signUpError) {
          return { status: 'idle', contactMethod: 'email', error: signUpError.message };
        }

        const createdUser = signUpData?.user ?? null;
        const session = signUpData?.session ?? null;

        if (!createdUser || !session) {
          return {
            status: 'idle',
            contactMethod: 'email',
            message: 'Check your email for a confirmation link. We will finish setting up your account after you verify.',
          };
        }

        type InviteRow = {
          id: string;
          affiliation_type: PortalProfile['affiliation_type'];
          position_title: string | null;
          organization_id: string | null;
          invited_by_profile_id: string | null;
          created_at: string;
        };

        let invite: InviteRow | null = null;
        const { data: inviteData, error: inviteError } = await supa.rpc('portal_get_pending_invite', {
          p_email: email,
        });

        if (inviteError) {
          console.error('Unable to load pending invite for registration', inviteError);
        } else if (inviteData) {
          invite = inviteData as InviteRow;
        }

        const { defaults } = buildProfileDefaults(profileInput, invite);
        const profile = await ensurePortalProfile(supa, createdUser.id, defaults);

        if (invite) {
          const { error: acceptError } = await supa.rpc('portal_accept_invite', {
            p_invite_id: invite.id,
            p_profile_id: profile.id,
          });
          if (acceptError) {
            console.error('Unable to mark invite as accepted', acceptError);
          }
        }
      } catch (error) {
        if (error instanceof Error) {
          return { status: 'idle', contactMethod: 'email', error: error.message };
        }
        return { status: 'idle', contactMethod: 'email', error: 'Unable to complete registration right now.' };
      }

      redirect(nextPath);
    }

    const phoneInput = (formData.get('phone') as string | null) ?? '';
    const normalizedPhone = normalizePhoneNumber(phoneInput);

    if (!normalizedPhone) {
      return {
        status: 'idle',
        contactMethod: 'phone',
        error: 'Enter a valid phone number with area code (e.g. +16471234567).',
      };
    }

    try {
      const supa = await createSupabaseServerClient();
      const { defaults } = buildProfileDefaults(profileInput, null);
      const { error: signUpError } = await supa.auth.signUp({
        phone: normalizedPhone,
        password,
        options: {
          data: {
            pending_portal_profile: serializeProfileDefaults(defaults),
          },
        },
      });

      if (signUpError) {
        return {
          status: 'idle',
          contactMethod: 'phone',
          error: signUpError.message,
        };
      }

      return {
        status: 'otp_pending',
        contactMethod: 'phone',
        phone: normalizedPhone,
        maskedPhone: maskPhoneNumber(normalizedPhone) || normalizedPhone,
        message: 'We sent a 6-digit verification code to your phone.',
      };
    } catch (error) {
      if (error instanceof Error) {
        return { status: 'idle', contactMethod: 'phone', error: error.message };
      }
      return { status: 'idle', contactMethod: 'phone', error: 'Unable to complete registration right now.' };
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Create your IHARC account</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          You will be able to adjust your profile and community participation rules after signing in.
        </p>
      </div>
      <RegisterForm
        organizations={communityOrganizations}
        governmentBodies={governmentBodies}
        action={registerUser}
        nextPath={nextPath}
        initialState={initialState}
      />
    </div>
  );
}

function getRegisterAuthErrorMessage(code: AuthErrorCode): string {
  switch (code) {
    case 'google_auth_cancelled':
      return 'Google sign-in was cancelled. Try again when you are ready.';
    case 'google_auth_error':
    default:
      return 'We could not connect to Google right now. Please try again.';
  }
}

type ProfileFormValues = {
  displayName: string;
  organizationId: string | null;
  positionTitleInput: string | null;
  affiliationType: PortalProfile['affiliation_type'];
  homelessnessExperience: PortalProfile['homelessness_experience'];
  substanceUseExperience: PortalProfile['substance_use_experience'];
  governmentRoleType: PortalProfile['government_role_type'];
  requestedOrganizationName: string | null;
  requestedGovernmentName: string | null;
  requestedGovernmentLevel: PortalProfile['requested_government_level'];
  requestedGovernmentRole: PortalProfile['requested_government_role'];
};

type ProfileDefaultsResult = {
  defaults: Partial<PortalProfile>;
};

function buildProfileDefaults(input: ProfileFormValues, invite: null | {
  id: string;
  affiliation_type: PortalProfile['affiliation_type'];
  position_title: string | null;
  organization_id: string | null;
  invited_by_profile_id: string | null;
  created_at: string;
}): ProfileDefaultsResult {
  const isCommunityMember = input.affiliationType === 'community_member';
  const baseRequestedAt = isCommunityMember ? null : new Date().toISOString();

  const defaults: Partial<PortalProfile> = {
    display_name: input.displayName,
    organization_id: input.organizationId,
    position_title: isCommunityMember ? PUBLIC_MEMBER_ROLE_LABEL : input.positionTitleInput ?? null,
    role: 'user',
    affiliation_type: input.affiliationType,
    affiliation_status: isCommunityMember ? 'approved' : 'pending',
    affiliation_requested_at: baseRequestedAt,
    affiliation_reviewed_at: null,
    affiliation_reviewed_by: null,
    homelessness_experience: input.homelessnessExperience,
    substance_use_experience: input.substanceUseExperience,
    government_role_type:
      input.affiliationType === 'government_partner' && input.organizationId
        ? input.governmentRoleType ?? null
        : null,
    requested_organization_name:
      input.affiliationType === 'agency_partner' && !input.organizationId ? input.requestedOrganizationName : null,
    requested_government_name:
      input.affiliationType === 'government_partner' && !input.organizationId ? input.requestedGovernmentName : null,
    requested_government_level:
      input.affiliationType === 'government_partner' && !input.organizationId ? input.requestedGovernmentLevel : null,
    requested_government_role:
      input.affiliationType === 'government_partner' ? input.requestedGovernmentRole ?? null : null,
  };

  if (!invite) {
    return { defaults };
  }

  const acceptedAt = new Date().toISOString();

  defaults.affiliation_type = invite.affiliation_type;
  defaults.organization_id = defaults.organization_id ?? invite.organization_id ?? null;
  defaults.position_title = defaults.position_title ?? invite.position_title ?? null;
  defaults.affiliation_requested_at = invite.created_at ?? defaults.affiliation_requested_at;
  defaults.requested_organization_name = null;
  defaults.requested_government_name = null;
  defaults.requested_government_level = null;
  defaults.requested_government_role = null;
  if (invite.affiliation_type === 'community_member') {
    defaults.affiliation_status = 'approved';
    defaults.affiliation_reviewed_at = acceptedAt;
    defaults.affiliation_reviewed_by = invite.invited_by_profile_id;
  } else {
    defaults.affiliation_status = 'pending';
    defaults.affiliation_reviewed_at = null;
    defaults.affiliation_reviewed_by = null;
    defaults.role = 'user';
  }

  return {
    defaults,
  };
}

function serializeProfileDefaults(defaults: Partial<PortalProfile>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(defaults).map(([key, value]) => [key, value === undefined ? null : value]),
  );
}

function parsePendingPortalProfile(value: unknown): Partial<PortalProfile> | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (Object.keys(record).length === 0) {
    return null;
  }

  return record as Partial<PortalProfile>;
}

function normalizeContactMethod(value: FormDataEntryValue | null): ContactMethod {
  if (typeof value === 'string' && value.trim().toLowerCase() === 'phone') {
    return 'phone';
  }
  return 'email';
}
