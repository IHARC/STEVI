'use server';

import { revalidatePath } from 'next/cache';
import { buildEntityRef, logAuditEvent } from '@/lib/audit';
import { assertOrganizationSelected, loadPortalAccess } from '@/lib/portal-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type OutreachFormState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
};

const MAX_TITLE_LENGTH = 160;
const MAX_SUMMARY_LENGTH = 1200;
const MAX_LOCATION_LENGTH = 240;

export async function staffLogOutreachAction(
  _prevState: OutreachFormState,
  formData: FormData,
): Promise<OutreachFormState> {
  const personId = Number.parseInt(String(formData.get('person_id') ?? ''), 10);
  const caseIdRaw = formData.get('case_id');
  const caseId = caseIdRaw ? Number.parseInt(String(caseIdRaw), 10) : null;

  const title = (formData.get('title') as string | null)?.trim() ?? '';
  const summary = (formData.get('summary') as string | null)?.trim() ?? '';
  const occurredAtRaw = (formData.get('occurred_at') as string | null)?.trim() ?? '';
  const location = (formData.get('location') as string | null)?.trim() ?? '';

  if (!personId || Number.isNaN(personId)) {
    return { status: 'error', message: 'Select a case to log outreach.' };
  }

  if (!title || title.length < 3) {
    return { status: 'error', message: 'Add a short title (3+ characters).' };
  }

  if (title.length > MAX_TITLE_LENGTH) {
    return { status: 'error', message: 'Keep the title under 160 characters.' };
  }

  if (summary.length > MAX_SUMMARY_LENGTH) {
    return { status: 'error', message: 'Keep the summary under 1200 characters.' };
  }

  if (location.length > MAX_LOCATION_LENGTH) {
    return { status: 'error', message: 'Keep the location under 240 characters.' };
  }

  const timestamp = occurredAtRaw ? new Date(occurredAtRaw) : new Date();
  if (Number.isNaN(timestamp.getTime())) {
    return { status: 'error', message: 'Add a valid time for this outreach contact.' };
  }

  const activityDate = timestamp.toISOString().slice(0, 10);
  const activityTime = timestamp.toISOString().slice(11, 19);

  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessStaffWorkspace) {
    return { status: 'error', message: 'You need staff access to log outreach.' };
  }

  assertOrganizationSelected(access, 'Select an acting organization before logging outreach.');

  const core = supabase.schema('core');
  const { error } = await core.from('people_activities').insert({
    person_id: personId,
    activity_type: 'contact',
    activity_date: activityDate,
    activity_time: activityTime,
    title,
    description: summary || null,
    location: location || null,
    staff_member: access.profile.display_name,
      metadata: {
        case_id: caseId,
        client_visible: false,
        quick_entry: true,
        source: 'staff_tools',
      },
    created_by: access.userId,
    provider_profile_id: access.profile.id,
    provider_org_id: access.organizationId,
  });

  if (error) {
    return { status: 'error', message: 'Unable to save outreach right now.' };
  }

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: 'outreach_contact_logged',
    entityType: 'people_activities',
    entityRef: buildEntityRef({ schema: 'core', table: 'people', id: personId }),
    meta: { person_id: personId, case_id: caseId, via: 'staff_fast_entry' },
  });

  revalidatePath('/workspace/clients?view=activity');
  revalidatePath('/workspace/programs');

  return { status: 'success', message: 'Outreach saved.' };
}
