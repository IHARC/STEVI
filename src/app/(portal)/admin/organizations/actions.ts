'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensurePortalProfile } from '@/lib/profile';
import { logAuditEvent } from '@/lib/audit';
import { loadPortalAccess } from '@/lib/portal-access';

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

    if (!name) {
      throw new Error('Organization name is required.');
    }

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);

    if (!access) {
      throw new Error('Sign in to continue.');
    }

    if (!access.canAccessAdminWorkspace) {
      throw new Error('Administrator access is required.');
    }

    const actorProfile = await ensurePortalProfile(supabase, access.userId);
    if (!actorProfile) {
      throw new Error('Administrator access is required.');
    }

    const core = supabase.schema('core');
    const insert = await core
      .from('organizations')
      .insert({
        name,
        website,
        organization_type: null,
        is_active: true,
        status: 'active',
        created_by: actorProfile.id,
        updated_by: actorProfile.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
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
    const access = await loadPortalAccess(supabase);

    if (!access) {
      throw new Error('Sign in to continue.');
    }

    if (!access.canAccessAdminWorkspace) {
      throw new Error('Administrator access is required.');
    }

    const actorProfile = await ensurePortalProfile(supabase, access.userId);
    const portal = supabase.schema('portal');

    const now = new Date().toISOString();

    const profileUpdate = await portal
      .from('profiles')
      .update({ organization_id: Number.parseInt(organizationId, 10), updated_at: now })
      .eq('id', profileId);
    if (profileUpdate.error) throw profileUpdate.error;

    const { error: roleError } = await supabase.rpc('set_profile_role', {
      p_profile_id: profileId,
      p_role_name: 'portal_org_admin',
      p_enable: true,
    });
    if (roleError) throw roleError;

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
