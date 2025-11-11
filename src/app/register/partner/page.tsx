import { redirect } from 'next/navigation';
import {
  PartnerApplicationForm,
  PARTNER_APPLICATION_INITIAL_STATE,
  type PartnerApplicationState,
} from '@/app/register/_components/partner-application-form';
import { resolveNextPath } from '@/lib/auth';
import { emptyToNull } from '@/lib/registration';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensurePortalProfile } from '@/lib/profile';
import { normalizePhoneNumber } from '@/lib/phone';
import {
  getOrCreateCsrfToken,
  validateCsrfFromForm,
  InvalidCsrfTokenError,
  CSRF_ERROR_MESSAGE,
} from '@/lib/csrf';
import type { Json } from '@/types/supabase';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[]>;

type PartnerApplicationPageProps = {
  searchParams?: Promise<SearchParams>;
};

export default async function PartnerApplicationPage({ searchParams }: PartnerApplicationPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextPath = resolveNextPath(resolvedSearchParams?.next);

  const supabase = await createSupabaseRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(nextPath);
  }

  const csrfToken = await getOrCreateCsrfToken();

  async function submitPartnerApplication(
    prevState: PartnerApplicationState,
    formData: FormData,
  ): Promise<PartnerApplicationState> {
    'use server';

    try {
      await validateCsrfFromForm(formData);
    } catch (error) {
      if (error instanceof InvalidCsrfTokenError) {
        return { status: 'idle', error: CSRF_ERROR_MESSAGE };
      }
      throw error;
    }

    const fullName = emptyToNull(formData.get('full_name')) ?? '';
    const roleTitle = emptyToNull(formData.get('role_title')) ?? '';
    const organizationName = emptyToNull(formData.get('organization_name')) ?? '';
    const email = emptyToNull((formData.get('work_email') as string | null)?.toLowerCase() ?? null);
    const phone = emptyToNull(formData.get('work_phone'));
    const normalizedPhone = phone ? normalizePhoneNumber(phone) ?? null : null;
    const programsSupported = emptyToNull(formData.get('programs_supported'));
    const dataRequirements = emptyToNull(formData.get('data_requirements'));
    const password = (formData.get('password') as string | null) ?? '';
    const passwordConfirm = (formData.get('password_confirm') as string | null) ?? '';
    const consentPrivacy = formData.get('consent_privacy') === 'on';
    const consentTerms = formData.get('consent_terms') === 'on';
    const consentNotifications = formData.get('consent_notifications') === 'on';

    if (!fullName || fullName.length < 2) {
      return { status: 'idle', error: 'Share your name so IHARC staff know who submitted the application.' };
    }

    if (!roleTitle) {
      return { status: 'idle', error: 'Share your role so we can assign the right access scope.' };
    }

    if (!organizationName) {
      return { status: 'idle', error: 'Let us know which organization you represent.' };
    }

    if (!email) {
      return { status: 'idle', error: 'Use a work email so we can confirm your agency domain quickly.' };
    }

    if (!password || password.length < 12) {
      return { status: 'idle', error: 'Create a password with at least 12 characters.' };
    }

    if (password !== passwordConfirm) {
      return { status: 'idle', error: 'Confirm that both password entries match.' };
    }

    if (!consentPrivacy || !consentTerms) {
      return {
        status: 'idle',
        error: 'Confirm the data-sharing agreement status and agree to the portal terms before continuing.',
      };
    }

    const supabase = await createSupabaseServerClient();
    let createdUserId: string | null = null;
    let profileId: string | null = null;
    let sessionAvailable = false;

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_APP_URL
            ? `${process.env.NEXT_PUBLIC_APP_URL}/login`
            : undefined,
          data: {
            display_name: fullName,
          },
        },
      });

      if (error) {
        return { status: 'idle', error: error.message ?? 'We could not create your account right now.' };
      }

      createdUserId = data.user?.id ?? null;
      sessionAvailable = Boolean(data.session);
    } catch (error) {
      if (error instanceof Error) {
        return { status: 'idle', error: error.message };
      }
      return { status: 'idle', error: 'We could not create your account right now.' };
    }

    if (!createdUserId) {
      return { status: 'idle', error: 'We could not create your account right now. Try again later.' };
    }

    if (sessionAvailable) {
      try {
        const profile = await ensurePortalProfile(supabase, createdUserId, {
          display_name: fullName,
          affiliation_type: 'agency_partner',
          affiliation_status: 'pending',
          position_title: roleTitle,
          requested_organization_name: organizationName,
        });
        profileId = profile.id;
      } catch (profileError) {
        console.warn('Unable to ensure partner profile during registration', profileError);
      }
    }

    const portal = supabase.schema('portal');
    const metadata: Json = {
      role_title: roleTitle,
      organization_name: organizationName,
      programs_supported: programsSupported,
      data_requirements: dataRequirements,
      consent_notifications: consentNotifications,
    };

    const { error: insertError } = await portal.from('registration_flows').insert({
      flow_type: 'partner_application',
      status: 'pending',
      chosen_name: fullName,
      contact_email: email,
      contact_phone: normalizedPhone,
      consent_data_sharing: consentPrivacy,
      consent_contact: consentNotifications,
      consent_terms: consentTerms,
      metadata,
      supabase_user_id: createdUserId,
      profile_id: profileId,
    });

    if (insertError) {
      console.error('Failed to store partner application', insertError);
    }

    if (sessionAvailable && profileId) {
      const nextRaw = formData.get('next');
      const redirectTarget = resolveNextPath(typeof nextRaw === 'string' ? nextRaw : undefined);
      redirect(redirectTarget);
    }

    return {
      status: 'success',
      message:
        'Thanks for submitting your partner application. Check your email to verify the account and we’ll follow up once the data-sharing agreement is confirmed.',
    };
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <PartnerApplicationForm
        action={submitPartnerApplication}
        initialState={PARTNER_APPLICATION_INITIAL_STATE}
        nextPath={nextPath}
        csrfToken={csrfToken}
      />
    </div>
  );
}
