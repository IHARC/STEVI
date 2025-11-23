'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensurePortalProfile } from '@/lib/profile';
import { getPortalRoles } from '@/lib/ihar-auth';
import { logAuditEvent } from '@/lib/audit';
import {
  MARKETING_SETTINGS_KEYS,
  ContextCard,
  HeroContent,
  assertNonEmpty,
} from '@/lib/marketing/settings';

const ADMIN_PATHS = ['/admin', '/admin/marketing/home'] as const;

function parseContextCards(raw: string | null): ContextCard[] {
  if (!raw) {
    throw new Error('Context cards are required.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Context cards must be valid JSON.');
  }
  if (!Array.isArray(parsed)) {
    throw new Error('Context cards must be an array.');
  }
  const cards = parsed.map((card, index) => {
    if (!card || typeof card !== 'object') {
      throw new Error(`Context card ${index + 1} is invalid.`);
    }
    return {
      id: assertNonEmpty((card as ContextCard).id, `Context card ${index + 1} id`),
      title: assertNonEmpty((card as ContextCard).title, `Context card ${index + 1} title`),
      description: assertNonEmpty(
        (card as ContextCard).description,
        `Context card ${index + 1} description`,
      ),
      href: assertNonEmpty((card as ContextCard).href, `Context card ${index + 1} href`),
    };
  });
  if (cards.length === 0) {
    throw new Error('Add at least one context card.');
  }
  return cards;
}

async function requireAdminContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Sign in to manage website content.');
  }

  const portalRoles = getPortalRoles(user);
  if (!portalRoles.includes('portal_admin')) {
    throw new Error('Portal admin access is required.');
  }

  const actorProfile = await ensurePortalProfile(supabase, user.id);
  if (!actorProfile) {
    throw new Error('Portal profile is required.');
  }

  return { supabase, portal: supabase.schema('portal'), actorProfile };
}

export async function saveHomeSettings(formData: FormData) {
  const hero: HeroContent = {
    pill: assertNonEmpty(formData.get('hero_pill') as string | null, 'Hero pill'),
    headline: assertNonEmpty(formData.get('hero_headline') as string | null, 'Hero headline'),
    body: assertNonEmpty(formData.get('hero_body') as string | null, 'Hero body'),
    supporting: assertNonEmpty(formData.get('hero_supporting') as string | null, 'Hero supporting text'),
    primaryCta: {
      label: assertNonEmpty(formData.get('hero_primary_label') as string | null, 'Primary CTA label'),
      href: assertNonEmpty(formData.get('hero_primary_href') as string | null, 'Primary CTA href'),
      analytics: null,
    },
    secondaryLink: (() => {
      const label = (formData.get('hero_secondary_label') as string | null)?.trim() ?? '';
      const href = (formData.get('hero_secondary_href') as string | null)?.trim() ?? '';
      if (!label && !href) return null;
      return {
        label: assertNonEmpty(label, 'Secondary link label'),
        href: assertNonEmpty(href, 'Secondary link href'),
        analytics: null,
      };
    })(),
  };

  const contextCards = parseContextCards(
    typeof formData.get('context_cards_json') === 'string'
      ? (formData.get('context_cards_json') as string)
      : null,
  );

  const { supabase, portal, actorProfile } = await requireAdminContext();
  const now = new Date().toISOString();

  const { error: heroError } = await portal.from('public_settings').upsert(
    {
      setting_key: MARKETING_SETTINGS_KEYS.hero,
      setting_type: 'json',
      setting_value: JSON.stringify(hero),
      is_public: true,
      updated_by_profile_id: actorProfile.id,
      updated_at: now,
    },
    { onConflict: 'setting_key' },
  );
  if (heroError) throw heroError;

  const { error: contextError } = await portal.from('public_settings').upsert(
    {
      setting_key: MARKETING_SETTINGS_KEYS.contextCards,
      setting_type: 'json',
      setting_value: JSON.stringify(contextCards),
      is_public: true,
      updated_by_profile_id: actorProfile.id,
      updated_at: now,
    },
    { onConflict: 'setting_key' },
  );
  if (contextError) throw contextError;

  await logAuditEvent(supabase, {
    actorProfileId: actorProfile.id,
    action: 'marketing_home_updated',
    entityType: 'marketing_home',
    entityId: null,
    meta: { context_cards: contextCards.length },
  });

  ADMIN_PATHS.forEach((path) => revalidatePath(path));
}
