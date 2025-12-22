'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { loadPortalAccess } from '@/lib/portal-access';
import { logAuditEvent, buildEntityRef } from '@/lib/audit';
import { getUserEmailForProfile } from '@/lib/profile';
import { queuePortalNotification } from '@/lib/notifications';
import { getOnboardingStatus } from '@/lib/onboarding/status';

type AdminActionResult = { status: 'success' | 'error'; message: string };

function errorResult(message: string): AdminActionResult {
  return { status: 'error', message };
}

export async function resetOnboardingAction(formData: FormData): Promise<AdminActionResult> {
  const personId = Number.parseInt(String(formData.get('person_id') ?? ''), 10);
  if (!personId || Number.isNaN(personId)) {
    return errorResult('Invalid person id.');
  }

  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);
  if (!access || !access.canManageConsents) {
    return errorResult('You do not have permission to reset onboarding.');
  }

  const now = new Date().toISOString();
  const core = supabase.schema('core');
  const caseMgmt = supabase.schema('case_mgmt');

  const { error: updateError } = await core
    .from('people')
    .update({ data_sharing_consent: null, updated_at: now, updated_by: access.userId })
    .eq('id', personId);

  if (updateError) {
    return errorResult('Unable to reset sharing preference.');
  }

  const { error: intakeError } = await caseMgmt.from('client_intakes').insert({
    person_id: personId,
    consent_confirmed: false,
    privacy_acknowledged: false,
    intake_date: now.slice(0, 10),
    intake_worker: access.profile.id,
    general_notes: 'Onboarding reset by admin; previous consent superseded.',
  });

  if (intakeError) {
    return errorResult('Sharing reset, but consent history could not be updated.');
  }

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: 'onboarding_reset',
    entityType: 'people',
    entityRef: buildEntityRef({ schema: 'core', table: 'people', id: personId }),
    meta: { person_id: personId, reset_by: access.profile.id },
  });

  revalidatePath(`/app-admin/clients/${personId}`);
  return { status: 'success', message: 'Onboarding reset. Consents now require renewal.' };
}

export async function resendOnboardingLinkAction(formData: FormData): Promise<AdminActionResult> {
  const personId = Number.parseInt(String(formData.get('person_id') ?? ''), 10);
  if (!personId || Number.isNaN(personId)) {
    return errorResult('Invalid person id.');
  }

  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);
  if (!access || !access.canManageConsents) {
    return errorResult('You do not have permission to resend onboarding links.');
  }

  const core = supabase.schema('core');
  const { data: linkRow, error: linkError } = await core
    .from('user_people')
    .select('profile_id, user_id')
    .eq('person_id', personId)
    .order('linked_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (linkError || !linkRow?.profile_id) {
    return errorResult('No linked account found to notify.');
  }

  const email = await getUserEmailForProfile(supabase, linkRow.profile_id);
  if (!email) {
    return errorResult('Linked user has no email on file.');
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const link = appUrl && appUrl.startsWith('http') ? `${appUrl}/onboarding` : '/onboarding';

  await queuePortalNotification(supabase, {
    profileId: linkRow.profile_id,
    email,
    subject: 'Complete your STEVI onboarding',
    bodyText: `Please finish onboarding so we can share updates and documents. Open ${link} to continue.`,
    type: 'onboarding_reminder',
    payload: { person_id: personId, link },
  });

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: 'onboarding_link_resent',
    entityType: 'people',
    entityRef: buildEntityRef({ schema: 'core', table: 'people', id: personId }),
    meta: { person_id: personId, target_profile_id: linkRow.profile_id },
  });

  revalidatePath(`/app-admin/clients/${personId}`);
  return { status: 'success', message: 'Reminder sent to the linked account.' };
}

export async function refreshOnboardingStatusAction(formData: FormData): Promise<AdminActionResult> {
  const personId = Number.parseInt(String(formData.get('person_id') ?? ''), 10);
  if (!personId || Number.isNaN(personId)) {
    return errorResult('Invalid person id.');
  }

  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);
  if (!access || !access.canManageConsents) {
    return errorResult('You do not have permission to refresh onboarding.');
  }

  await getOnboardingStatus({ personId }, supabase);
  revalidatePath(`/app-admin/clients/${personId}`);
  return { status: 'success', message: 'Onboarding status refreshed.' };
}
