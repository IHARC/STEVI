import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
import {
  ContextCard,
  HeroContent,
  MARKETING_SETTINGS_KEYS,
  BrandingAssets,
  parseJsonSetting,
} from '@/lib/marketing/settings';
import { HomeForm } from './HomeForm';

export const dynamic = 'force-dynamic';

type SettingRow = { setting_key: string; setting_value: string | null };

export default async function MarketingHomePage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/login?next=/admin/marketing/home');
  }

  if (!access.canManageWebsiteContent) {
    redirect('/home');
  }

  await ensurePortalProfile(supabase, access.userId);

  const portal = supabase.schema('portal');
  const { data } = await portal
    .from('public_settings')
    .select('setting_key, setting_value')
    .in('setting_key', [MARKETING_SETTINGS_KEYS.hero, MARKETING_SETTINGS_KEYS.contextCards]);

  const settings = (data ?? []) as SettingRow[];
  const heroRaw =
    settings.find((row) => row.setting_key === MARKETING_SETTINGS_KEYS.hero)?.setting_value ?? null;
  const contextRaw =
    settings.find((row) => row.setting_key === MARKETING_SETTINGS_KEYS.contextCards)?.setting_value ?? null;
  const brandingRaw =
    settings.find((row) => row.setting_key === MARKETING_SETTINGS_KEYS.branding)?.setting_value ?? null;

  const hero = parseJsonSetting<HeroContent>(heroRaw, MARKETING_SETTINGS_KEYS.hero);
  const contextCards = parseJsonSetting<ContextCard[]>(contextRaw, MARKETING_SETTINGS_KEYS.contextCards);
  const branding = brandingRaw ? parseJsonSetting<BrandingAssets>(brandingRaw, MARKETING_SETTINGS_KEYS.branding) : undefined;

  return (
    <div className="page-shell page-stack">
      <header className="space-y-space-2xs">
        <p className="text-label-sm font-medium uppercase text-muted-foreground">Website</p>
        <h1 className="text-headline-lg text-on-surface">Home & context</h1>
        <p className="max-w-3xl text-body-md text-muted-foreground">
          Update the hero and “How we got here” context cards on the marketing home page. All fields are required to
          keep the public experience consistent.
        </p>
      </header>

      <Card className="max-w-5xl">
        <CardHeader>
          <CardTitle className="text-title-lg">Hero</CardTitle>
          <CardDescription>CTA links must stay accurate; use concise, strengths-based language.</CardDescription>
        </CardHeader>
        <CardContent>
          <HomeForm hero={hero} contextCards={contextCards} branding={branding} />
        </CardContent>
      </Card>
    </div>
  );
}
