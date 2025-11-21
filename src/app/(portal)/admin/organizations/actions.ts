'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensurePortalProfile } from '@/lib/profile';
import { logAuditEvent } from '@/lib/audit';

const LIST_PATH = '/admin/organizations';

type ActionResult = { success: true } | { success: false; error: string };

function getString(form: FormData, key: string): string | null {
  const value = form.get(key);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function createOrganizationAction(formData: FormData): Promise<ActionResult> {
  try {
    const name = getString(formData, 'name');
    const website = getString(formData, 'website');
    const category = getString(formData, 'category') ?? 'community';

    if (!name) {
      throw new Error('Organization name is required.');
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      throw error ?? new Error('Sign in to continue.');
    }

    const actorProfile = await ensurePortalProfile(supabase, user.id);
    if (actorProfile.role !== 'admin') {
      throw new Error('Administrator access is required.');
    }

    const portal = supabase.schema('portal');
    const insert = await portal
      .from('organizations')
      .insert({
        name,
        website,
        category: category === 'government' ? 'government' : 'community',
        verified: false,
        created_by: actorProfile.id,
        updated_by: actorProfile.id,
      })
      .select('id')
      .maybeSingle();

    if (insert.error) {
      throw insert.error;
    }

    if (insert.data) {
      await logAuditEvent(supabase, {
        actorProfileId: actorProfile.id,
        action: 'organization_created',
        entityType: 'organization',
        entityId: insert.data.id,
        meta: { name },
      });
    }

    await revalidatePath(LIST_PATH);
    return { success: true };
  } catch (error) {
    console.error('createOrganizationAction error', error);
    const message = error instanceof Error ? error.message : 'Unable to create organization.';
    return { success: false, error: message };
  }
}

export async function promoteOrgAdminAction(formData: FormData): Promise<ActionResult> {
  try {
    const profileId = getString(formData, 'profile_id');
    const organizationId = getString(formData, 'organization_id');

    if (!profileId || !organizationId) {
      throw new Error('Profile and organization are required.');
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      throw error ?? new Error('Sign in to continue.');
    }

    const actorProfile = await ensurePortalProfile(supabase, user.id);
    if (actorProfile.role !== 'admin') {
      throw new Error('Administrator access is required.');
    }

    const portal = supabase.schema('portal');

    const { data: roleRow, error: roleError } = await portal
      .from('roles')
      .select('id')
      .eq('name', 'org_admin')
      .maybeSingle();
    if (roleError || !roleRow) {
      throw roleError ?? new Error('org_admin role missing.');
    }

    const now = new Date().toISOString();

    const profileUpdate = await portal
      .from('profiles')
      .update({ organization_id: organizationId, role: 'org_admin', updated_at: now })
      .eq('id', profileId);
    if (profileUpdate.error) throw profileUpdate.error;

    const existing = await portal
      .from('profile_roles')
      .select('id, revoked_at')
      .eq('profile_id', profileId)
      .eq('role_id', roleRow.id)
      .maybeSingle();
    if (existing.error) throw existing.error;

    if (!existing.data) {
      const insert = await portal.from('profile_roles').insert({
        profile_id: profileId,
        role_id: roleRow.id,
        granted_at: now,
        granted_by_profile_id: actorProfile.id,
      });
      if (insert.error) throw insert.error;
    } else if (existing.data.revoked_at) {
      const restore = await portal
        .from('profile_roles')
        .update({ revoked_at: null, revoked_by_profile_id: null, updated_at: now })
        .eq('id', existing.data.id);
      if (restore.error) throw restore.error;
    }

    await supabase.rpc('portal_refresh_profile_claims', { p_profile_id: profileId }).catch(() => undefined);

    await logAuditEvent(supabase, {
      actorProfileId: actorProfile.id,
      action: 'organization_admin_promoted',
      entityType: 'profile',
      entityId: profileId,
      meta: { organization_id: organizationId },
    });

    await revalidatePath(LIST_PATH);
    return { success: true };
  } catch (error) {
    console.error('promoteOrgAdminAction error', error);
    const message = error instanceof Error ? error.message : 'Unable to promote organization admin.';
    return { success: false, error: message };
  }
}
