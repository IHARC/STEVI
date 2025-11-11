import { redirect } from 'next/navigation';
import {
  VolunteerApplicationForm,
  VOLUNTEER_APPLICATION_INITIAL_STATE,
  type VolunteerApplicationState,
} from '@/app/register/_components/volunteer-application-form';
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
import { FormPageShell } from '@/components/layout/form-page-shell';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[]>;

type VolunteerApplicationPageProps = {
  searchParams?: Promise<SearchParams>;
};

export default async function VolunteerApplicationPage({ searchParams }: VolunteerApplicationPageProps) {
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

  async function submitVolunteerApplication(
    prevState: VolunteerApplicationState,
    formData: FormData,
  ): Promise<VolunteerApplicationState> {
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
    const pronouns = emptyToNull(formData.get('pronouns'));
    const email = emptyToNull((formData.get('email') as string | null)?.toLowerCase() ?? null);
    const phone = emptyToNull(formData.get('phone'));
    const normalizedPhone = phone ? normalizePhoneNumber(phone) ?? null : null;
    const interests = emptyToNull(formData.get('interests')) ?? '';
    const availability = emptyToNull(formData.get('availability'));
    const password = (formData.get('password') as string | null) ?? '';
    const passwordConfirm = (formData.get('password_confirm') as string | null) ?? '';
    const consentPrivacy = formData.get('consent_privacy') === 'on';
    const consentTerms = formData.get('consent_terms') === 'on';
    const consentScreening = formData.get('consent_screening') === 'on';

    if (!fullName || fullName.length < 2) {
      return { status: 'idle', error: 'Share your name so we know who is offering to help.' };
    }

    if (!email) {
      return { status: 'idle', error: 'Enter an email address so we can send volunteer onboarding details.' };
    }

    if (!interests || interests.length < 10) {
      return { status: 'idle', error: 'Let us know how you would like to help. A few words are fine.' };
    }

    if (!password || password.length < 12) {
      return { status: 'idle', error: 'Create a password with at least 12 characters.' };
    }

    if (password !== passwordConfirm) {
      return { status: 'idle', error: 'Confirm that both password entries match.' };
    }

    if (!consentPrivacy || !consentTerms || !consentScreening) {
      return {
        status: 'idle',
        error: 'Confirm the volunteer privacy and screening expectations before submitting your application.',
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
          affiliation_type: 'community_member',
          position_title: 'Volunteer applicant',
        });
        profileId = profile.id;
      } catch (profileError) {
        console.warn('Unable to ensure volunteer profile during registration', profileError);
      }
    }

    const metadata: Json = {
      pronouns,
      interests,
      availability,
      consent_screening: consentScreening,
    };

    const portal = supabase.schema('portal');
    const { error: insertError } = await portal.from('registration_flows').insert({
      flow_type: 'volunteer_application',
      status: 'pending',
      chosen_name: fullName,
      contact_email: email,
      contact_phone: normalizedPhone,
      consent_data_sharing: consentPrivacy,
      consent_contact: true,
      consent_terms: consentTerms,
      metadata,
      supabase_user_id: createdUserId,
      profile_id: profileId,
    });

    if (insertError) {
      console.error('Failed to store volunteer application', insertError);
    }

    if (sessionAvailable && profileId) {
      const nextRaw = formData.get('next');
      const redirectTarget = resolveNextPath(typeof nextRaw === 'string' ? nextRaw : undefined);
      redirect(redirectTarget);
    }

    return {
      status: 'success',
      message:
        'Thanks for offering to help. Check your email for confirmation and we’ll follow up about screening, training, and shifts.',
    };
  }

  return (
    <FormPageShell maxWidth="form-lg">
      <VolunteerApplicationForm
        action={submitVolunteerApplication}
        initialState={VOLUNTEER_APPLICATION_INITIAL_STATE}
        nextPath={nextPath}
        csrfToken={csrfToken}
      />
    </FormPageShell>
  );
}
