import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
import {
  MARKETING_SETTINGS_KEYS,
  SupportEntry,
  parseJsonSetting,
} from '@/lib/marketing/settings';
import { SupportsForm } from './SupportsForm';
import { resolveLandingPath } from '@/lib/portal-navigation';

export const dynamic = 'force-dynamic';

type SettingRow = { setting_key: string; setting_value: string | null };

export default async function MarketingSupportsPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/login?next=/admin/marketing/supports');
  }

  if (!access.canManageWebsiteContent) {
    redirect(resolveLandingPath(access));
  }

  await ensurePortalProfile(supabase, access.userId);

  const portal = supabase.schema('portal');
  const { data } = await portal
    .from('public_settings')
    .select('setting_key, setting_value')
    .in('setting_key', [MARKETING_SETTINGS_KEYS.supportsUrgent, MARKETING_SETTINGS_KEYS.supportsMutualAid]);

  const settings = (data ?? []) as SettingRow[];
  const urgentRaw =
    settings.find((row) => row.setting_key === MARKETING_SETTINGS_KEYS.supportsUrgent)?.setting_value ?? null;
  const mutualRaw =
    settings.find((row) => row.setting_key === MARKETING_SETTINGS_KEYS.supportsMutualAid)?.setting_value ?? null;

  const urgentSupports = parseJsonSetting<SupportEntry[]>(urgentRaw, MARKETING_SETTINGS_KEYS.supportsUrgent);
  const mutualAid = parseJsonSetting<string[]>(mutualRaw, MARKETING_SETTINGS_KEYS.supportsMutualAid);

  return (
    <div className="page-shell page-stack">
      <header className="space-y-space-2xs">
        <p className="text-label-sm font-medium uppercase text-muted-foreground">Website</p>
        <h1 className="text-headline-lg text-on-surface">Supports</h1>
        <p className="max-w-3xl text-body-md text-muted-foreground">
          Control the urgent supports and community mutual aid notes displayed on the marketing site. Keep crisis numbers
          current and align messaging with outreach.
        </p>
      </header>

      <Card className="max-w-5xl">
        <CardHeader>
          <CardTitle className="text-title-lg">Urgent supports</CardTitle>
          <CardDescription>Each entry renders as a card on “Get Help” and the home page.</CardDescription>
        </CardHeader>
        <CardContent>
          <SupportsForm urgent={urgentSupports} mutualAid={mutualAid} />
        </CardContent>
      </Card>
    </div>
  );
}
