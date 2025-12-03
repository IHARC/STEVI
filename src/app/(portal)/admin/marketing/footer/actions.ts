'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logAuditEvent, buildEntityRef } from '@/lib/audit';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
import { MARKETING_SETTINGS_KEYS } from '@/lib/marketing/settings';

const ADMIN_PATHS = ['/admin', '/admin/website'] as const;

function readText(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function requireText(formData: FormData, key: string, message: string): string {
  const value = readText(formData, key);
  if (!value) {
    throw new Error(message);
  }
  return value;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unable to update footer. Try again shortly.';
}

async function requireAdminContext() {
  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    throw new Error('Sign in to continue.');
  }

  if (!access.canManageWebsiteContent) {
    throw new Error('Admin access is required to update the footer.');
  }

  const actorProfile = await ensurePortalProfile(supabase, access.userId);

  return { supabase, portal: supabase.schema('portal'), actorProfile };
}

export async function updateSiteFooterAction(formData: FormData): Promise<void> {
  try {
    const primaryText = requireText(formData, 'primary_text', 'Add the primary footer text.');
    const secondaryText = readText(formData, 'secondary_text');

    const { supabase, portal, actorProfile } = await requireAdminContext();

    const now = new Date().toISOString();

    const { error: primaryError } = await portal
      .from('public_settings')
      .upsert(
        {
          setting_key: MARKETING_SETTINGS_KEYS.footerPrimary,
          setting_value: primaryText,
          setting_type: 'string',
          is_public: true,
          updated_by_profile_id: actorProfile.id,
          updated_at: now,
        },
        { onConflict: 'setting_key' },
      );
    if (primaryError) throw primaryError;

    const { error: secondaryError } = await portal
      .from('public_settings')
      .upsert(
        {
          setting_key: MARKETING_SETTINGS_KEYS.footerSecondary,
          setting_type: 'string',
          setting_value: secondaryText,
          is_public: true,
          updated_by_profile_id: actorProfile.id,
          updated_at: now,
        },
        { onConflict: 'setting_key' },
      );
    if (secondaryError) throw secondaryError;

    await logAuditEvent(supabase, {
      actorProfileId: actorProfile.id,
      action: 'marketing_footer_updated',
      entityType: 'site_footer',
      entityRef: buildEntityRef({ schema: 'portal', table: 'public_settings', id: MARKETING_SETTINGS_KEYS.footerPrimary }),
      meta: {
        has_secondary: Boolean(secondaryText),
      },
    });

    await Promise.all(ADMIN_PATHS.map((path) => revalidatePath(path)));

    return;
  } catch (error) {
    console.error('updateSiteFooterAction error', error);
    throw new Error(getErrorMessage(error));
  }
}
