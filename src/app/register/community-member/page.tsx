import { redirect } from 'next/navigation';
import {
  CommunityRegistrationForm,
  COMMUNITY_REGISTRATION_INITIAL_STATE,
  type CommunityRegistrationState,
} from '@/app/register/_components/community-registration-form';
import { resolveNextPath } from '@/lib/auth';
import { emptyToNull } from '@/lib/registration';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensurePortalProfile } from '@/lib/profile';
import type { Json } from '@/types/supabase';
import { FormPageShell } from '@/components/layout/form-page-shell';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[]>;

type CommunityRegistrationPageProps = {
  searchParams?: Promise<SearchParams>;
};

export default async function CommunityRegistrationPage({ searchParams }: CommunityRegistrationPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextPath = resolveNextPath(resolvedSearchParams?.next);

  const supabase = await createSupabaseRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(nextPath);
  }

  async function registerCommunityMember(
    prevState: CommunityRegistrationState,
    formData: FormData,
  ): Promise<CommunityRegistrationState> {
    'use server';

    const displayName = emptyToNull(formData.get('display_name')) ?? '';
    const email = emptyToNull((formData.get('email') as string | null)?.toLowerCase() ?? null);
    const password = (formData.get('password') as string | null) ?? '';
    const passwordConfirm = (formData.get('password_confirm') as string | null) ?? '';
    const consentPrivacy = formData.get('consent_privacy') === 'on';
    const consentTerms = formData.get('consent_terms') === 'on';
    const consentUpdates = formData.get('consent_updates') === 'on';

    if (!displayName || displayName.length < 2) {
      return { status: 'idle', error: 'Share the name you would like other neighbours to see.' };
    }

    if (!email) {
      return { status: 'idle', error: 'Enter the email address you want to use for IHARC updates.' };
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
        error: 'Consent to the privacy notice and terms before continuing. You can review them any time.',
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
            display_name: displayName,
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
          display_name: displayName,
          affiliation_type: 'community_member',
        });
        profileId = profile.id;
      } catch (profileError) {
        console.warn('Unable to ensure community profile during registration', profileError);
      }
    }

    const portal = supabase.schema('portal');
    const metadata: Json = {
      consent_updates: consentUpdates,
    };

    const { error: insertError } = await portal.from('registration_flows').insert({
      flow_type: 'community_registration',
      status: 'submitted',
      chosen_name: displayName,
      contact_email: email,
      consent_data_sharing: consentPrivacy,
      consent_contact: consentUpdates,
      consent_terms: consentTerms,
      metadata,
      supabase_user_id: createdUserId,
      profile_id: profileId,
    });

    if (insertError) {
      console.error('Failed to store community registration submission', insertError);
    }

    if (sessionAvailable && profileId) {
      const nextRaw = formData.get('next');
      const redirectTarget = resolveNextPath(typeof nextRaw === 'string' ? nextRaw : undefined);
      redirect(redirectTarget);
    }

    return {
      status: 'success',
      message:
        'Check your email for a confirmation link. Once verified, you can sign in to manage notification preferences.',
    };
  }

  return (
    <FormPageShell maxWidth="form-md">
      <CommunityRegistrationForm
        action={registerCommunityMember}
        initialState={COMMUNITY_REGISTRATION_INITIAL_STATE}
        nextPath={nextPath}
      />
    </FormPageShell>
  );
}
