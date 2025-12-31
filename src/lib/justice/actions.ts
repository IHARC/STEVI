'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { assertOrganizationSelected, loadPortalAccess } from '@/lib/portal-access';
import { buildEntityRef, logAuditEvent } from '@/lib/audit';
import { withClientRecordAuditMeta } from '@/lib/client-record/audit';
import { diffFields } from '@/lib/client-record/diff';
import { assertCanEditClientRecord } from '@/lib/permissions/client-record';
import { createTask } from '@/lib/tasks/actions';
import type { TaskPriority } from '@/lib/tasks/types';
import type {
  JusticeEpisodeType,
  RecordSource,
  SensitivityLevel,
  VerificationStatus,
  VisibilityScope,
} from '@/lib/justice/types';

export type JusticeEpisodeFormState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
};

export type JusticeEpisodeUpdateState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
};

const EPISODE_TYPES: JusticeEpisodeType[] = ['arrest', 'charge', 'court', 'probation', 'parole', 'warrant', 'other'];
const SOURCES: RecordSource[] = ['client_reported', 'staff_observed', 'document', 'partner_org', 'system'];
const VERIFICATIONS: VerificationStatus[] = ['unverified', 'verified', 'disputed', 'stale'];
const VISIBILITIES: VisibilityScope[] = ['internal_to_org', 'shared_via_consent'];
const SENSITIVITIES: SensitivityLevel[] = ['standard', 'sensitive', 'high', 'restricted'];

function parseOptionalString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function parseOptionalNumber(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalDate(value: FormDataEntryValue | null, label: string): string | null {
  const parsed = parseOptionalString(value);
  if (!parsed) return null;
  const date = new Date(parsed);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} must be a valid date.`);
  }
  return parsed;
}

function parseRequiredDate(value: FormDataEntryValue | null, label: string): string {
  const parsed = parseOptionalDate(value, label);
  if (!parsed) {
    throw new Error(`${label} is required.`);
  }
  return parsed;
}

function parseEnum<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  if (!value) return fallback;
  const normalized = value as T;
  return allowed.includes(normalized) ? normalized : fallback;
}

function buildDueAt(dateValue: string): string {
  const date = new Date(`${dateValue}T09:00:00`);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export async function createJusticeEpisodeAction(
  _prev: JusticeEpisodeFormState,
  formData: FormData,
): Promise<JusticeEpisodeFormState> {
  try {
    const personId = parseOptionalNumber(formData.get('person_id'));
    if (!personId) return { status: 'error', message: 'Select a person to log a justice update.' };

    const caseId = parseOptionalNumber(formData.get('case_id'));
    const encounterId = parseOptionalString(formData.get('encounter_id'));

    const episodeType = parseEnum(parseOptionalString(formData.get('episode_type')), EPISODE_TYPES, 'other');
    const eventDate = parseRequiredDate(formData.get('event_date'), 'Event date');
    const eventTime = parseOptionalString(formData.get('event_time'));
    const agency = parseOptionalString(formData.get('agency'));
    const caseNumber = parseOptionalString(formData.get('case_number'));
    const charges = parseOptionalString(formData.get('charges'));
    const disposition = parseOptionalString(formData.get('disposition'));
    const location = parseOptionalString(formData.get('location'));
    const bailAmount = parseOptionalNumber(formData.get('bail_amount'));
    const bookingNumber = parseOptionalString(formData.get('booking_number'));
    const releaseDate = parseOptionalDate(formData.get('release_date'), 'Release date');
    const releaseType = parseOptionalString(formData.get('release_type'));
    const courtDate = parseOptionalDate(formData.get('court_date'), 'Court date');
    const supervisionAgency = parseOptionalString(formData.get('supervision_agency'));
    const checkInDate = parseOptionalDate(formData.get('check_in_date'), 'Check-in date');
    const notes = parseOptionalString(formData.get('notes'));

    const source = parseEnum(parseOptionalString(formData.get('source')), SOURCES, 'staff_observed');
    const verificationStatus = parseEnum(parseOptionalString(formData.get('verification_status')), VERIFICATIONS, 'unverified');
    const visibilityScope = parseEnum(parseOptionalString(formData.get('visibility_scope')), VISIBILITIES, 'internal_to_org');
    const sensitivityLevel = parseEnum(parseOptionalString(formData.get('sensitivity_level')), SENSITIVITIES, 'standard');

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);

    if (!access || !access.canAccessOpsFrontline) {
      return { status: 'error', message: 'You do not have permission to log justice updates.' };
    }

    assertOrganizationSelected(access, 'Select an acting organization before logging justice updates.');

    const { data, error } = await supabase
      .schema('core')
      .from('justice_episodes')
      .insert({
        person_id: personId,
        case_id: caseId ?? null,
        encounter_id: encounterId ?? null,
        owning_org_id: access.organizationId,
        recorded_by_profile_id: access.profile.id,
        recorded_at: new Date().toISOString(),
        source,
        verification_status: verificationStatus,
        sensitivity_level: sensitivityLevel,
        visibility_scope: visibilityScope,
        episode_type: episodeType,
        event_date: eventDate,
        event_time: eventTime ?? null,
        agency: agency ?? null,
        case_number: caseNumber ?? null,
        charges: charges ?? null,
        disposition: disposition ?? null,
        location: location ?? null,
        bail_amount: bailAmount ?? null,
        booking_number: bookingNumber ?? null,
        release_date: releaseDate ?? null,
        release_type: releaseType ?? null,
        court_date: courtDate ?? null,
        supervision_agency: supervisionAgency ?? null,
        notes: notes ?? null,
        metadata: checkInDate ? { check_in_date: checkInDate } : null,
        created_by: access.userId,
      })
      .select('id')
      .single();

    if (error || !data) {
      return { status: 'error', message: error?.message ?? 'Unable to log justice update.' };
    }

    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'justice_episode_created',
      entityType: 'core.justice_episodes',
      entityRef: buildEntityRef({ schema: 'core', table: 'justice_episodes', id: data.id }),
      meta: {
        person_id: personId,
        case_id: caseId,
        encounter_id: encounterId,
        episode_type: episodeType,
      },
    });

    const taskPayloads: Array<{ title: string; dueAt: string; priority: TaskPriority }> = [];
    if (courtDate) {
      taskPayloads.push({
        title: charges ? `Court date: ${charges}` : 'Court date',
        dueAt: buildDueAt(courtDate),
        priority: 'high',
      });
    }
    if (checkInDate) {
      taskPayloads.push({
        title: 'Justice check-in',
        dueAt: buildDueAt(checkInDate),
        priority: 'normal',
      });
    }

    for (const task of taskPayloads) {
      await createTask({
        personId,
        caseId: caseId ?? null,
        encounterId: encounterId ?? null,
        title: task.title,
        description: notes ?? null,
        dueAt: task.dueAt,
        priority: task.priority,
        visibilityScope,
        sensitivityLevel,
        sourceType: 'justice_episode',
        sourceId: data.id,
      });
    }

    revalidatePath(`/ops/clients/${personId}?tab=overview`);
    if (encounterId) {
      revalidatePath(`/ops/encounters/${encounterId}`);
    }

    return { status: 'success', message: 'Justice update saved.' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to save justice update.' };
  }
}

export async function updateJusticeEpisodeAction(
  _prev: JusticeEpisodeUpdateState,
  formData: FormData,
): Promise<JusticeEpisodeUpdateState> {
  try {
    const episodeId = parseOptionalString(formData.get('episode_id'));
    if (!episodeId) return { status: 'error', message: 'Missing justice update.' };

    const personId = parseOptionalNumber(formData.get('person_id'));
    const caseId = parseOptionalNumber(formData.get('case_id'));
    const encounterId = parseOptionalString(formData.get('encounter_id'));
    const changeReason = parseOptionalString(formData.get('change_reason'));

    const episodeType = parseEnum(parseOptionalString(formData.get('episode_type')), EPISODE_TYPES, 'other');
    const eventDate = parseRequiredDate(formData.get('event_date'), 'Event date');
    const eventTime = parseOptionalString(formData.get('event_time'));
    const agency = parseOptionalString(formData.get('agency'));
    const caseNumber = parseOptionalString(formData.get('case_number'));
    const charges = parseOptionalString(formData.get('charges'));
    const disposition = parseOptionalString(formData.get('disposition'));
    const location = parseOptionalString(formData.get('location'));
    const bailAmount = parseOptionalNumber(formData.get('bail_amount'));
    const bookingNumber = parseOptionalString(formData.get('booking_number'));
    const releaseDate = parseOptionalDate(formData.get('release_date'), 'Release date');
    const releaseType = parseOptionalString(formData.get('release_type'));
    const courtDate = parseOptionalDate(formData.get('court_date'), 'Court date');
    const supervisionAgency = parseOptionalString(formData.get('supervision_agency'));
    const checkInDate = parseOptionalDate(formData.get('check_in_date'), 'Check-in date');
    const notes = parseOptionalString(formData.get('notes'));

    const source = parseEnum(parseOptionalString(formData.get('source')), SOURCES, 'staff_observed');
    const verificationStatus = parseEnum(parseOptionalString(formData.get('verification_status')), VERIFICATIONS, 'unverified');
    const visibilityScope = parseEnum(parseOptionalString(formData.get('visibility_scope')), VISIBILITIES, 'internal_to_org');
    const sensitivityLevel = parseEnum(parseOptionalString(formData.get('sensitivity_level')), SENSITIVITIES, 'standard');

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);

    assertCanEditClientRecord(access);
    assertOrganizationSelected(access, 'Select an acting organization before updating justice updates.');

    const { data: existing, error } = await supabase
      .schema('core')
      .from('justice_episodes')
      .select(
        'id, person_id, case_id, encounter_id, episode_type, event_date, event_time, agency, case_number, charges, disposition, location, bail_amount, booking_number, release_date, release_type, court_date, supervision_agency, notes, source, verification_status, visibility_scope, sensitivity_level, metadata',
      )
      .eq('id', episodeId)
      .maybeSingle();

    if (error || !existing) {
      return { status: 'error', message: 'Unable to load that justice update.' };
    }

    const existingMetadata =
      existing.metadata && typeof existing.metadata === 'object'
        ? ({ ...(existing.metadata as Record<string, unknown>) } as Record<string, unknown>)
        : null;
    let metadataUpdate: Record<string, unknown> | null | undefined;

    if (checkInDate) {
      metadataUpdate = { ...(existingMetadata ?? {}), check_in_date: checkInDate };
    } else if (existingMetadata && 'check_in_date' in existingMetadata) {
      const nextMetadata = { ...existingMetadata };
      delete nextMetadata.check_in_date;
      metadataUpdate = Object.keys(nextMetadata).length ? nextMetadata : null;
    }

    const updatePayload: Record<string, unknown> = {
      episode_type: episodeType,
      event_date: eventDate,
      event_time: eventTime ?? null,
      agency: agency ?? null,
      case_number: caseNumber ?? null,
      charges: charges ?? null,
      disposition: disposition ?? null,
      location: location ?? null,
      bail_amount: bailAmount ?? null,
      booking_number: bookingNumber ?? null,
      release_date: releaseDate ?? null,
      release_type: releaseType ?? null,
      court_date: courtDate ?? null,
      supervision_agency: supervisionAgency ?? null,
      notes: notes ?? null,
      source,
      verification_status: verificationStatus,
      visibility_scope: visibilityScope,
      sensitivity_level: sensitivityLevel,
    };

    if (typeof metadataUpdate !== 'undefined') {
      updatePayload.metadata = metadataUpdate;
    }

    const changedFields = diffFields(existing, updatePayload);
    if (changedFields.length === 0) {
      return { status: 'success', message: 'No changes to save.' };
    }

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .schema('core')
      .from('justice_episodes')
      .update({ ...updatePayload, updated_at: now, updated_by: access.userId })
      .eq('id', episodeId);

    if (updateError) {
      return { status: 'error', message: updateError.message ?? 'Unable to update justice update.' };
    }

    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'justice_episode_updated',
      entityType: 'core.justice_episodes',
      entityRef: buildEntityRef({ schema: 'core', table: 'justice_episodes', id: episodeId }),
      meta: withClientRecordAuditMeta({
        person_id: personId ?? existing.person_id,
        case_id: caseId ?? existing.case_id,
        encounter_id: encounterId ?? existing.encounter_id,
        changed_fields: changedFields,
        change_reason: changeReason,
      }),
    });

    const resolvedPersonId = personId ?? existing.person_id;
    revalidatePath(`/ops/clients/${resolvedPersonId}`);
    const resolvedEncounterId = encounterId ?? existing.encounter_id;
    if (resolvedEncounterId) {
      revalidatePath(`/ops/encounters/${resolvedEncounterId}`);
    }

    return { status: 'success', message: 'Justice update revised.' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to update justice update.' };
  }
}
