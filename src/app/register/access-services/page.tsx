import { redirect } from 'next/navigation';
import { ClientClaimForm, CLIENT_CLAIM_INITIAL_STATE, type ClientClaimFormState } from '@/app/register/_components/client-claim-form';
import { resolveNextPath } from '@/lib/auth';
import { emptyToNull, formatPortalCode, generatePortalCode } from '@/lib/registration';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensurePortalProfile } from '@/lib/profile';
import { maskPhoneNumber, normalizePhoneNumber } from '@/lib/phone';
import { checkRateLimit } from '@/lib/rate-limit';
import type { Json } from '@/types/supabase';
import { FormPageShell } from '@shared/layout/form-page-shell';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[]>;

type ClientClaimPageProps = {
  searchParams?: Promise<SearchParams>;
};

type ContactMethod = 'email' | 'phone';

export default async function ClientClaimPage({ searchParams }: ClientClaimPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextPath = resolveNextPath(resolvedSearchParams?.next);

  const supabase = await createSupabaseRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(nextPath);
  }

  async function claimAccount(prevState: ClientClaimFormState, formData: FormData): Promise<ClientClaimFormState> {
    'use server';

    const contactMethod = parseContactMethod(formData.get('contact_method'));
    const portalCodeRaw = emptyToNull(formData.get('portal_code'));
    const chosenName = emptyToNull(formData.get('chosen_name')) ?? '';
    const dobMonth = parseNumber(formData.get('dob_month'));
    const dobYear = parseNumber(formData.get('dob_year'));
    const email = contactMethod === 'email' ? emptyToNull((formData.get('contact_email') as string | null)?.toLowerCase() ?? null) : null;
    const rawPhone = contactMethod === 'phone' ? (formData.get('contact_phone') as string | null) : null;
    const normalizedPhone = rawPhone ? normalizePhoneNumber(rawPhone) ?? null : null;
    const password = (formData.get('password') as string | null) ?? '';
    const passwordConfirm = (formData.get('password_confirm') as string | null) ?? '';

    if (!chosenName || chosenName.length < 2) {
      return { status: 'idle', error: 'Share the name that appears on your IHARC record.' };
    }

    if (!dobMonth || !dobYear) {
      return { status: 'idle', error: 'Share your birth month and year so we can match the right record.' };
    }

    if (contactMethod === 'email' && !email) {
      return { status: 'idle', error: 'Enter the email you would like to use for portal access.' };
    }

    if (contactMethod === 'phone' && !normalizedPhone) {
      return {
        status: 'idle',
        error: 'Enter a valid phone number with country code or switch to the email option.',
      };
    }

    if (!password || password.length < 12) {
      return { status: 'idle', error: 'Create a password with at least 12 characters.' };
    }

    if (password !== passwordConfirm) {
      return { status: 'idle', error: 'Confirm that both password entries match.' };
    }

    const consentPrivacy = formData.get('consent_privacy') === 'on';
    const consentTerms = formData.get('consent_terms') === 'on';
    const consentContact = formData.get('consent_contact') === 'on';

    if (!consentPrivacy || !consentTerms || !consentContact) {
      return {
        status: 'idle',
        error: 'Consent to the privacy notice, terms, and safe contact before continuing.',
      };
    }

    const pieces = [
      portalCodeRaw ? 1 : 0,
      chosenName && dobMonth && dobYear ? 1 : 0,
      email ? 1 : 0,
      normalizedPhone ? 1 : 0,
    ].reduce((acc, curr) => acc + curr, 0);

    if (pieces < 2) {
      return {
        status: 'idle',
        error: 'Share at least two pieces of information (code, name + birth month/year, email, or phone).',
      };
    }

    const supabase = await createSupabaseServerClient();
    const claimRateLimit = await checkRateLimit({
      supabase,
      type: 'registration_claim',
      limit: 3,
      cooldownMs: 5 * 60 * 1000,
    });

    if (!claimRateLimit.allowed) {
      return {
        status: 'idle',
        error: formatRateLimitError(claimRateLimit.retryInMs),
      };
    }

    let createdUserId: string | null = null;
    let profileId: string | null = null;
    let sessionAvailable = false;

    try {
      if (contactMethod === 'phone') {
        const { data, error } = await supabase.auth.signUp({
          phone: normalizedPhone!,
          password,
          options: {
            data: {
              display_name: chosenName,
            },
          },
        });

        if (error) {
          return { status: 'idle', error: error.message ?? 'We could not create your account right now.' };
        }

        createdUserId = data.user?.id ?? null;
        sessionAvailable = Boolean(data.session);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email!,
          password,
          options: {
            emailRedirectTo: process.env.NEXT_PUBLIC_APP_URL
              ? `${process.env.NEXT_PUBLIC_APP_URL}/login`
              : undefined,
            data: {
              display_name: chosenName,
            },
          },
        });

        if (error) {
          return { status: 'idle', error: error.message ?? 'We could not create your account right now.' };
        }

        createdUserId = data.user?.id ?? null;
        sessionAvailable = Boolean(data.session);
      }
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
          display_name: chosenName,
          affiliation_type: 'client',
          position_title: 'Client',
        });
        profileId = profile.id;
      } catch (profileError) {
        console.warn('Unable to create profile during client claim', profileError);
      }
    }

    const normalizedCode = sanitizePortalCode(portalCodeRaw);
    const rpcArgs = {
      p_portal_code: normalizedCode,
      p_chosen_name: chosenName,
      p_date_of_birth_month: dobMonth,
      p_date_of_birth_year: dobYear,
      p_contact_email: email,
      p_contact_phone: normalizedPhone,
    };

    if (sessionAvailable && profileId) {
      try {
        const portalSchema = supabase.schema('portal');
        const { data, error } = await portalSchema.rpc('claim_registration_flow', rpcArgs);

        if (error) {
          console.error('claim_registration_flow error', error);
          return {
            status: 'idle',
            error: 'We could not link your record right now. Please contact IHARC staff for assistance.',
          };
        }

        const result = Array.isArray(data) ? data[0] : null;
        if (!result?.success) {
          const reason = result?.reason ?? 'no_match';
          const friendly = mapClaimFailure(reason);
          return { status: 'idle', error: friendly };
        }

        const nextRaw = formData.get('next');
        const redirectTarget = resolveNextPath(typeof nextRaw === 'string' ? nextRaw : undefined);
        redirect(redirectTarget);
      } catch (error) {
        console.error('Unexpected error claiming registration', error);
        return {
          status: 'idle',
          error: 'We could not link your record right now. Please contact IHARC staff for assistance.',
        };
      }
    }

    // If we reach this point, we need staff follow-up (no session yet). Store a pending claim.
    const metadata: Json = {
      chosen_name: chosenName,
      dob_month: dobMonth,
      dob_year: dobYear,
      contact_method: contactMethod,
      masked_phone: normalizedPhone ? maskPhoneNumber(normalizedPhone) : null,
    };

    const portal = supabase.schema('portal');
    const { error: insertError } = await portal.from('registration_flows').insert({
      flow_type: 'client_claim',
      status: 'pending',
      portal_code: normalizedCode ?? generatePortalCode(),
      chosen_name: chosenName,
      contact_email: email,
      contact_phone: normalizedPhone,
      metadata,
      supabase_user_id: createdUserId,
      profile_id: profileId,
      consent_data_sharing: consentPrivacy,
      consent_contact: consentContact,
      consent_terms: consentTerms,
    });

    if (insertError) {
      console.error('Unable to store client claim request', insertError);
    }

    const successMessage =
      contactMethod === 'phone'
        ? 'Check your phone for a verification link. After you confirm, sign in again so we can finish linking your record.'
        : 'Check your email for a verification link. After you confirm, sign in again and we’ll finish linking your record.';

    return {
      status: 'success',
      portalCode: formatPortalCode(normalizedCode ?? undefined),
      message: successMessage,
    };
  }

  return (
    <FormPageShell maxWidth="form-lg">
      <ClientClaimForm
        action={claimAccount}
        initialState={CLIENT_CLAIM_INITIAL_STATE}
        nextPath={nextPath}
      />
    </FormPageShell>
  );
}

function parseContactMethod(value: FormDataEntryValue | null): ContactMethod {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return normalized === 'phone' ? 'phone' : 'email';
}

function parseNumber(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function sanitizePortalCode(code: string | null): string | null {
  if (!code) {
    return null;
  }
  const cleaned = code.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  return cleaned.length ? cleaned : null;
}

function mapClaimFailure(reason: string): string {
  switch (reason) {
    case 'no_match':
      return 'We could not find a record that matches those details. Double-check the information or ask IHARC staff to help.';
    case 'insufficient_match':
      return 'We found a possible match, but need one more piece of information. Try adding your IHARC code or phone number.';
    case 'insufficient_identifiers':
      return 'Share at least two pieces of information (code, name with birth month/year, email, or phone).';
    default:
      return 'We could not link your record right now. Please contact IHARC staff for assistance.';
  }
}

function formatRateLimitError(retryInMs: number): string {
  const minutes = Math.max(1, Math.ceil(retryInMs / 60000));
  return `We’re receiving many requests. Please wait about ${minutes} minute${minutes === 1 ? '' : 's'} before trying again.`;
}
