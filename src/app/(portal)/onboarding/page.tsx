import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { resolveNextPath } from '@/lib/auth';
import { loadPortalAccess } from '@/lib/portal-access';
import { getOnboardingStatus } from '@/lib/onboarding/status';
import { resolveOnboardingActor, type OnboardingActor } from '@/lib/onboarding/utils';
import { OnboardingWizard, type OnboardingPrefill } from '@/components/onboarding/onboarding-wizard';
import { getPolicyBySlug } from '@/lib/policies';
import { normalizePostalCode } from '@/lib/registration';
import type { Database } from '@/types/supabase';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[]>>;
};

type PersonDetail = Pick<
  Database['core']['Tables']['people']['Row'],
  | 'id'
  | 'first_name'
  | 'last_name'
  | 'email'
  | 'phone'
  | 'preferred_pronouns'
  | 'preferred_contact_method'
  | 'data_sharing_consent'
>;

type RegistrationDraft = Pick<
  Database['portal']['Tables']['registration_flows']['Row'],
  | 'chosen_name'
  | 'legal_name'
  | 'pronouns'
  | 'contact_email'
  | 'contact_phone'
  | 'contact_window'
  | 'postal_code'
  | 'date_of_birth_month'
  | 'date_of_birth_year'
  | 'contact_phone_safe_call'
  | 'contact_phone_safe_text'
  | 'contact_phone_safe_voicemail'
  | 'consent_data_sharing'
>;

export default async function OnboardingPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const nextPath = resolveNextPath(params.next, '/home');
  const requestedPersonId = parsePersonId(params.person);

  const supabase = await createSupabaseRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent('/onboarding')}`);
  }

  const access = await loadPortalAccess(supabase);
  if (!access) {
    redirect(`/login?next=${encodeURIComponent('/onboarding')}`);
  }

  const actor = resolveOnboardingActor(access);
  const targetPersonId = actor === 'client' ? null : requestedPersonId;

  const status = await getOnboardingStatus({ userId: user.id, personId: targetPersonId }, supabase);
  const personId = status.personId ?? targetPersonId ?? null;

  const [personDetail, registrationDraft, servicePolicy, privacyPolicy, accountLink] = await Promise.all([
    personId ? loadPersonDetail(supabase, personId) : Promise.resolve(null),
    loadLatestRegistrationDraft(supabase, user.id, access.profile.id),
    getPolicyBySlug('client-service-agreement'),
    getPolicyBySlug('client-privacy-notice'),
    personId ? hasAccountLink(supabase, user.id, personId) : Promise.resolve(false),
  ]);

  const prefill = buildPrefill({ person: personDetail, draft: registrationDraft, fallbackName: access.profile.display_name });

  return (
    <div className="page-shell page-stack">
      <OnboardingWizard
        initialStatus={status}
        prefill={prefill}
        personId={personId}
        profileId={access.profile.id}
        actor={actor as OnboardingActor}
        nextPath={nextPath}
        hasAccountLink={accountLink}
        policies={{
          service: servicePolicy
            ? {
                slug: servicePolicy.slug,
                title: servicePolicy.title,
                shortSummary: servicePolicy.shortSummary,
                bodyHtml: servicePolicy.bodyHtml,
              }
            : null,
          privacy: privacyPolicy
            ? {
                slug: privacyPolicy.slug,
                title: privacyPolicy.title,
                shortSummary: privacyPolicy.shortSummary,
                bodyHtml: privacyPolicy.bodyHtml,
              }
            : null,
        }}
      />
    </div>
  );
}

function parsePersonId(raw: string | string[] | undefined): number | null {
  if (!raw) return null;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

async function loadPersonDetail(
  supabase: Awaited<ReturnType<typeof createSupabaseRSCClient>>,
  personId: number,
): Promise<PersonDetail | null> {
  const { data } = await supabase
    .schema('core')
    .from('people')
    .select('id, first_name, last_name, email, phone, preferred_pronouns, preferred_contact_method, data_sharing_consent')
    .eq('id', personId)
    .maybeSingle();

  return (data as PersonDetail | null) ?? null;
}

async function loadLatestRegistrationDraft(
  supabase: Awaited<ReturnType<typeof createSupabaseRSCClient>>,
  userId: string,
  profileId: string,
): Promise<RegistrationDraft | null> {
  const portal = supabase.schema('portal');
  const filters = [`supabase_user_id.eq.${userId}`, `profile_id.eq.${profileId}`];

  let query = portal
    .from('registration_flows')
    .select(
      'chosen_name, legal_name, pronouns, contact_email, contact_phone, contact_window, postal_code, date_of_birth_month, date_of_birth_year, contact_phone_safe_call, contact_phone_safe_text, contact_phone_safe_voicemail, consent_data_sharing',
    )
    .order('updated_at', { ascending: false })
    .limit(1)
    .or(filters.join(','));

  const { data, error } = await query.maybeSingle();
  if (error) {
    return null;
  }

  return (data as RegistrationDraft | null) ?? null;
}

async function hasAccountLink(
  supabase: Awaited<ReturnType<typeof createSupabaseRSCClient>>,
  userId: string,
  personId: number,
): Promise<boolean> {
  const { data, error } = await supabase
    .schema('core')
    .from('user_people')
    .select('id')
    .eq('user_id', userId)
    .eq('person_id', personId)
    .limit(1)
    .maybeSingle();

  if (error) return false;
  return Boolean(data);
}

function buildPrefill({
  person,
  draft,
  fallbackName,
}: {
  person: PersonDetail | null;
  draft: RegistrationDraft | null;
  fallbackName: string | null;
}): OnboardingPrefill {
  const chosenName = person?.first_name ?? draft?.chosen_name ?? fallbackName ?? 'Community member';
  const legalName = person?.last_name ?? draft?.legal_name ?? null;
  const pronouns = person?.preferred_pronouns ?? draft?.pronouns ?? null;
  const email = person?.email ?? draft?.contact_email ?? null;
  const phone = person?.phone ?? draft?.contact_phone ?? null;
  const contactWindow = draft?.contact_window ?? null;
  const postalCode = normalizePostalCode(draft?.postal_code ?? null);
  const dobMonth = draft?.date_of_birth_month ?? null;
  const dobYear = draft?.date_of_birth_year ?? null;

  return {
    chosenName,
    legalName,
    pronouns,
    email,
    phone,
    preferredContactMethod: person?.preferred_contact_method ?? (draft?.contact_email ? 'email' : 'phone'),
    contactWindow,
    postalCode,
    dobMonth,
    dobYear,
    safeCall: draft?.contact_phone_safe_call ?? false,
    safeText: draft?.contact_phone_safe_text ?? false,
    safeVoicemail: draft?.contact_phone_safe_voicemail ?? false,
    dataSharingConsent: person?.data_sharing_consent ?? (draft?.consent_data_sharing ?? null),
  };
}
