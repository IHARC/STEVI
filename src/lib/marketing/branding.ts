import { cache } from 'react';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import {
  BrandingAssets,
  MARKETING_SETTINGS_KEYS,
  parseJsonSetting,
} from '@/lib/marketing/settings';

export type ResolvedBrandingAssets = {
  logoLightUrl: string;
  logoDarkUrl: string;
  faviconUrl: string;
};

function assertBrandingComplete(branding: BrandingAssets): ResolvedBrandingAssets {
  const { logoLightUrl, logoDarkUrl, faviconUrl } = branding;

  if (!logoLightUrl || !logoDarkUrl || !faviconUrl) {
    throw new Error(
      'Branding assets are incomplete. Upload light, dark, and favicon variants in Marketing settings.',
    );
  }

  return { logoLightUrl, logoDarkUrl, faviconUrl };
}

export const getBrandingAssets = cache(async (): Promise<ResolvedBrandingAssets> => {
  const supabase = await createSupabaseRSCClient();
  const portal = supabase.schema('portal');

  const { data, error } = await portal
    .from('public_settings')
    .select('setting_value')
    .eq('setting_key', MARKETING_SETTINGS_KEYS.branding)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const branding = parseJsonSetting<BrandingAssets>(
    data?.setting_value ?? null,
    MARKETING_SETTINGS_KEYS.branding,
  );

  return assertBrandingComplete(branding);
});
