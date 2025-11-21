'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/audit';
import { ensurePortalProfile } from '@/lib/profile';
import { getPortalRoles } from '@/lib/ihar-auth';

const ADMIN_PATHS = ['/admin', '/admin/marketing/footer'] as const;
const PRIMARY_KEY = 'marketing.footer.primary_text';
const SECONDARY_KEY = 'marketing.footer.secondary_text';

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
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw userError ?? new Error('Sign in to continue.');
  }

  const portalRoles = getPortalRoles(user);
  if (!portalRoles.includes('portal_admin')) {
    throw new Error('Admin access is required to update the footer.');
  }

  const actorProfile = await ensurePortalProfile(supabase, user.id);
  if (!actorProfile) {
    throw new Error('Admin access is required to update the footer.');
  }

  return { supabase, core: supabase.schema('core'), actorProfile };
}

export async function updateSiteFooterAction(formData: FormData): Promise<void> {
  try {
    const primaryText = requireText(formData, 'primary_text', 'Add the primary footer text.');
    const secondaryText = readText(formData, 'secondary_text');

    const { supabase, core, actorProfile } = await requireAdminContext();

    const now = new Date().toISOString();

    const { error: primaryError } = await core
      .from('system_settings')
      .upsert(
        {
          setting_key: PRIMARY_KEY,
          setting_type: 'string',
          setting_value: primaryText,
          updated_by: actorProfile.id,
          updated_at: now,
        },
        { onConflict: 'setting_key' },
      );
    if (primaryError) throw primaryError;

    const { error: secondaryError } = await core
      .from('system_settings')
      .upsert(
        {
          setting_key: SECONDARY_KEY,
          setting_type: 'string',
          setting_value: secondaryText,
          updated_by: actorProfile.id,
          updated_at: now,
        },
        { onConflict: 'setting_key' },
      );
    if (secondaryError) throw secondaryError;

    await logAuditEvent(supabase, {
      actorProfileId: actorProfile.id,
      action: 'marketing_footer_updated',
      entityType: 'site_footer',
      entityId: null,
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
