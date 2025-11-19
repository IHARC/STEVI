'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/audit';

const ADMIN_PATHS = ['/admin', '/admin/marketing/footer'] as const;
const DEFAULT_SLOT = 'public_marketing';

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

export async function updateSiteFooterAction(formData: FormData): Promise<void> {
  try {
    const actorProfileId = requireText(formData, 'actor_profile_id', 'Admin context is required.');
    const slot = readText(formData, 'slot') ?? DEFAULT_SLOT;
    const primaryText = requireText(formData, 'primary_text', 'Add the primary footer text.');
    const secondaryText = readText(formData, 'secondary_text');

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw userError ?? new Error('Sign in to continue.');
    }

    const portal = supabase.schema('portal');
    const { data: actorProfile, error: actorProfileError } = await portal
      .from('profiles')
      .select('id, role, user_id')
      .eq('id', actorProfileId)
      .maybeSingle();

    if (actorProfileError || !actorProfile) {
      throw actorProfileError ?? new Error('Admin profile not found.');
    }

    if (actorProfile.user_id !== user.id) {
      throw new Error('Admin session mismatch.');
    }

    if (actorProfile.role !== 'admin') {
      throw new Error('Admin access is required to update the footer.');
    }

    const { data: existing, error: existingError } = await portal
      .from('site_footer_settings')
      .select('id')
      .eq('slot', slot)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    let footerId = existing?.id ?? null;

    if (existing?.id) {
      const { error: updateError } = await portal
        .from('site_footer_settings')
        .update({
          primary_text: primaryText,
          secondary_text: secondaryText ?? null,
          is_active: true,
          updated_by_profile_id: actorProfileId,
        })
        .eq('id', existing.id);

      if (updateError) {
        throw updateError;
      }
    } else {
      const { data: inserted, error: insertError } = await portal
        .from('site_footer_settings')
        .insert({
          slot,
          primary_text: primaryText,
          secondary_text: secondaryText ?? null,
          is_active: true,
          created_by_profile_id: actorProfileId,
          updated_by_profile_id: actorProfileId,
        })
        .select('id')
        .maybeSingle();

      if (insertError) {
        throw insertError;
      }

      footerId = inserted?.id ?? footerId;
    }

    await logAuditEvent(supabase, {
      actorProfileId,
      action: 'marketing_footer_updated',
      entityType: 'site_footer',
      entityId: footerId,
      meta: {
        slot,
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
