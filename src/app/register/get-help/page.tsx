import { redirect } from 'next/navigation';
import { ClientIntakeForm, CLIENT_INTAKE_INITIAL_STATE, type ClientIntakeFormState } from '@/app/register/_components/client-intake-form';
import { resolveNextPath } from '@/lib/auth';
import { emptyToNull, formatPortalCode, generatePortalCode, normalizePostalCode } from '@/lib/registration';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensurePortalProfile } from '@/lib/profile';
import { maskPhoneNumber, normalizePhoneNumber } from '@/lib/phone';
import type { Json } from '@/types/supabase';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[]>;

type ClientIntakePageProps = {
  searchParams?: Promise<SearchParams>;
};

type ContactChoice = 'email' | 'phone' | 'both' | 'none';

export default async function ClientIntakePage({ searchParams }: ClientIntakePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextPath = resolveNextPath(resolvedSearchParams?.next);

  const supabase = await createSupabaseRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(nextPath);
  }

  async function submitIntake(prevState: ClientIntakeFormState, formData: FormData): Promise<ClientIntakeFormState> {
    'use server';

    const contactChoice = parseContactChoice(formData.get('contact_choice'));
    const email = emptyToNull((formData.get('contact_email') as string | null)?.toLowerCase() ?? null);
    const rawPhone = formData.get('contact_phone') as string | null;
    const normalizedPhone = rawPhone ? normalizePhoneNumber(rawPhone) ?? null : null;
    const chosenName = emptyToNull(formData.get('chosen_name')) ?? '';
    const legalName = emptyToNull(formData.get('legal_name'));
    const pronouns = emptyToNull(formData.get('pronouns'));
    const contactWindow = emptyToNull(formData.get('contact_window'));
    const additionalContext = emptyToNull(formData.get('additional_context'));

    if (!chosenName || chosenName.length < 2) {
      return { status: 'idle', error: 'Share the name you would like us to use — at least two characters.' };
    }

    if ((contactChoice === 'email' || contactChoice === 'both') && !email) {
      return { status: 'idle', error: 'Enter a valid email or switch contact options.' };
    }

    if ((contactChoice === 'phone' || contactChoice === 'both') && !normalizedPhone) {
      return {
        status: 'idle',
        error: 'Include a phone number with area code (e.g. +16475551234) or choose a different contact option.',
      };
    }

    const password = shouldCollectPassword(contactChoice) ? (formData.get('password') as string | null) ?? '' : null;
    const passwordConfirm = shouldCollectPassword(contactChoice)
      ? (formData.get('password_confirm') as string | null) ?? ''
      : null;

    if (shouldCollectPassword(contactChoice)) {
      if (!password || password.length < 12) {
        return { status: 'idle', error: 'Create a password with at least 12 characters.' };
      }
      if (password !== passwordConfirm) {
        return { status: 'idle', error: 'Confirm that both password entries match.' };
      }
    }

    const consentPrivacy = formData.get('consent_privacy') === 'on';
    const consentTerms = formData.get('consent_terms') === 'on';
    const consentContact = contactChoice === 'none' ? false : formData.get('consent_contact') === 'on';

    if (!consentPrivacy || !consentTerms) {
      return {
        status: 'idle',
        error: 'We need your consent to our privacy notice and terms before continuing. You can review them any time.',
      };
    }

    if (shouldCollectPassword(contactChoice) && !consentContact) {
      return {
        status: 'idle',
        error: 'Let us know if it is safe to contact you about your case, or choose the “no contact” option.',
      };
    }

    const dobMonth = parseNumber(formData.get('dob_month'));
    const dobYear = parseNumber(formData.get('dob_year'));
    const postalCode = normalizePostalCode(emptyToNull(formData.get('postal_code')));
    const indigenousIdentity = emptyToNull(formData.get('indigenous_identity'));
    const disability = emptyToNull(formData.get('disability'));
    const genderIdentity = emptyToNull(formData.get('gender_identity'));

    const metadata: Json = {
      additional_context: additionalContext,
      contact_window: contactWindow,
      contact_choice: contactChoice,
    };

    const supabase = await createSupabaseServerClient();
    const portal = supabase.schema('portal');
    let createdUserId: string | null = null;
    let profileId: string | null = null;
    let sessionAvailable = false;

    if (contactChoice !== 'none') {
      try {
        if (contactChoice === 'phone') {
          const { data, error } = await supabase.auth.signUp({
            phone: normalizedPhone!,
            password: password!,
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
            password: password!,
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
    }

    if (sessionAvailable && createdUserId) {
      try {
        const profile = await ensurePortalProfile(supabase, createdUserId, {
          display_name: chosenName,
          affiliation_type: 'community_member',
          position_title: 'Client',
        });
        profileId = profile.id;
      } catch (profileError) {
        console.warn('Unable to ensure portal profile during intake', profileError);
      }
    }

    const registrationPayload = {
      flow_type: 'client_intake' as const,
      status: 'submitted',
      chosen_name: chosenName,
      legal_name: legalName,
      pronouns,
      contact_email: email,
      contact_phone: normalizedPhone,
      contact_phone_safe_call: formData.get('safe_call') === 'on',
      contact_phone_safe_text: formData.get('safe_text') === 'on',
      contact_phone_safe_voicemail: formData.get('safe_voicemail') === 'on',
      contact_window: contactWindow,
      date_of_birth_month: dobMonth,
      date_of_birth_year: dobYear,
      postal_code: postalCode,
      indigenous_identity: indigenousIdentity,
      disability,
      gender_identity: genderIdentity,
      consent_data_sharing: consentPrivacy,
      consent_contact: consentContact,
      consent_terms: consentTerms,
      metadata,
      supabase_user_id: createdUserId,
      profile_id: profileId,
    };

    let portalCode: string | null = null;
    const attempts = contactChoice === 'none' ? 6 : 3;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const codeCandidate = generatePortalCode();
      const submission = { ...registrationPayload, portal_code: codeCandidate };
      const { error: insertError } = await portal.from('registration_flows').insert(submission);

      if (!insertError) {
        portalCode = codeCandidate;
        break;
      }

      if (insertError.code === '23505') {
        continue;
      }

      console.error('Unable to store registration intake', insertError);
      return {
        status: 'idle',
        error: 'We could not save your intake right now. Try again in a few minutes or reach out to an outreach worker.',
      };
    }

    if (!portalCode) {
      return {
        status: 'idle',
        error: 'We could not generate a portal code. Please try again or ask staff to assist.',
      };
    }

    if (sessionAvailable && createdUserId) {
      const nextRaw = formData.get('next');
      const redirectTarget = resolveNextPath(typeof nextRaw === 'string' ? nextRaw : undefined);
      redirect(redirectTarget);
    }

    const formattedCode = formatPortalCode(portalCode);
    const message = buildSuccessMessage(contactChoice);

    return {
      status: 'success',
      portalCode: formattedCode ?? portalCode,
      message,
      contactEmail: email,
      contactPhone: normalizedPhone ? maskPhoneNumber(normalizedPhone) : null,
    };
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <ClientIntakeForm action={submitIntake} initialState={CLIENT_INTAKE_INITIAL_STATE} nextPath={nextPath} />
    </div>
  );
}

function parseContactChoice(value: FormDataEntryValue | null): ContactChoice {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (normalized === 'phone' || normalized === 'both' || normalized === 'none') {
    return normalized;
  }
  return 'email';
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

function shouldCollectPassword(choice: ContactChoice): boolean {
  return choice === 'email' || choice === 'phone' || choice === 'both';
}

function buildSuccessMessage(choice: ContactChoice): string {
  if (choice === 'none') {
    return 'Record this 8-digit code and bring it to IHARC staff when you are ready to finish setting up your account.';
  }

  if (choice === 'phone') {
    return 'We sent a secure text with instructions to verify your account. Keep your code handy as a backup with staff.';
  }

  if (choice === 'both') {
    return 'We emailed and texted verification instructions. Use whichever method is safest and keep your code handy.';
  }

  return 'We emailed instructions to finish verifying your account. You can use this code as backup with staff.';
}
