import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
import { MARKETING_SETTINGS_KEYS } from '@/lib/marketing/settings';
import { updateSiteFooterAction } from './actions';
import { resolveLandingPath } from '@/lib/portal-navigation';

export const dynamic = 'force-dynamic';

export default async function MarketingFooterAdminPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/login?next=/admin/marketing/footer');
  }

  if (!access.canManageWebsiteContent) {
    redirect(resolveLandingPath(access));
  }

  await ensurePortalProfile(supabase, access.userId);

  const portal = supabase.schema('portal');
  const { data: footer } = await portal
    .from('public_settings')
    .select('setting_key, setting_value, updated_at')
    .eq('is_public', true)
    .in('setting_key', [MARKETING_SETTINGS_KEYS.footerPrimary, MARKETING_SETTINGS_KEYS.footerSecondary])
    .order('updated_at', { ascending: false })
    .limit(2);

  type FooterRow = { setting_key: string; setting_value: string | null; updated_at: string | null };
  const settings = (footer ?? []) as FooterRow[];
  const primaryText =
    settings.find((row: FooterRow) => row.setting_key === MARKETING_SETTINGS_KEYS.footerPrimary)?.setting_value?.trim() ??
    '';
  const secondaryText =
    settings.find((row: FooterRow) => row.setting_key === MARKETING_SETTINGS_KEYS.footerSecondary)?.setting_value?.trim() ??
    '';
  const lastUpdated = settings?.[0]?.updated_at
    ? new Date(settings[0].updated_at as string).toLocaleString('en-CA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      })
    : null;

  return (
    <div className="page-shell page-stack">
      <header className="space-y-space-2xs">
        <p className="text-label-sm font-medium uppercase text-muted-foreground">Marketing settings</p>
        <h1 className="text-headline-lg text-on-surface">Public site footer</h1>
        <p className="max-w-3xl text-body-md text-muted-foreground">
          Update the footer copy that appears on every page of the IHARC marketing site. Changes publish within about a
          minute to keep the public experience current.
        </p>
      </header>

      <Card className="max-w-4xl">
        <CardHeader className="space-y-space-xs">
          <CardTitle className="text-title-lg">Footer copy</CardTitle>
          <CardDescription>
            Keep the tone strengths-based and community-first. Highlight IHARC’s full name and mission for public visitors.
          </CardDescription>
          {lastUpdated ? (
            <p className="text-body-xs text-muted-foreground">Last updated {lastUpdated}</p>
          ) : null}
        </CardHeader>
        <CardContent>
          <form action={updateSiteFooterAction} className="space-y-space-md">
            <div className="space-y-space-2xs">
              <Label htmlFor="primary_text">Primary line</Label>
              <Input
                id="primary_text"
                name="primary_text"
                defaultValue={primaryText}
                maxLength={220}
                required
                className="font-medium"
              />
              <p className="text-body-xs text-muted-foreground">Rendered after the © year on the marketing site.</p>
            </div>

            <div className="space-y-space-2xs">
              <Label htmlFor="secondary_text">Secondary line</Label>
              <Textarea
                id="secondary_text"
                name="secondary_text"
                defaultValue={secondaryText ?? ''}
                maxLength={300}
                spellCheck={false}
              />
              <p className="text-body-xs text-muted-foreground">
                Optional supporting statement beneath the primary line. Leave blank to hide it.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-space-sm">
              <Button type="submit">Save footer</Button>
              <p className="text-body-sm text-muted-foreground">
                Updates sync to the public marketing site automatically after Supabase saves.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
