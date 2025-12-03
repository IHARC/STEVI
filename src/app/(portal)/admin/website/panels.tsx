import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { BrandingForm } from '../marketing/branding/BrandingForm';
import { NavForm } from '../marketing/navigation/NavForm';
import { HomeForm } from '../marketing/home/HomeForm';
import { SupportsForm } from '../marketing/supports/SupportsForm';
import { ProgramsForm } from '../marketing/programs/ProgramsForm';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess, type PortalAccess } from '@/lib/portal-access';
import {
  BrandingAssets,
  ContextCard,
  HeroContent,
  MARKETING_SETTINGS_KEYS,
  NavItem,
  ProgramEntry,
  SupportEntry,
  parseJsonSetting,
} from '@/lib/marketing/settings';
import { updateSiteFooterAction } from '../marketing/footer/actions';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

type PanelProps = {
  supabase: SupabaseClient<Database>;
  access: PortalAccess;
};

type SettingRow = { setting_key: string; setting_value: string | null };

async function fetchSettings(
  supabase: SupabaseClient<Database>,
  keys: string[],
): Promise<Record<string, string | null>> {
  const { data } = await supabase.schema('portal').from('public_settings').select('setting_key, setting_value').in('setting_key', keys);
  const rows = (data ?? []) as SettingRow[];
  return keys.reduce<Record<string, string | null>>((acc, key) => {
    acc[key] = rows.find((row) => row.setting_key === key)?.setting_value ?? null;
    return acc;
  }, {});
}

export async function WebsiteBrandingPanel({ supabase }: PanelProps) {
  const settings = await fetchSettings(supabase, [MARKETING_SETTINGS_KEYS.branding]);
  const branding = settings[MARKETING_SETTINGS_KEYS.branding]
    ? parseJsonSetting<BrandingAssets>(settings[MARKETING_SETTINGS_KEYS.branding], MARKETING_SETTINGS_KEYS.branding)
    : undefined;

  return (
    <Card className="max-w-5xl">
      <CardHeader>
        <CardTitle className="text-title-lg">Branding</CardTitle>
        <CardDescription>Manage logos and favicon used across the marketing site and portal metadata.</CardDescription>
      </CardHeader>
      <CardContent>
        <BrandingForm branding={branding} />
      </CardContent>
    </Card>
  );
}

export async function WebsiteNavigationPanel({ supabase }: PanelProps) {
  const settings = await fetchSettings(supabase, [MARKETING_SETTINGS_KEYS.navItems, MARKETING_SETTINGS_KEYS.navPortalCtaLabel]);
  const navItems = parseJsonSetting<NavItem[]>(settings[MARKETING_SETTINGS_KEYS.navItems], MARKETING_SETTINGS_KEYS.navItems);
  const portalCtaLabel = settings[MARKETING_SETTINGS_KEYS.navPortalCtaLabel] ?? '';

  return (
    <Card className="max-w-5xl">
      <CardHeader>
        <CardTitle className="text-title-lg">Navigation</CardTitle>
        <CardDescription>Control top navigation links and the portal call-to-action.</CardDescription>
      </CardHeader>
      <CardContent>
        <NavForm initialItems={navItems} portalCtaLabel={portalCtaLabel} />
      </CardContent>
    </Card>
  );
}

export async function WebsiteHomePanel({ supabase }: PanelProps) {
  const settings = await fetchSettings(supabase, [MARKETING_SETTINGS_KEYS.hero, MARKETING_SETTINGS_KEYS.contextCards]);
  const hero = parseJsonSetting<HeroContent>(settings[MARKETING_SETTINGS_KEYS.hero], MARKETING_SETTINGS_KEYS.hero);
  const contextCards = parseJsonSetting<ContextCard[]>(settings[MARKETING_SETTINGS_KEYS.contextCards], MARKETING_SETTINGS_KEYS.contextCards);

  return (
    <Card className="max-w-5xl">
      <CardHeader>
        <CardTitle className="text-title-lg">Home & context</CardTitle>
        <CardDescription>Update the hero and contextual story cards on the marketing home page.</CardDescription>
      </CardHeader>
      <CardContent>
        <HomeForm hero={hero} contextCards={contextCards} />
      </CardContent>
    </Card>
  );
}

export async function WebsiteSupportsPanel({ supabase }: PanelProps) {
  const settings = await fetchSettings(supabase, [MARKETING_SETTINGS_KEYS.supportsUrgent, MARKETING_SETTINGS_KEYS.supportsMutualAid]);
  const urgentSupports = parseJsonSetting<SupportEntry[]>(settings[MARKETING_SETTINGS_KEYS.supportsUrgent], MARKETING_SETTINGS_KEYS.supportsUrgent);
  const mutualAid = parseJsonSetting<string[]>(settings[MARKETING_SETTINGS_KEYS.supportsMutualAid], MARKETING_SETTINGS_KEYS.supportsMutualAid);

  return (
    <Card className="max-w-5xl">
      <CardHeader>
        <CardTitle className="text-title-lg">Supports</CardTitle>
        <CardDescription>Urgent supports and mutual aid text shown on Get Help.</CardDescription>
      </CardHeader>
      <CardContent>
        <SupportsForm urgent={urgentSupports} mutualAid={mutualAid} />
      </CardContent>
    </Card>
  );
}

export async function WebsiteProgramsPanel({ supabase }: PanelProps) {
  const settings = await fetchSettings(supabase, [MARKETING_SETTINGS_KEYS.programs]);
  const programs = parseJsonSetting<ProgramEntry[]>(settings[MARKETING_SETTINGS_KEYS.programs], MARKETING_SETTINGS_KEYS.programs);

  return (
    <Card className="max-w-5xl">
      <CardHeader>
        <CardTitle className="text-title-lg">Programs</CardTitle>
        <CardDescription>Control program cards shown on the marketing site.</CardDescription>
      </CardHeader>
      <CardContent>
        <ProgramsForm programs={programs} />
      </CardContent>
    </Card>
  );
}

export async function WebsiteFooterPanel({ supabase }: PanelProps) {
  const settings = await fetchSettings(supabase, [MARKETING_SETTINGS_KEYS.footerPrimary, MARKETING_SETTINGS_KEYS.footerSecondary]);

  const primaryText = settings[MARKETING_SETTINGS_KEYS.footerPrimary]?.trim() ?? '';
  const secondaryText = settings[MARKETING_SETTINGS_KEYS.footerSecondary]?.trim() ?? '';

  const { data: footer } = await supabase
    .schema('portal')
    .from('public_settings')
    .select('updated_at')
    .in('setting_key', [MARKETING_SETTINGS_KEYS.footerPrimary, MARKETING_SETTINGS_KEYS.footerSecondary])
    .order('updated_at', { ascending: false })
    .limit(1);

  const lastUpdated = footer?.[0]?.updated_at
    ? new Date(footer[0].updated_at as string).toLocaleString('en-CA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      })
    : null;

  return (
    <Card className="max-w-4xl">
      <CardHeader className="space-y-space-xs">
        <CardTitle className="text-title-lg">Footer</CardTitle>
        <CardDescription>Update the copy shown on every page of the marketing site.</CardDescription>
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
              defaultValue={secondaryText}
              maxLength={300}
              spellCheck={false}
            />
            <p className="text-body-xs text-muted-foreground">Optional supporting statement beneath the primary line. Leave blank to hide it.</p>
          </div>

          <div className="flex flex-wrap items-center gap-space-sm">
            <Button type="submit">Save footer</Button>
            <p className="text-body-sm text-muted-foreground">Updates sync to the marketing site automatically after Supabase saves.</p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export async function WebsiteContentInventoryPanel(_: PanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-title-lg">Content inventory</CardTitle>
        <CardDescription>Audit public pages, resources, and policies with owners and review dates.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-space-2xs py-space-md text-body-md text-muted-foreground">
        <p>Map each asset to a responsible owner and next review date. Add cache revalidation hooks for the marketing app.</p>
        <p>Keep this list in sync with audit logs and Supabase RLS.</p>
      </CardContent>
    </Card>
  );
}

export async function buildWebsiteContext() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/login?next=/admin/website');
  }

  if (!access.canManageWebsiteContent) {
    redirect(resolveLandingPath(access));
  }

  await ensurePortalProfile(supabase, access.userId);

  return { supabase, access } as const;
}
