'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
import { logAuditEvent, buildEntityRef } from '@/lib/audit';
import { MARKETING_SETTINGS_KEYS, NavItem, assertNonEmpty } from '@/lib/marketing/settings';

const ADMIN_PATHS = ['/ops/admin', '/ops/admin/website'] as const;

function parseNavItems(raw: string | null): NavItem[] {
  if (!raw) {
    throw new Error('Navigation items are required.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Navigation items must be valid JSON.');
  }
  if (!Array.isArray(parsed)) {
    throw new Error('Navigation items must be an array.');
  }
  const items = parsed.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Nav item ${index + 1} is invalid.`);
    }
    const label = assertNonEmpty((item as NavItem).label, `Nav item ${index + 1} label`);
    const href = assertNonEmpty((item as NavItem).href, `Nav item ${index + 1} href`);
    return { label, href };
  });
  if (items.length === 0) {
    throw new Error('Add at least one navigation link.');
  }
  return items;
}

async function requireAdminContext() {
  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    throw new Error('Sign in to manage website navigation.');
  }

  if (!access.canManageWebsiteContent) {
    throw new Error('Portal admin access is required.');
  }

  const actorProfile = await ensurePortalProfile(supabase, access.userId);

  return { supabase, portal: supabase.schema('portal'), actorProfile };
}

export async function saveNavigationSettings(formData: FormData) {
  const itemsRaw = formData.get('items_json');
  const portalCtaLabel = assertNonEmpty(
    formData.get('portal_cta_label') as string | null,
    'Portal CTA label',
  );

  const items = parseNavItems(typeof itemsRaw === 'string' ? itemsRaw : null);

  const { supabase, portal, actorProfile } = await requireAdminContext();
  const now = new Date().toISOString();

  const { error: itemsError } = await portal.from('public_settings').upsert(
    {
      setting_key: MARKETING_SETTINGS_KEYS.navItems,
      setting_type: 'json',
      setting_value: JSON.stringify(items),
      is_public: true,
      updated_by_profile_id: actorProfile.id,
      updated_at: now,
    },
    { onConflict: 'setting_key' },
  );
  if (itemsError) throw itemsError;

  const { error: ctaError } = await portal.from('public_settings').upsert(
    {
      setting_key: MARKETING_SETTINGS_KEYS.navPortalCtaLabel,
      setting_type: 'string',
      setting_value: portalCtaLabel,
      is_public: true,
      updated_by_profile_id: actorProfile.id,
      updated_at: now,
    },
    { onConflict: 'setting_key' },
  );
  if (ctaError) throw ctaError;

  await logAuditEvent(supabase, {
    actorProfileId: actorProfile.id,
    action: 'marketing_nav_updated',
    entityType: 'marketing_navigation',
    entityRef: buildEntityRef({ schema: 'portal', table: 'public_settings', id: MARKETING_SETTINGS_KEYS.navItems }),
    meta: { items: items.length },
  });

  ADMIN_PATHS.forEach((path) => revalidatePath(path));
}
