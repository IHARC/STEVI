'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { assertOrganizationSelected, loadPortalAccess } from '@/lib/portal-access';
import { buildEntityRef, logAuditEvent } from '@/lib/audit';
import { createTask } from '@/lib/tasks/actions';
import type { TaskPriority } from '@/lib/tasks/types';
import type { FollowUpTimeline, RecordSource, SensitivityLevel, VerificationStatus, VisibilityScope } from '@/lib/medical/types';

export type MedicalEpisodeFormState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
};

const SOURCES: RecordSource[] = ['client_reported', 'staff_observed', 'document', 'partner_org', 'system'];
const VERIFICATIONS: VerificationStatus[] = ['unverified', 'verified', 'disputed', 'stale'];
const VISIBILITIES: VisibilityScope[] = ['internal_to_org', 'shared_via_consent'];
const SENSITIVITIES: SensitivityLevel[] = ['standard', 'sensitive', 'high', 'restricted'];
const FOLLOW_UP_TIMELINES: FollowUpTimeline[] = ['immediate', 'urgent', 'weekly', 'routine', 'client_initiated'];

function parseOptionalString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function parseRequiredString(value: FormDataEntryValue | null, label: string): string {
  const parsed = parseOptionalString(value);
  if (!parsed) {
    throw new Error(`${label} is required.`);
  }
  return parsed;
}

function parseOptionalNumber(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
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

function resolveFollowUpTask(
  baseDate: Date,
  followUpNeeded: boolean,
  followUpTimeline: FollowUpTimeline | null,
): { dueAt: string; priority: TaskPriority } | null {
  if (!followUpNeeded && !followUpTimeline) return null;
  if (followUpTimeline === 'client_initiated') return null;

  let days = 7;
  let priority: TaskPriority = 'normal';

  switch (followUpTimeline) {
    case 'immediate':
      days = 0;
      priority = 'urgent';
      break;
    case 'urgent':
      days = 2;
      priority = 'high';
      break;
    case 'weekly':
      days = 7;
      priority = 'normal';
      break;
    case 'routine':
      days = 30;
      priority = 'low';
      break;
    default:
      days = 7;
      priority = 'normal';
  }

  const dueAt = new Date(baseDate);
  dueAt.setDate(dueAt.getDate() + days);
  dueAt.setHours(9, 0, 0, 0);

  return { dueAt: dueAt.toISOString(), priority };
}

export async function createMedicalEpisodeAction(
  _prev: MedicalEpisodeFormState,
  formData: FormData,
): Promise<MedicalEpisodeFormState> {
  try {
    const personId = parseOptionalNumber(formData.get('person_id'));
    if (!personId) return { status: 'error', message: 'Select a person to log a medical update.' };

    const caseId = parseOptionalNumber(formData.get('case_id'));
    const encounterId = parseOptionalString(formData.get('encounter_id'));

    const episodeType = parseRequiredString(formData.get('episode_type'), 'Episode type');
    const primaryCondition = parseRequiredString(formData.get('primary_condition'), 'Primary condition');
    const episodeDate = parseRequiredDate(formData.get('episode_date'), 'Episode date');
    const episodeEndDate = parseOptionalDate(formData.get('episode_end_date'), 'Episode end date');
    const severityLevel = parseOptionalString(formData.get('severity_level'));
    const assessmentSummary = parseOptionalString(formData.get('assessment_summary'));
    const planSummary = parseOptionalString(formData.get('plan_summary'));
    const followUpNeeded = formData.get('follow_up_needed') === 'on';
    const followUpTimelineRaw = parseOptionalString(formData.get('follow_up_timeline'));
    const followUpTimeline =
      followUpTimelineRaw && FOLLOW_UP_TIMELINES.includes(followUpTimelineRaw as FollowUpTimeline)
        ? (followUpTimelineRaw as FollowUpTimeline)
        : null;
    const followUpNotes = parseOptionalString(formData.get('follow_up_notes'));
    const outcome = parseOptionalString(formData.get('outcome'));
    const locationOccurred = parseOptionalString(formData.get('location_occurred'));

    const source = parseEnum(parseOptionalString(formData.get('source')), SOURCES, 'staff_observed');
    const verificationStatus = parseEnum(parseOptionalString(formData.get('verification_status')), VERIFICATIONS, 'unverified');
    const visibilityScope = parseEnum(parseOptionalString(formData.get('visibility_scope')), VISIBILITIES, 'internal_to_org');
    const sensitivityLevel = parseEnum(parseOptionalString(formData.get('sensitivity_level')), SENSITIVITIES, 'standard');

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);

    if (!access || !access.canAccessOpsFrontline) {
      return { status: 'error', message: 'You do not have permission to log medical updates.' };
    }

    assertOrganizationSelected(access, 'Select an acting organization before logging medical updates.');

    const { data, error } = await supabase
      .schema('core')
      .from('medical_episodes')
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
        primary_condition: primaryCondition,
        episode_date: episodeDate,
        episode_end_date: episodeEndDate ?? null,
        severity_level: severityLevel ?? null,
        assessment_summary: assessmentSummary ?? null,
        plan_summary: planSummary ?? null,
        follow_up_needed: followUpNeeded,
        follow_up_timeline: followUpTimeline ?? null,
        follow_up_notes: followUpNotes ?? null,
        outcome: outcome ?? null,
        location_occurred: locationOccurred ?? null,
        created_by: access.userId,
      })
      .select('id')
      .single();

    if (error || !data) {
      return { status: 'error', message: error?.message ?? 'Unable to log medical update.' };
    }

    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'medical_episode_created',
      entityType: 'core.medical_episodes',
      entityRef: buildEntityRef({ schema: 'core', table: 'medical_episodes', id: data.id }),
      meta: {
        person_id: personId,
        case_id: caseId,
        encounter_id: encounterId,
        episode_type: episodeType,
      },
    });

    const baseDate = new Date(`${episodeDate}T09:00:00`);
    const followUpTask = resolveFollowUpTask(baseDate, followUpNeeded, followUpTimeline ?? null);

    if (followUpTask) {
      await createTask({
        personId,
        caseId: caseId ?? null,
        encounterId: encounterId ?? null,
        title: `Medical follow-up: ${primaryCondition}`,
        description: followUpNotes ?? assessmentSummary ?? null,
        dueAt: followUpTask.dueAt,
        priority: followUpTask.priority,
        visibilityScope,
        sensitivityLevel,
        sourceType: 'medical_episode',
        sourceId: data.id,
      });
    }

    revalidatePath(`/ops/clients/${personId}?view=directory`);
    if (encounterId) {
      revalidatePath(`/ops/encounters/${encounterId}`);
    }

    return { status: 'success', message: 'Medical update saved.' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to save medical update.' };
  }
}
