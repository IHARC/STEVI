import type { SupabaseAnyServerClient } from '@/lib/supabase/types';

export const CONSENT_EXPIRY_SETTING_KEY = 'consent.expiry_days';

export async function getConsentExpiryDays(supabase: SupabaseAnyServerClient): Promise<number> {
  const portal = supabase.schema('portal');
  const { data, error } = await portal
    .from('public_settings')
    .select('setting_value')
    .eq('setting_key', CONSENT_EXPIRY_SETTING_KEY)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const raw = data?.setting_value ?? null;
  if (!raw) {
    throw new Error(`Missing required setting ${CONSENT_EXPIRY_SETTING_KEY}.`);
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid consent expiry setting (${CONSENT_EXPIRY_SETTING_KEY}).`);
  }

  return parsed;
}
