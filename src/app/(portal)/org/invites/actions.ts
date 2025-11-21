'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensurePortalProfile } from '@/lib/profile';
import { logAuditEvent } from '@/lib/audit';
import { getPortalRoles } from '@/lib/ihar-auth';

const INVITES_PATH = '/org/invites';

function readString(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function createOrgInviteAction(formData: FormData) {
  try {
    const email = readString(formData, 'email');
    const displayName = readString(formData, 'display_name');
    const positionTitle = readString(formData, 'position_title');
    const message = readString(formData, 'message');

    if (!email || !email.includes('@')) {
      throw new Error('Enter a valid email.');
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      throw error ?? new Error('Sign in to continue.');
    }

    const portalRoles = getPortalRoles(user);
    if (!portalRoles.includes('portal_org_admin') && !portalRoles.includes('portal_admin')) {
      throw new Error('Organization admin access is required.');
    }

    const actorProfile = await ensurePortalProfile(supabase, user.id);
    if (!actorProfile.organization_id) {
      throw new Error('Organization admin access is required.');
    }

    const portal = supabase.schema('portal');
    const insert = await portal.from('profile_invites').insert({
      email,
      display_name: displayName,
      position_title: positionTitle,
      message,
      affiliation_type: 'agency_partner',
      organization_id: actorProfile.organization_id,
      invited_by_profile_id: actorProfile.id,
      invited_by_user_id: user.id,
    });

    if (insert.error) {
      throw insert.error;
    }

    await logAuditEvent(supabase, {
      actorProfileId: actorProfile.id,
      action: 'org_invite_created',
      entityType: 'profile_invite',
      entityId: email,
      meta: { organization_id: actorProfile.organization_id },
    });

    await revalidatePath(INVITES_PATH);

    return { success: true } as const;
  } catch (error) {
    console.error('createOrgInviteAction error', error);
    const message = error instanceof Error ? error.message : 'Unable to create invite.';
    return { success: false, error: message } as const;
  }
}
