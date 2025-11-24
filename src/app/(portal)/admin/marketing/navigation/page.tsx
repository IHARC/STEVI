import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
import { MARKETING_SETTINGS_KEYS, NavItem, parseJsonSetting } from '@/lib/marketing/settings';
import { NavForm } from './NavForm';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';

export const dynamic = 'force-dynamic';

type SettingRow = { setting_key: string; setting_value: string | null };

export default async function MarketingNavigationPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/login?next=/admin/marketing/navigation');
  }

  if (!access.canManageWebsiteContent) {
    redirect(resolveDefaultWorkspacePath(access));
  }

  await ensurePortalProfile(supabase, access.userId);

  const portal = supabase.schema('portal');
  const { data } = await portal
    .from('public_settings')
    .select('setting_key, setting_value')
    .in('setting_key', [MARKETING_SETTINGS_KEYS.navItems, MARKETING_SETTINGS_KEYS.navPortalCtaLabel]);

  const settings = (data ?? []) as SettingRow[];
  const navItemsRaw =
    settings.find((row) => row.setting_key === MARKETING_SETTINGS_KEYS.navItems)?.setting_value ?? null;
  const portalCtaLabel =
    settings.find((row) => row.setting_key === MARKETING_SETTINGS_KEYS.navPortalCtaLabel)?.setting_value ?? '';

  const navItems = parseJsonSetting<NavItem[]>(navItemsRaw, MARKETING_SETTINGS_KEYS.navItems);

  return (
    <div className="page-shell page-stack">
      <header className="space-y-space-2xs">
        <p className="text-label-sm font-medium uppercase text-muted-foreground">Website</p>
        <h1 className="text-headline-lg text-on-surface">Navigation</h1>
        <p className="max-w-3xl text-body-md text-muted-foreground">
          Manage the top navigation and STEVI portal call-to-action shown on the public marketing site. Changes publish as
          soon as Supabase saves.
        </p>
      </header>

      <Card className="max-w-5xl">
        <CardHeader>
          <CardTitle className="text-title-lg">Navigation links</CardTitle>
          <CardDescription>Order is preserved. Keep labels concise and routes accurate.</CardDescription>
        </CardHeader>
        <CardContent>
          <NavForm initialItems={navItems} portalCtaLabel={portalCtaLabel} />
        </CardContent>
      </Card>
    </div>
  );
}
