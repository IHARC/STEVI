'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { loadPortalAccess } from '@/lib/portal-access';
import { ensurePortalProfile } from '@/lib/profile';
import { logAuditEvent, buildEntityRef } from '@/lib/audit';

const PATH = '/app-admin/permissions';

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

  const isElevated = access.isGlobalAdmin;
  if (!isElevated) {
    throw new Error('Elevated admin access is required.');
  }

  const actorProfile = await ensurePortalProfile(supabase, access.userId);

  return { supabase, actorProfile, access };
}

export async function toggleRoleTemplatePermissionAction(formData: FormData) {
  try {
    const templateId = formData.get('template_id');
    const permissionId = formData.get('permission_id');
    const enableValue = formData.get('enable');

    if (typeof templateId !== 'string' || typeof permissionId !== 'string' || typeof enableValue !== 'string') {
      throw new Error('Invalid permission request.');
    }

    const enable = enableValue === 'true';

    const { supabase, actorProfile, access } = await requireElevatedAdmin();

    if (enable) {
      const { error } = await supabase
        .schema('core')
        .from('role_template_permissions')
        .insert({ template_id: templateId, permission_id: permissionId, granted_by: access.userId }, { onConflict: 'template_id,permission_id' });
      if (error) throw error;
    } else {
      const { error } = await supabase
        .schema('core')
        .from('role_template_permissions')
        .delete()
        .match({ template_id: templateId, permission_id: permissionId });
      if (error) throw error;
    }

    await logAuditEvent(supabase, {
      actorProfileId: actorProfile.id,
      action: enable ? 'admin_permission_granted' : 'admin_permission_revoked',
      entityType: 'role_template_permission',
      entityRef: buildEntityRef({ schema: 'core', table: 'role_template_permissions', id: `${templateId}_${permissionId}` }),
      meta: { templateId, permissionId },
    });

    revalidatePath(PATH);
    return { success: true } as const;
  } catch (error) {
    console.error('toggleRoleTemplatePermissionAction', error);
    return { success: false, error: getErrorMessage(error) } as const;
  }
}

export async function toggleOrgRolePermissionAction(formData: FormData) {
  try {
    const orgRoleId = formData.get('org_role_id');
    const permissionId = formData.get('permission_id');
    const enableValue = formData.get('enable');

    if (typeof orgRoleId !== 'string' || typeof permissionId !== 'string' || typeof enableValue !== 'string') {
      throw new Error('Invalid permission request.');
    }

    const enable = enableValue === 'true';

    const { supabase, actorProfile, access } = await requireElevatedAdmin();

    if (enable) {
      const { error } = await supabase
        .schema('core')
        .from('org_role_permissions')
        .insert({ org_role_id: orgRoleId, permission_id: permissionId, granted_by: access.userId }, { onConflict: 'org_role_id,permission_id' });
      if (error) throw error;
    } else {
      const { error } = await supabase
        .schema('core')
        .from('org_role_permissions')
        .delete()
        .match({ org_role_id: orgRoleId, permission_id: permissionId });
      if (error) throw error;
    }

    await logAuditEvent(supabase, {
      actorProfileId: actorProfile.id,
      action: enable ? 'admin_permission_granted' : 'admin_permission_revoked',
      entityType: 'org_role_permission',
      entityRef: buildEntityRef({ schema: 'core', table: 'org_role_permissions', id: `${orgRoleId}_${permissionId}` }),
      meta: { orgRoleId, permissionId },
    });

    revalidatePath(PATH);
    return { success: true } as const;
  } catch (error) {
    console.error('toggleOrgRolePermissionAction', error);
    return { success: false, error: getErrorMessage(error) } as const;
  }
}

export async function createRoleTemplateAction(formData: FormData) {
  try {
    const name = (formData.get('name') as string | null)?.trim();
    const displayName = (formData.get('display_name') as string | null)?.trim();
    const description = (formData.get('description') as string | null)?.trim() || null;

    if (!name || !displayName) {
      throw new Error('Name and display name are required.');
    }

    const { supabase, actorProfile, access } = await requireElevatedAdmin();

    const { data: template, error } = await supabase
      .schema('core')
      .from('role_templates')
      .insert({ name, display_name: displayName, description, created_by: access.userId, updated_by: access.userId })
      .select('id')
      .maybeSingle();

    if (error) {
      throw error;
    }

    await logAuditEvent(supabase, {
      actorProfileId: actorProfile.id,
      action: 'admin_role_template_created',
      entityType: 'role_template',
      entityRef: buildEntityRef({ schema: 'core', table: 'role_templates', id: template?.id ?? name }),
      meta: { name, displayName },
    });

    revalidatePath(PATH);
    return { success: true } as const;
  } catch (error) {
    console.error('createRoleTemplateAction', error);
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

export async function createOrgRoleAction(formData: FormData) {
  try {
    const organizationIdValue = (formData.get('organization_id') as string | null)?.trim();
    const name = (formData.get('name') as string | null)?.trim();
    const displayName = (formData.get('display_name') as string | null)?.trim();
    const description = (formData.get('description') as string | null)?.trim() || null;
    const templateId = (formData.get('template_id') as string | null)?.trim() || null;
    const roleKindValue = (formData.get('role_kind') as string | null)?.trim();
    let roleKind: 'staff' | 'volunteer' = roleKindValue === 'volunteer' ? 'volunteer' : 'staff';

    if (!organizationIdValue || !name || !displayName) {
      throw new Error('Organization, name, and display name are required.');
    }

    const organizationId = Number.parseInt(organizationIdValue, 10);
    if (Number.isNaN(organizationId)) {
      throw new Error('Invalid organization.');
    }

    const { supabase, actorProfile, access } = await requireElevatedAdmin();

    if (templateId) {
      const { data: template, error: templateError } = await supabase
        .schema('core')
        .from('role_templates')
        .select('role_kind')
        .eq('id', templateId)
        .maybeSingle();
      if (templateError) throw templateError;
      if (template?.role_kind === 'volunteer') {
        roleKind = 'volunteer';
      } else if (template?.role_kind === 'staff') {
        roleKind = 'staff';
      }
    }

    const { data: orgRole, error } = await supabase
      .schema('core')
      .from('org_roles')
      .insert({
        organization_id: organizationId,
        name,
        display_name: displayName,
        description,
        template_id: templateId || null,
        role_kind: roleKind,
        created_by: access.userId,
        updated_by: access.userId,
      })
      .select('id, organization_id')
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (orgRole && templateId) {
      const { data: templatePerms, error: permError } = await supabase
        .schema('core')
        .from('role_template_permissions')
        .select('permission_id')
        .eq('template_id', templateId);
      if (permError) throw permError;

      const inserts = (templatePerms ?? []).map((row: { permission_id: string }) => ({
        org_role_id: orgRole.id,
        permission_id: row.permission_id,
        granted_by: access.userId,
      }));

      if (inserts.length) {
        const { error: insertError } = await supabase
          .schema('core')
          .from('org_role_permissions')
          .insert(inserts, { onConflict: 'org_role_id,permission_id' });
        if (insertError) throw insertError;
      }
    }

    await logAuditEvent(supabase, {
      actorProfileId: actorProfile.id,
      action: 'admin_org_role_created',
      entityType: 'org_role',
      entityRef: buildEntityRef({ schema: 'core', table: 'org_roles', id: orgRole?.id ?? name }),
      meta: { name, organizationId, templateId, role_kind: roleKind },
    });

    revalidatePath(PATH);
    return { success: true } as const;
  } catch (error) {
    console.error('createOrgRoleAction', error);
    return { success: false, error: getErrorMessage(error) } as const;
  }
}

export async function applyTemplateToOrgRoleAction(formData: FormData) {
  try {
    const orgRoleId = (formData.get('org_role_id') as string | null)?.trim();
    const templateId = (formData.get('template_id') as string | null)?.trim();

    if (!orgRoleId || !templateId) {
      throw new Error('Select a role template.');
    }

    const { supabase, actorProfile, access } = await requireElevatedAdmin();

    const { data: template, error: templateError } = await supabase
      .schema('core')
      .from('role_templates')
      .select('role_kind')
      .eq('id', templateId)
      .maybeSingle();
    if (templateError) throw templateError;

    const { error: updateError } = await supabase
      .schema('core')
      .from('org_roles')
      .update({ template_id: templateId, role_kind: template?.role_kind ?? 'staff' })
      .eq('id', orgRoleId);
    if (updateError) throw updateError;

    const { error: clearError } = await supabase
      .schema('core')
      .from('org_role_permissions')
      .delete()
      .eq('org_role_id', orgRoleId);
    if (clearError) throw clearError;

    const { data: templatePerms, error: permsError } = await supabase
      .schema('core')
      .from('role_template_permissions')
      .select('permission_id')
      .eq('template_id', templateId);
    if (permsError) throw permsError;

    if (templatePerms && templatePerms.length > 0) {
      const inserts = templatePerms.map((row: { permission_id: string }) => ({
        org_role_id: orgRoleId,
        permission_id: row.permission_id,
        granted_by: access.userId,
      }));
      const { error: insertError } = await supabase
        .schema('core')
        .from('org_role_permissions')
        .insert(inserts, { onConflict: 'org_role_id,permission_id' });
      if (insertError) throw insertError;
    }

    await logAuditEvent(supabase, {
      actorProfileId: actorProfile.id,
      action: 'admin_org_role_template_applied',
      entityType: 'org_role',
      entityRef: buildEntityRef({ schema: 'core', table: 'org_roles', id: orgRoleId }),
      meta: { templateId },
    });

    revalidatePath(PATH);
    return { success: true } as const;
  } catch (error) {
    console.error('applyTemplateToOrgRoleAction', error);
    return { success: false, error: getErrorMessage(error) } as const;
  }
}
