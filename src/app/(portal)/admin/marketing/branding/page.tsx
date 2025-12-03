import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
import {
  BrandingAssets,
  MARKETING_SETTINGS_KEYS,
  parseJsonSetting,
} from '@/lib/marketing/settings';
import { BrandingForm } from './BrandingForm';
import { resolveLandingPath } from '@/lib/portal-navigation';

export const dynamic = 'force-dynamic';

export default async function MarketingBrandingPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/login?next=/admin/marketing/branding');
  }

  if (!access.canManageWebsiteContent) {
    redirect(resolveLandingPath(access));
  }

  await ensurePortalProfile(supabase, access.userId);

  const portal = supabase.schema('portal');
  const { data } = await portal
    .from('public_settings')
    .select('setting_value')
    .eq('setting_key', MARKETING_SETTINGS_KEYS.branding)
    .maybeSingle();

  const branding = data?.setting_value
    ? parseJsonSetting<BrandingAssets>(data.setting_value, MARKETING_SETTINGS_KEYS.branding)
    : undefined;

  return (
    <div className="page-shell page-stack">
      <header className="space-y-space-2xs">
        <p className="text-label-sm font-medium uppercase text-muted-foreground">Website</p>
        <h1 className="text-headline-lg text-on-surface">Branding</h1>
        <p className="max-w-3xl text-body-md text-muted-foreground">
          Manage the public logos and favicon used across the marketing site and STEVI portal metadata. Upload final,
          production-ready assets to keep visitors and clients seeing the right brand.
        </p>
      </header>

      <Card className="max-w-5xl">
        <CardHeader>
          <CardTitle className="text-title-lg">Logos & favicon</CardTitle>
          <CardDescription>All three assets are required for the site header, metadata, and app icon.</CardDescription>
        </CardHeader>
        <CardContent>
          <BrandingForm branding={branding} />
        </CardContent>
      </Card>
    </div>
  );
}
