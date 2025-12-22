'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
import { logAuditEvent, buildEntityRef } from '@/lib/audit';
import {
  MARKETING_SETTINGS_KEYS,
  BrandingAssets,
  assertNonEmpty,
} from '@/lib/marketing/settings';
import { sanitizeFileName } from '@/lib/utils';

const ADMIN_PATHS = ['/app-admin/website/branding'] as const;
const BRANDING_BUCKET = 'app-branding';

type BrandingKind = 'logo_light' | 'logo_dark' | 'favicon';

const BRANDING_PREFIX_MAP: Record<BrandingKind, string> = {
  logo_light: 'logo-light/',
  logo_dark: 'logo-dark/',
  favicon: 'favicon/',
};

async function requireAdminContext() {
  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    throw new Error('Sign in to manage branding assets.');
  }

  if (!access.canManageWebsiteContent) {
    throw new Error('Portal admin access is required.');
  }

  const actorProfile = await ensurePortalProfile(supabase, access.userId);

  return { supabase, portal: supabase.schema('portal'), actorProfile };
}

export async function saveBrandingSettings(formData: FormData) {
  const branding: BrandingAssets = {
    logoLightUrl: assertNonEmpty(
      formData.get('branding_logo_light_url') as string | null,
      'Light logo URL',
    ),
    logoDarkUrl: assertNonEmpty(
      formData.get('branding_logo_dark_url') as string | null,
      'Dark logo URL',
    ),
    faviconUrl: assertNonEmpty(
      formData.get('branding_favicon_url') as string | null,
      'Favicon URL',
    ),
  };

  const { supabase, portal, actorProfile } = await requireAdminContext();
  const now = new Date().toISOString();

  const { error: brandingError } = await portal.from('public_settings').upsert(
    {
      setting_key: MARKETING_SETTINGS_KEYS.branding,
      setting_type: 'json',
      setting_value: JSON.stringify(branding),
      is_public: true,
      updated_by_profile_id: actorProfile.id,
      updated_at: now,
    },
    { onConflict: 'setting_key' },
  );
  if (brandingError) throw brandingError;

  await logAuditEvent(supabase, {
    actorProfileId: actorProfile.id,
    action: 'marketing_branding_updated',
    entityType: 'marketing_branding',
    entityRef: buildEntityRef({ schema: 'portal', table: 'public_settings', id: MARKETING_SETTINGS_KEYS.branding }),
    meta: {
      has_light: Boolean(branding.logoLightUrl),
      has_dark: Boolean(branding.logoDarkUrl),
      has_favicon: Boolean(branding.faviconUrl),
    },
  });

  ADMIN_PATHS.forEach((path) => revalidatePath(path));
}

export async function uploadBrandingAsset(formData: FormData) {
  const file = formData.get('file');
  const kind = formData.get('kind');

  if (!(file instanceof File)) {
    throw new Error('Select a file to upload.');
  }
  if (typeof kind !== 'string' || !(kind in BRANDING_PREFIX_MAP)) {
    throw new Error('Unsupported branding asset type.');
  }

  if (file.size > 2 * 1024 * 1024) {
    throw new Error('Brand assets must be under 2 MB.');
  }

  const { supabase, actorProfile } = await requireAdminContext();
  const prefix = BRANDING_PREFIX_MAP[kind as BrandingKind];
  const sanitized = sanitizeFileName(file.name || kind);
  const objectPath = `${prefix}${Date.now()}-${sanitized}`;

  const { error: uploadError } = await supabase.storage
    .from(BRANDING_BUCKET)
    .upload(objectPath, file, {
      upsert: true,
      cacheControl: '3600',
      contentType: file.type || 'image/png',
    });
  if (uploadError) throw uploadError;

  const { data: publicUrl } = supabase.storage.from(BRANDING_BUCKET).getPublicUrl(objectPath);

  await logAuditEvent(supabase, {
    actorProfileId: actorProfile.id,
    action: 'marketing_branding_uploaded',
    entityType: 'marketing_branding_asset',
    entityRef: buildEntityRef({ schema: 'storage', table: BRANDING_BUCKET, id: objectPath }),
    meta: { bucket: BRANDING_BUCKET, path: objectPath, kind, size: file.size },
  });

  return { url: publicUrl.publicUrl, path: objectPath, kind };
}
