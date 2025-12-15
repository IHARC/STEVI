import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ProfileDetailsForm, type ProfileDetailsFormState } from '@shared/profile/profile-details-form';
import { ProfileContactCard, type EmailFormState, type PhoneFormState } from '@shared/profile/profile-contact-card';
import { ProfilePasswordForm, type PasswordFormState } from '@shared/profile/profile-password-form';
import type { Database } from '@/types/supabase';
import { affiliationOptionsFromValues, loadProfilePageData, resolveInitialProfileValues } from '@/lib/profile-page';
import { makeProfileActions } from '@/lib/profile-actions';

export const dynamic = 'force-dynamic';

type AffiliationType = Database['portal']['Enums']['affiliation_type'];

const INITIAL_PROFILE_STATE: ProfileDetailsFormState = { status: 'idle' };
const INITIAL_EMAIL_STATE: EmailFormState = { status: 'idle' };
const INITIAL_PHONE_STATE: PhoneFormState = { status: 'idle' };
const INITIAL_PASSWORD_STATE: PasswordFormState = { status: 'idle' };

export default async function OpsProfilePage() {
  const supabase = await createSupabaseRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/ops/profile');
  }

  const {
    profile,
    organizations,
    allowedAffiliations,
    livedExperienceValues,
    livedExperienceOptions,
  } = await loadProfilePageData(supabase, user.id);

  const { currentAffiliation, initialValues } = resolveInitialProfileValues(
    profile,
    organizations,
    allowedAffiliations,
    livedExperienceValues,
  );

  const initialEmail = user.email ?? null;
  const initialPhone = user.phone ?? null;

  const { updateProfileDetails, updateEmail, updatePhone, updatePassword } = makeProfileActions({
    profile,
    currentAffiliation,
    allowedAffiliations,
    livedExperienceValues,
    revalidateTarget: '/ops/profile',
  });

  const awaitingVerification = profile.affiliation_status === 'pending';
  const affiliationRevoked = profile.affiliation_status === 'revoked';
  const hasEmail = Boolean(initialEmail);
  const hasPhone = Boolean(initialPhone);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl text-foreground">Operations account settings</h1>
        <p className="text-sm text-foreground/70">
          Update your profile, contact preferences, and password while staying inside the operations shell.
        </p>
      </header>

      {awaitingVerification ? (
        <div className="rounded-2xl border border-primary bg-primary/10 p-4 text-sm text-primary">
          We are confirming your IHARC team role. You can keep collaborating while we verify.
        </div>
      ) : null}

      {affiliationRevoked ? (
        <div className="rounded-2xl border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          Your verified affiliation was revoked. Reach out to IHARC administrators if circumstances have changed.
        </div>
      ) : null}

      <ProfileDetailsForm
        organizations={organizations}
        action={updateProfileDetails}
        initialState={INITIAL_PROFILE_STATE}
        initialValues={initialValues}
        affiliationOptions={affiliationOptionsFromValues(allowedAffiliations).map((option) => ({
          value: option.value as AffiliationType,
          label: option.label,
        }))}
        livedExperienceOptions={livedExperienceOptions as Array<{
          value: Database['portal']['Enums']['lived_experience_status'];
          label: string;
          description: string;
        }>}
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
