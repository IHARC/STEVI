import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
import { MARKETING_SETTINGS_KEYS, ProgramEntry, parseJsonSetting } from '@/lib/marketing/settings';
import { ProgramsForm } from './ProgramsForm';

export const dynamic = 'force-dynamic';

type SettingRow = { setting_key: string; setting_value: string | null };

export default async function MarketingProgramsPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/login?next=/admin/marketing/programs');
  }

  if (!access.canManageWebsiteContent) {
    redirect('/home');
  }

  await ensurePortalProfile(supabase, access.userId);

  const portal = supabase.schema('portal');
  const { data } = await portal
    .from('public_settings')
    .select('setting_key, setting_value')
    .in('setting_key', [MARKETING_SETTINGS_KEYS.programs]);

  const settings = (data ?? []) as SettingRow[];
  const programsRaw =
    settings.find((row) => row.setting_key === MARKETING_SETTINGS_KEYS.programs)?.setting_value ?? null;

  const programs = parseJsonSetting<ProgramEntry[]>(programsRaw, MARKETING_SETTINGS_KEYS.programs);

  return (
    <div className="page-shell page-stack">
      <header className="space-y-space-2xs">
        <p className="text-label-sm font-medium uppercase text-muted-foreground">Website</p>
        <h1 className="text-headline-lg text-on-surface">Programs</h1>
        <p className="max-w-3xl text-body-md text-muted-foreground">
          Manage the program descriptions displayed on the marketing site. Keep language clear and strengths-based.
        </p>
      </header>

      <Card className="max-w-5xl">
        <CardHeader>
          <CardTitle className="text-title-lg">Program cards</CardTitle>
          <CardDescription>Order is preserved. Each card renders on the Programs page.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProgramsForm programs={programs} />
        </CardContent>
      </Card>
    </div>
  );
}
