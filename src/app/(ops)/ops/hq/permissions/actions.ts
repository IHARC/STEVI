'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { loadPortalAccess } from '@/lib/portal-access';
import { ensurePortalProfile } from '@/lib/profile';
import { logAuditEvent, buildEntityRef } from '@/lib/audit';

const PATH = '/ops/hq/permissions';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unable to complete that request.';
}

async function requireElevatedAdmin() {
  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    throw new Error('Sign in to continue.');
  }

  if (!access.isProfileApproved) {
    throw new Error('Profile approval required.');
  }

  const isElevated = access.iharcRoles.includes('iharc_admin');
  if (!isElevated) {
    throw new Error('Elevated admin access is required.');
  }

  const actorProfile = await ensurePortalProfile(supabase, access.userId);

  return { supabase, actorProfile, access };
}

export async function togglePermissionAction(formData: FormData) {
  try {
    const roleId = formData.get('role_id');
    const permissionId = formData.get('permission_id');
    const enableValue = formData.get('enable');

    if (typeof roleId !== 'string' || typeof permissionId !== 'string' || typeof enableValue !== 'string') {
      throw new Error('Invalid permission request.');
    }

    const enable = enableValue === 'true';

    const { supabase, actorProfile, access } = await requireElevatedAdmin();

    if (enable) {
      const { error } = await supabase
        .schema('core')
        .from('role_permissions')
        .insert({ role_id: roleId, permission_id: permissionId, granted_by: access.userId }, { onConflict: 'role_id,permission_id' });
      if (error) throw error;
    } else {
      const { error } = await supabase
        .schema('core')
        .from('role_permissions')
        .delete()
        .match({ role_id: roleId, permission_id: permissionId });
      if (error) throw error;
    }

    await logAuditEvent(supabase, {
      actorProfileId: actorProfile.id,
      action: enable ? 'admin_permission_granted' : 'admin_permission_revoked',
      entityType: 'role_permission',
      entityRef: buildEntityRef({ schema: 'core', table: 'role_permissions', id: `${roleId}_${permissionId}` }),
      meta: { roleId, permissionId },
    });

    revalidatePath(PATH);
    return { success: true } as const;
  } catch (error) {
    console.error('togglePermissionAction', error);
    return { success: false, error: getErrorMessage(error) } as const;
  }
}

export async function createPermissionAction(formData: FormData) {
  try {
    const name = (formData.get('name') as string | null)?.trim();
    const description = (formData.get('description') as string | null)?.trim() || null;
    const domain = (formData.get('domain') as string | null)?.trim() || null;
    const category = (formData.get('category') as string | null)?.trim() || null;

    if (!name) {
      throw new Error('Name is required.');
    }

    const { supabase, actorProfile, access } = await requireElevatedAdmin();

    const { error } = await supabase
      .schema('core')
      .from('permissions')
      .insert({ name, description, domain, category, created_by: access.userId, updated_by: access.userId });

    if (error) {
      throw error;
    }

    await logAuditEvent(supabase, {
      actorProfileId: actorProfile.id,
      action: 'admin_permission_created',
      entityType: 'permission',
      entityRef: buildEntityRef({ schema: 'core', table: 'permissions', id: name }),
      meta: { name, domain, category },
    });

    revalidatePath(PATH);
    return { success: true } as const;
  } catch (error) {
    console.error('createPermissionAction', error);
    return { success: false, error: getErrorMessage(error) } as const;
  }
}
