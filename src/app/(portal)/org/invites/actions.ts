'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensurePortalProfile } from '@/lib/profile';
import { logAuditEvent, buildEntityRef } from '@/lib/audit';
import { loadPortalAccess } from '@/lib/portal-access';
import { checkRateLimit } from '@/lib/rate-limit';
import { ORG_INVITE_EVENT, ORG_INVITE_RATE_LIMIT, formatInviteCooldown } from './constants';

const INVITES_PATH = '/org/invites';

export type OrgInviteFormState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  retryInMs?: number;
};

function readString(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function createOrgInviteAction(
  _prevState: OrgInviteFormState,
  formData: FormData,
): Promise<OrgInviteFormState> {
  try {
    const email = readString(formData, 'email');
    const displayName = readString(formData, 'display_name');
    const positionTitle = readString(formData, 'position_title');
    const message = readString(formData, 'message');

    if (!email || !email.includes('@')) {
      return { status: 'error', message: 'Enter a valid email address.' };
    }

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);

    if (!access) {
      return { status: 'error', message: 'Sign in to continue.' };
    }

    if (!access.canManageOrgInvites || !access.organizationId) {
      return { status: 'error', message: 'Organization admin access is required.' };
    }

    const rateLimit = await checkRateLimit({
      supabase,
      type: ORG_INVITE_EVENT,
      limit: ORG_INVITE_RATE_LIMIT.limit,
      cooldownMs: ORG_INVITE_RATE_LIMIT.cooldownMs,
    });

    if (!rateLimit.allowed) {
      return {
        status: 'error',
        message: formatInviteCooldown(rateLimit.retryInMs),
        retryInMs: rateLimit.retryInMs,
      };
    }

    const actorProfile = await ensurePortalProfile(supabase, access.userId);
    if (!actorProfile.organization_id) {
      return { status: 'error', message: 'Organization admin access is required.' };
    }

    const portal = supabase.schema('portal');
    const insert = await portal
      .from('profile_invites')
      .insert({
        email,
        display_name: displayName,
        position_title: positionTitle,
        message,
        affiliation_type: 'agency_partner',
        organization_id: actorProfile.organization_id,
        invited_by_profile_id: actorProfile.id,
        invited_by_user_id: access.userId,
      })
      .select('id')
      .single();

    if (insert.error) {
      throw insert.error;
    }

    await logAuditEvent(supabase, {
      actorProfileId: actorProfile.id,
      action: 'org_invite_created',
      entityType: 'profile_invite',
      entityRef: buildEntityRef({ schema: 'portal', table: 'profile_invites', id: insert.data?.id ?? null }),
      meta: { organization_id: actorProfile.organization_id, email },
    });

    await revalidatePath(INVITES_PATH);

    return { status: 'success', message: 'Invitation sent. Recipients receive a secure link.' };
  } catch (error) {
    console.error('createOrgInviteAction error', error);
    const message = error instanceof Error ? error.message : 'Unable to create invite.';
    return { status: 'error', message };
  }
}
