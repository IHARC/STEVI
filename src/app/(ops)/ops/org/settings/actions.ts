'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensurePortalProfile } from '@/lib/profile';
import { logAuditEvent, buildEntityRef } from '@/lib/audit';
import { loadPortalAccess } from '@/lib/portal-access';

export type OrgSettingsFormState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
};

const settingsPath = (organizationId: number) => `/ops/organizations/${organizationId}`;

function readOptionalString(formData: FormData, key: string): string | null | undefined {
  if (!formData.has(key)) return undefined;
  const value = formData.get(key);
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return Boolean(url.protocol && url.host);
  } catch {
    return false;
  }
}

export async function updateOrgSettingsAction(
  _prevState: OrgSettingsFormState,
  formData: FormData,
): Promise<OrgSettingsFormState> {
  try {
    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);

    if (!access) {
      return { status: 'error', message: 'Sign in to continue.' };
    }

    const isIharcAdmin = access.iharcRoles.includes('iharc_admin');
    const orgIdRaw = formData.get('organization_id');
    const parsedOrgId = typeof orgIdRaw === 'string' ? Number.parseInt(orgIdRaw, 10) : null;
    const orgId = isIharcAdmin ? (access.organizationId ?? (Number.isFinite(parsedOrgId) ? parsedOrgId : null)) : access.organizationId;

    if (!orgId || (!isIharcAdmin && !access.canManageOrgUsers)) {
      return { status: 'error', message: 'Organization admin access is required.' };
    }

    const actorProfile = await ensurePortalProfile(supabase, access.userId);

    const contactPerson = readOptionalString(formData, 'contact_person');
    const contactTitle = readOptionalString(formData, 'contact_title');
    const contactEmail = readOptionalString(formData, 'contact_email');
    const contactPhone = readOptionalString(formData, 'contact_phone');
    const website = readOptionalString(formData, 'website');
    const referralProcess = readOptionalString(formData, 'referral_process');
    const specialRequirements = readOptionalString(formData, 'special_requirements');
    const availabilityNotes = readOptionalString(formData, 'availability_notes');

    if (website && !isValidUrl(website)) {
      return { status: 'error', message: 'Enter a valid website URL starting with http:// or https://.' };
    }

    const updates: Record<string, string | null> = {};
    const setIfPresent = (key: string, value: string | null | undefined) => {
      if (value !== undefined) {
        updates[key] = value;
      }
    };

    setIfPresent('contact_person', contactPerson);
    setIfPresent('contact_title', contactTitle);
    setIfPresent('contact_email', contactEmail);
    setIfPresent('contact_phone', contactPhone);
    setIfPresent('website', website);
    setIfPresent('referral_process', referralProcess);
    setIfPresent('special_requirements', specialRequirements);
    setIfPresent('availability_notes', availabilityNotes);

    if (Object.keys(updates).length === 0) {
      return { status: 'error', message: 'No changes to save.' };
    }

    updates.updated_at = new Date().toISOString();
    updates.updated_by = actorProfile.id;

    const { error } = await supabase
      .schema('core')
      .from('organizations')
      .update(updates)
      .eq('id', orgId);

    if (error) {
      throw error;
    }

    await logAuditEvent(supabase, {
      actorProfileId: actorProfile.id,
      action: 'org_settings_updated',
      entityType: 'organization',
      entityRef: buildEntityRef({ schema: 'core', table: 'organizations', id: orgId }),
      meta: { updated_keys: Object.keys(updates) },
    });

    await revalidatePath(settingsPath(orgId));

    return { status: 'success', message: 'Settings updated.' };
  } catch (error) {
    console.error('updateOrgSettingsAction error', error);
    const message = error instanceof Error ? error.message : 'Unable to update settings right now.';
    return { status: 'error', message };
  }
}
