'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
import { logAuditEvent, buildEntityRef } from '@/lib/audit';
import {
  MARKETING_SETTINGS_KEYS,
  ContextCard,
  HeroContent,
  assertNonEmpty,
} from '@/lib/marketing/settings';
import { sanitizeFileName } from '@/lib/utils';

const ADMIN_PATHS = ['/app-admin/website/home'] as const;
const HERO_BUCKET = 'app-branding';

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
  const access = await loadPortalAccess(supabase);

  if (!access) {
    throw new Error('Sign in to manage website content.');
  }

  if (!access.canManageWebsiteContent) {
    throw new Error('Portal admin access is required.');
  }

  const actorProfile = await ensurePortalProfile(supabase, access.userId);

  return { supabase, portal: supabase.schema('portal'), actorProfile };
}

export async function saveHomeSettings(formData: FormData) {
  const hero: HeroContent = {
    pill: assertNonEmpty(formData.get('hero_pill') as string | null, 'Hero pill'),
    headline: assertNonEmpty(formData.get('hero_headline') as string | null, 'Hero headline'),
    body: assertNonEmpty(formData.get('hero_body') as string | null, 'Hero body'),
    supporting: assertNonEmpty(formData.get('hero_supporting') as string | null, 'Hero supporting text'),
    imageUrl: (formData.get('hero_image_url') as string | null)?.trim() || null,
    imageAlt: (formData.get('hero_image_alt') as string | null)?.trim() || null,
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

  if (hero.imageUrl && !hero.imageAlt) {
    throw new Error('Add alternative text for the hero image.');
  }

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
    entityRef: buildEntityRef({ schema: 'portal', table: 'public_settings', id: MARKETING_SETTINGS_KEYS.contextCards }),
    meta: { context_cards: contextCards.length },
  });

  ADMIN_PATHS.forEach((path) => revalidatePath(path));
}

export async function uploadHeroImage(formData: FormData) {
  const file = formData.get('file');
  if (!(file instanceof File)) {
    throw new Error('Select an image to upload.');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image must be under 5 MB.');
  }

  const { supabase, actorProfile } = await requireAdminContext();
  const sanitized = sanitizeFileName(file.name || 'hero');
  const objectPath = `hero/${Date.now()}-${sanitized}`;

  const { error: uploadError } = await supabase.storage
    .from(HERO_BUCKET)
    .upload(objectPath, file, {
      upsert: true,
      cacheControl: '3600',
      contentType: file.type || 'image/jpeg',
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: publicUrl } = supabase.storage.from(HERO_BUCKET).getPublicUrl(objectPath);

  await logAuditEvent(supabase, {
    actorProfileId: actorProfile.id,
    action: 'marketing_hero_image_uploaded',
    entityType: 'marketing_hero_image',
    entityRef: buildEntityRef({ schema: 'storage', table: HERO_BUCKET, id: objectPath }),
    meta: { bucket: HERO_BUCKET, path: objectPath, size: file.size },
  });

  return { url: publicUrl.publicUrl, path: objectPath };
}
