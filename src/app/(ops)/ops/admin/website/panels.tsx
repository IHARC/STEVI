import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Button } from '@shared/ui/button';
import { BrandingForm } from '../marketing/branding/BrandingForm';
import { NavForm } from '../marketing/navigation/NavForm';
import { HomeForm } from '../marketing/home/HomeForm';
import { SupportsForm } from '../marketing/supports/SupportsForm';
import { ProgramsForm } from '../marketing/programs/ProgramsForm';
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
import { WebsiteFooterForm } from './website-footer-form';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { EmptyState } from '@shared/ui/empty-state';

type PanelProps = {
  supabase: SupabaseClient<Database>;
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
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-xl">Branding</CardTitle>
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
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-xl">Navigation</CardTitle>
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
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-xl">Home & context</CardTitle>
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
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-xl">Supports</CardTitle>
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
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-xl">Programs</CardTitle>
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
    <Card className="border-border/60">
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl">Footer</CardTitle>
        <CardDescription>Update the copy shown on every page of the marketing site.</CardDescription>
      </CardHeader>
      <CardContent>
        <WebsiteFooterForm primaryText={primaryText} secondaryText={secondaryText} lastUpdatedLabel={lastUpdated} />
      </CardContent>
    </Card>
  );
}

export async function WebsiteContentInventoryPanel(_: PanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Content inventory</CardTitle>
        <CardDescription>Audit public pages, resources, and policies with owners and review dates.</CardDescription>
      </CardHeader>
      <CardContent>
        <EmptyState
          title="No inventory checklist yet"
          description="Track ownership and review cadence for every public asset. Start with a simple list and add cache revalidation hooks."
          action={
            <Button asChild>
              <Link href="/ops/admin/content">View guidance</Link>
            </Button>
          }
        />
      </CardContent>
    </Card>
  );
}
