import { getOnboardingStatusForUser } from '@/lib/onboarding/status';
import type { SupabaseAnyServerClient } from '@/lib/supabase/types';

export async function assertOnboardingComplete(
  supabase: SupabaseAnyServerClient,
  userId: string,
) {
  const status = await getOnboardingStatusForUser(userId, supabase);
  if (status.status !== 'COMPLETED') {
    throw new Error('Finish onboarding before continuing.');
  }
  return status;
}

export async function assertOnboardingReadyForConsent(
  supabase: SupabaseAnyServerClient,
  userId: string,
) {
  const status = await getOnboardingStatusForUser(userId, supabase);
  if (!status.hasPerson || !status.hasServiceAgreementConsent || !status.hasPrivacyAcknowledgement) {
    throw new Error('Finish onboarding before updating consents.');
  }
  return status;
}
