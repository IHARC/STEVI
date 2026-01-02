'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { assertOrganizationSelected, loadPortalAccess, type PortalAccess } from '@/lib/portal-access';
import { buildEntityRef, logAuditEvent } from '@/lib/audit';
import { createTask } from '@/lib/tasks/actions';
import type { TaskPriority } from '@/lib/tasks/types';
import { INCIDENT_TYPE_OPTIONS, type IncidentType } from '@/lib/cfs/constants';
import {
  OBSERVATION_CATEGORIES,
  OBSERVATION_LEAD_STATUSES,
  OBSERVATION_SOURCE_OPTIONS,
  OBSERVATION_SUBJECTS,
  OBSERVATION_VERIFICATION_OPTIONS,
} from '@/lib/observations/constants';
import type {
  ObservationCategory,
  ObservationLeadStatus,
  ObservationSubject,
  RecordSource,
  SensitivityLevel,
  VerificationStatus,
  VisibilityScope,
} from '@/lib/observations/types';

export type ObservationFormState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  observationId?: string;
};

const TASK_PRIORITY_OPTIONS: TaskPriority[] = ['low', 'normal', 'high', 'urgent'];
const VISIBILITY_OPTIONS: VisibilityScope[] = ['internal_to_org', 'shared_via_consent'];
const SENSITIVITY_OPTIONS: SensitivityLevel[] = ['standard', 'sensitive', 'high', 'restricted'];

const LEAD_RETENTION_DAYS = 90;

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

function parseOptionalDatetime(value: FormDataEntryValue | null, label: string): string | null {
  const parsed = parseOptionalString(value);
  if (!parsed) return null;
  const date = new Date(parsed);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} must be a valid date/time.`);
  }
  return date.toISOString();
}

function parseEnum<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  if (!value) return fallback;
  const normalized = value as T;
  return allowed.includes(normalized) ? normalized : fallback;
}

function parseRequiredEnum<T extends string>(value: string | null, allowed: readonly T[], label: string): T {
  if (!value) {
    throw new Error(`${label} is required.`);
  }
  const normalized = value as T;
  if (!allowed.includes(normalized)) {
    throw new Error(`${label} is invalid.`);
  }
  return normalized;
}

function resolveLeadExpiry(base: Date) {
  const expires = new Date(base);
  expires.setDate(expires.getDate() + LEAD_RETENTION_DAYS);
  return expires.toISOString();
}

function resolveAllowedSensitivities(access: PortalAccess): SensitivityLevel[] {
  const allowed: SensitivityLevel[] = ['standard'];
  if (access.canReadSensitiveObservations || access.canReadRestrictedObservations) {
    allowed.push('sensitive');
  }
  if (access.canReadRestrictedObservations) {
    allowed.push('high', 'restricted');
  }
  return allowed;
}

function assertObservationPromotionAccess(access: PortalAccess) {
  if (access.isGlobalAdmin) return;
  if (!access.orgPermissions.includes('observations.promote')) {
    throw new Error('You do not have permission to promote observations.');
  }
}

function parseLeadStatus(value: string | null): ObservationLeadStatus {
  return parseEnum(value, OBSERVATION_LEAD_STATUSES, 'open');
}

export async function createObservationAction(
  _prev: ObservationFormState,
  formData: FormData,
): Promise<ObservationFormState> {
  try {
    const subjectType = parseRequiredEnum(
      parseOptionalString(formData.get('subject_type')),
      OBSERVATION_SUBJECTS,
      'Subject',
    ) as ObservationSubject;

    const category = parseRequiredEnum(
      parseOptionalString(formData.get('category')),
      OBSERVATION_CATEGORIES,
      'Category',
    ) as ObservationCategory;

    const summary = parseRequiredString(formData.get('summary'), 'Summary');
    const details = parseOptionalString(formData.get('details'));

    const encounterId = parseOptionalString(formData.get('encounter_id'));
    const encounterPersonId = parseOptionalNumber(formData.get('encounter_person_id'));
    const caseId = parseOptionalNumber(formData.get('case_id'));

    const source = parseEnum(
      parseOptionalString(formData.get('source')),
      OBSERVATION_SOURCE_OPTIONS,
      'staff_observed',
    ) as RecordSource;

    const verificationStatus = parseEnum(
      parseOptionalString(formData.get('verification_status')),
      OBSERVATION_VERIFICATION_OPTIONS,
      'unverified',
    ) as VerificationStatus;

    const subjectPersonIdInput = parseOptionalNumber(formData.get('subject_person_id'));
    const subjectName = parseOptionalString(formData.get('subject_name'));
    const subjectDescription = parseOptionalString(formData.get('subject_description'));
    const lastSeenAt = parseOptionalDatetime(formData.get('last_seen_at'), 'Last seen');
    const lastSeenLocation = parseOptionalString(formData.get('last_seen_location'));

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);

    if (!access || !access.canAccessOpsFrontline) {
      return { status: 'error', message: 'You do not have permission to log observations.' };
    }

    assertOrganizationSelected(access, 'Select an acting organization before logging observations.');

    const allowedSensitivities = resolveAllowedSensitivities(access);
    const requestedSensitivity = parseEnum(
      parseOptionalString(formData.get('sensitivity_level')),
      SENSITIVITY_OPTIONS,
      'standard',
    );
    if (!allowedSensitivities.includes(requestedSensitivity)) {
      return { status: 'error', message: 'You do not have permission to log observations at that sensitivity level.' };
    }

    const visibilityScope = parseEnum(
      parseOptionalString(formData.get('visibility_scope')),
      VISIBILITY_OPTIONS,
      'internal_to_org',
    ) as VisibilityScope;

    let personId: number | null = null;
    let subjectPersonId: number | null = null;
    let resolvedSubjectName: string | null = subjectName ?? null;
    let resolvedSubjectDescription: string | null = subjectDescription ?? null;
    let resolvedVisibility: VisibilityScope = visibilityScope;
    let leadStatus: ObservationLeadStatus | null = null;
    let leadExpiresAt: string | null = null;

    const followUpNeeded = formData.get('follow_up_needed') === 'on';

    if (subjectType === 'this_client') {
      if (!encounterPersonId) {
        return { status: 'error', message: 'This observation must be tied to the encounter client.' };
      }
      personId = encounterPersonId;
      subjectPersonId = null;
      resolvedVisibility = visibilityScope;
      leadStatus = null;
      leadExpiresAt = null;
      resolvedSubjectName = null;
      resolvedSubjectDescription = null;
    } else if (subjectType === 'known_person') {
      if (!subjectPersonIdInput) {
        return { status: 'error', message: 'Select the known person this observation is about.' };
      }
      personId = subjectPersonIdInput;
      subjectPersonId = subjectPersonIdInput;
      resolvedVisibility = 'internal_to_org';
      leadStatus = null;
      leadExpiresAt = null;
    } else if (subjectType === 'named_unlinked') {
      if (!resolvedSubjectName) {
        return { status: 'error', message: 'Add the person’s name or identifier.' };
      }
      personId = null;
      subjectPersonId = null;
      resolvedVisibility = 'internal_to_org';
      leadStatus = 'open';
      leadExpiresAt = resolveLeadExpiry(new Date());
    } else if (subjectType === 'unidentified') {
      if (!resolvedSubjectDescription) {
        return { status: 'error', message: 'Describe the unidentified person.' };
      }
      personId = null;
      subjectPersonId = null;
      resolvedVisibility = 'internal_to_org';
      leadStatus = 'open';
      leadExpiresAt = resolveLeadExpiry(new Date());
    }

    const reporterPersonId = source === 'client_reported' ? encounterPersonId ?? null : null;
    const followUpPersonId = followUpNeeded ? personId : null;

    if (followUpNeeded && !followUpPersonId) {
      return { status: 'error', message: 'Follow-up tasks require a known person.' };
    }

    const { data, error } = await supabase
      .schema('case_mgmt')
      .from('observations')
      .insert({
        person_id: personId,
        case_id: subjectType === 'this_client' ? caseId ?? null : null,
        encounter_id: encounterId ?? null,
        owning_org_id: access.organizationId,
        recorded_by_profile_id: access.profile.id,
        recorded_at: new Date().toISOString(),
        source,
        verification_status: verificationStatus,
        sensitivity_level: requestedSensitivity,
        visibility_scope: resolvedVisibility,
        category,
        summary,
        details: details ?? null,
        subject_type: subjectType,
        subject_person_id: subjectPersonId,
        subject_name: resolvedSubjectName ?? null,
        subject_description: resolvedSubjectDescription ?? null,
        last_seen_at: lastSeenAt ?? null,
        last_seen_location: lastSeenLocation ?? null,
        reporter_person_id: reporterPersonId,
        lead_status: leadStatus,
        lead_expires_at: leadExpiresAt,
        created_by: access.userId,
      })
      .select('id')
      .single();

    if (error || !data) {
      return { status: 'error', message: error?.message ?? 'Unable to save the observation.' };
    }

    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'observation_created',
      entityType: 'case_mgmt.observations',
      entityRef: buildEntityRef({ schema: 'case_mgmt', table: 'observations', id: data.id }),
      meta: {
        category,
        subject_type: subjectType,
        encounter_id: encounterId,
        person_id: personId,
        reporter_person_id: reporterPersonId,
      },
    });

    if (followUpNeeded && followUpPersonId) {
      const followUpTitle = parseOptionalString(formData.get('follow_up_title')) ?? `Follow up: ${summary}`;
      const followUpNotes = parseOptionalString(formData.get('follow_up_notes')) ?? details ?? null;
      const followUpDueAt = parseOptionalDatetime(formData.get('follow_up_due_at'), 'Follow-up due date');
      const followUpPriority = parseEnum(
        parseOptionalString(formData.get('follow_up_priority')),
        TASK_PRIORITY_OPTIONS,
        'normal',
      );

      await createTask({
        personId: followUpPersonId,
        caseId: subjectType === 'this_client' ? caseId ?? null : null,
        encounterId: encounterId ?? null,
        title: followUpTitle,
        description: followUpNotes,
        dueAt: followUpDueAt ?? null,
        priority: followUpPriority,
        visibilityScope: resolvedVisibility,
        sensitivityLevel: requestedSensitivity,
        sourceType: 'observation',
        sourceId: data.id,
      });
    }

    if (encounterId) {
      revalidatePath(`/ops/encounters/${encounterId}`);
    }
    if (personId) {
      revalidatePath(`/ops/clients/${personId}?tab=overview`);
      revalidatePath(`/ops/clients/${personId}?tab=timeline`);
    }
    revalidatePath('/ops/clients?view=activity');
    revalidatePath('/ops/clients?view=leads');

    return { status: 'success', observationId: data.id };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to save observation.' };
  }
}

export async function updateObservationLeadStatusAction(formData: FormData): Promise<void> {
  const observationId = parseOptionalString(formData.get('observation_id'));
  if (!observationId) {
    throw new Error('Observation not found.');
  }
  const status = parseLeadStatus(parseOptionalString(formData.get('lead_status')));
  const encounterId = parseOptionalString(formData.get('encounter_id'));

  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);
  if (!access || !access.canAccessOpsFrontline) {
    throw new Error('You do not have permission to update observations.');
  }

  assertOrganizationSelected(access, 'Select an acting organization before updating observations.');

  const { data: observation, error } = await supabase
    .schema('case_mgmt')
    .from('observations')
    .select('id, subject_type, lead_expires_at, person_id, encounter_id')
    .eq('id', observationId)
    .maybeSingle();

  if (error || !observation) {
    throw new Error('Unable to load that observation.');
  }

  if (!['named_unlinked', 'unidentified'].includes(observation.subject_type)) {
    throw new Error('Lead status can only be updated for unresolved leads.');
  }

  const leadExpiresAt = observation.lead_expires_at ?? resolveLeadExpiry(new Date());

  const { error: updateError } = await supabase
    .schema('case_mgmt')
    .from('observations')
    .update({
      lead_status: status,
      lead_expires_at: leadExpiresAt,
      updated_at: new Date().toISOString(),
      updated_by: access.userId,
    })
    .eq('id', observationId);

  if (updateError) {
    throw new Error(updateError.message ?? 'Unable to update lead status.');
  }

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: 'observation_lead_status_updated',
    entityType: 'case_mgmt.observations',
    entityRef: buildEntityRef({ schema: 'case_mgmt', table: 'observations', id: observationId }),
    meta: {
      lead_status: status,
    },
  });

  if (encounterId ?? observation.encounter_id) {
    revalidatePath(`/ops/encounters/${encounterId ?? observation.encounter_id}`);
  }
  if (observation.person_id) {
    revalidatePath(`/ops/clients/${observation.person_id}?tab=overview`);
    revalidatePath(`/ops/clients/${observation.person_id}?tab=timeline`);
  }
  revalidatePath('/ops/clients?view=leads');
}

export async function resolveObservationSubjectAction(formData: FormData): Promise<void> {
  const observationId = parseOptionalString(formData.get('observation_id'));
  const subjectPersonId = parseOptionalNumber(formData.get('subject_person_id'));

  if (!observationId || !subjectPersonId) {
    throw new Error('Missing observation or person selection.');
  }

  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);
  if (!access || !access.canAccessOpsFrontline) {
    throw new Error('You do not have permission to update observations.');
  }

  assertOrganizationSelected(access, 'Select an acting organization before updating observations.');

  const { data: observation, error } = await supabase
    .schema('case_mgmt')
    .from('observations')
    .select('id, subject_type, person_id, encounter_id')
    .eq('id', observationId)
    .maybeSingle();

  if (error || !observation) {
    throw new Error('Unable to load that observation.');
  }

  if (!['named_unlinked', 'unidentified'].includes(observation.subject_type)) {
    throw new Error('Only unidentified leads can be resolved to a person.');
  }

  const { data: personRow } = await supabase
    .schema('core')
    .from('people')
    .select('first_name, last_name')
    .eq('id', subjectPersonId)
    .maybeSingle();

  const resolvedName = personRow
    ? `${personRow.first_name ?? ''} ${personRow.last_name ?? ''}`.trim() || null
    : null;

  const { error: updateError } = await supabase
    .schema('case_mgmt')
    .from('observations')
    .update({
      subject_type: 'known_person',
      person_id: subjectPersonId,
      subject_person_id: subjectPersonId,
      subject_name: resolvedName,
      lead_status: null,
      lead_expires_at: null,
      visibility_scope: 'internal_to_org',
      updated_at: new Date().toISOString(),
      updated_by: access.userId,
    })
    .eq('id', observationId);

  if (updateError) {
    throw new Error(updateError.message ?? 'Unable to resolve this observation.');
  }

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: 'observation_resolved_to_person',
    entityType: 'case_mgmt.observations',
    entityRef: buildEntityRef({ schema: 'case_mgmt', table: 'observations', id: observationId }),
    meta: {
      subject_person_id: subjectPersonId,
    },
  });

  if (observation.encounter_id) {
    revalidatePath(`/ops/encounters/${observation.encounter_id}`);
  }
  revalidatePath(`/ops/clients/${subjectPersonId}?tab=overview`);
  revalidatePath(`/ops/clients/${subjectPersonId}?tab=timeline`);
  revalidatePath('/ops/clients?view=leads');
}

export async function promoteObservationToMedicalAction(formData: FormData): Promise<void> {
  const observationId = parseOptionalString(formData.get('observation_id'));
  if (!observationId) {
    throw new Error('Missing observation.');
  }

  const episodeType = parseRequiredString(formData.get('episode_type'), 'Episode type');
  const primaryCondition = parseRequiredString(formData.get('primary_condition'), 'Primary condition');
  const episodeDate = parseRequiredDate(formData.get('episode_date'), 'Episode date');
  const assessmentSummary = parseOptionalString(formData.get('assessment_summary'));
  const locationOccurred = parseOptionalString(formData.get('location_occurred'));

  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);
  if (!access || !access.canAccessOpsFrontline) {
    throw new Error('You do not have permission to promote observations.');
  }
  assertOrganizationSelected(access, 'Select an acting organization before promoting observations.');
  assertObservationPromotionAccess(access);

  const { data: observation, error } = await supabase
    .schema('case_mgmt')
    .from('observations')
    .select('id, person_id, case_id, encounter_id, owning_org_id, summary, details, source, verification_status, visibility_scope, sensitivity_level, subject_type, lead_status')
    .eq('id', observationId)
    .maybeSingle();

  if (error || !observation) {
    throw new Error('Unable to load that observation.');
  }

  if (!observation.person_id) {
    throw new Error('Medical promotions require a known person.');
  }

  const { data: episode, error: insertError } = await supabase
    .schema('core')
    .from('medical_episodes')
    .insert({
      person_id: observation.person_id,
      case_id: observation.case_id ?? null,
      encounter_id: observation.encounter_id ?? null,
      owning_org_id: access.organizationId,
      recorded_by_profile_id: access.profile.id,
      recorded_at: new Date().toISOString(),
      source: observation.source,
      verification_status: observation.verification_status,
      sensitivity_level: observation.sensitivity_level,
      visibility_scope: observation.visibility_scope,
      episode_type: episodeType,
      primary_condition: primaryCondition,
      episode_date: episodeDate,
      assessment_summary: assessmentSummary ?? observation.details ?? null,
      location_occurred: locationOccurred ?? null,
      created_by: access.userId,
    })
    .select('id')
    .single();

  if (insertError || !episode) {
    throw new Error(insertError?.message ?? 'Unable to create the medical episode.');
  }

  const { data: medicalPromotion, error: medicalPromotionError } = await supabase
    .schema('case_mgmt')
    .from('observation_promotions')
    .insert({
      observation_id: observationId,
      promotion_type: 'medical_episode',
      target_id: episode.id,
      target_label: primaryCondition,
      created_by: access.userId,
      created_by_profile_id: access.profile.id,
    })
    .select('id')
    .single();

  if (medicalPromotionError || !medicalPromotion) {
    throw new Error(medicalPromotionError?.message ?? 'Unable to log the promotion.');
  }

  if (observation.lead_status) {
    await supabase
      .schema('case_mgmt')
      .from('observations')
      .update({
        lead_status: 'in_progress',
        updated_at: new Date().toISOString(),
        updated_by: access.userId,
      })
      .eq('id', observationId);
  }

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: 'observation_promoted_medical',
    entityType: 'case_mgmt.observation_promotions',
    entityRef: buildEntityRef({ schema: 'case_mgmt', table: 'observation_promotions', id: medicalPromotion.id }),
    meta: {
      observation_id: observationId,
      medical_episode_id: episode.id,
    },
  });

  revalidatePath(`/ops/clients/${observation.person_id}?tab=overview`);
  revalidatePath(`/ops/clients/${observation.person_id}?tab=timeline`);
  if (observation.encounter_id) {
    revalidatePath(`/ops/encounters/${observation.encounter_id}`);
  }
  revalidatePath('/ops/incidents');
  revalidatePath('/ops/clients?view=leads');
}

export async function promoteObservationToIncidentAction(formData: FormData): Promise<void> {
  const observationId = parseOptionalString(formData.get('observation_id'));
  if (!observationId) {
    throw new Error('Missing observation.');
  }

  const location = parseRequiredString(formData.get('incident_location'), 'Incident location');
  const description = parseOptionalString(formData.get('incident_description'));
  const incidentType = parseEnum(
    parseOptionalString(formData.get('incident_type')),
    INCIDENT_TYPE_OPTIONS,
    'other',
  ) as IncidentType;

  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);
  if (!access || !access.canAccessOpsFrontline) {
    throw new Error('You do not have permission to promote observations.');
  }
  assertOrganizationSelected(access, 'Select an acting organization before promoting observations.');
  assertObservationPromotionAccess(access);

  const { data: observation, error } = await supabase
    .schema('case_mgmt')
    .from('observations')
    .select('id, encounter_id, summary, details, lead_status, person_id')
    .eq('id', observationId)
    .maybeSingle();

  if (error || !observation) {
    throw new Error('Unable to load that observation.');
  }

  const { data: incident, error: insertError } = await supabase
    .schema('case_mgmt')
    .from('incidents')
    .insert({
      owning_organization_id: access.organizationId,
      incident_type: incidentType,
      description: description ?? observation.details ?? observation.summary,
      status: 'open',
      location,
      reported_by: 'Observation',
      created_by: access.userId,
      updated_by: access.userId,
    })
    .select('id')
    .single();

  if (insertError || !incident) {
    throw new Error(insertError?.message ?? 'Unable to create the incident.');
  }

  const { data: incidentPromotion, error: incidentPromotionError } = await supabase
    .schema('case_mgmt')
    .from('observation_promotions')
    .insert({
      observation_id: observationId,
      promotion_type: 'safety_incident',
      target_id: String(incident.id),
      target_label: incidentType,
      created_by: access.userId,
      created_by_profile_id: access.profile.id,
    })
    .select('id')
    .single();

  if (incidentPromotionError || !incidentPromotion) {
    throw new Error(incidentPromotionError?.message ?? 'Unable to log the promotion.');
  }

  if (observation.lead_status) {
    await supabase
      .schema('case_mgmt')
      .from('observations')
      .update({
        lead_status: 'in_progress',
        updated_at: new Date().toISOString(),
        updated_by: access.userId,
      })
      .eq('id', observationId);
  }

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: 'observation_promoted_incident',
    entityType: 'case_mgmt.observation_promotions',
    entityRef: buildEntityRef({ schema: 'case_mgmt', table: 'observation_promotions', id: incidentPromotion.id }),
    meta: {
      observation_id: observationId,
      incident_id: incident.id,
    },
  });

  if (observation.person_id) {
    revalidatePath(`/ops/clients/${observation.person_id}?tab=overview`);
    revalidatePath(`/ops/clients/${observation.person_id}?tab=timeline`);
  }
  if (observation.encounter_id) {
    revalidatePath(`/ops/encounters/${observation.encounter_id}`);
  }
  revalidatePath('/ops/clients?view=leads');
}

export async function promoteObservationToReferralAction(formData: FormData): Promise<void> {
  const observationId = parseOptionalString(formData.get('observation_id'));
  if (!observationId) {
    throw new Error('Missing observation.');
  }

  const referredToName = parseRequiredString(formData.get('referred_to_name'), 'Referral destination');
  const summaryOverride = parseOptionalString(formData.get('referral_summary'));
  const detailsOverride = parseOptionalString(formData.get('referral_details'));

  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);
  if (!access || !access.canAccessOpsFrontline) {
    throw new Error('You do not have permission to promote observations.');
  }
  assertOrganizationSelected(access, 'Select an acting organization before promoting observations.');
  assertObservationPromotionAccess(access);

  const { data: observation, error } = await supabase
    .schema('case_mgmt')
    .from('observations')
    .select('id, person_id, case_id, encounter_id, summary, details, source, verification_status, sensitivity_level, visibility_scope, lead_status')
    .eq('id', observationId)
    .maybeSingle();

  if (error || !observation) {
    throw new Error('Unable to load that observation.');
  }

  if (!observation.person_id) {
    throw new Error('Referrals require a known person.');
  }


  const { data: referral, error: insertError } = await supabase
    .schema('case_mgmt')
    .from('referrals')
    .insert({
      person_id: observation.person_id,
      case_id: observation.case_id ?? null,
      encounter_id: observation.encounter_id ?? null,
      owning_org_id: access.organizationId,
      referred_to_name: referredToName ?? null,
      referral_status: 'open',
      summary: summaryOverride ?? observation.summary,
      details: detailsOverride ?? observation.details ?? null,
      recorded_by_profile_id: access.profile.id,
      recorded_at: new Date().toISOString(),
      source: observation.source,
      verification_status: observation.verification_status,
      sensitivity_level: observation.sensitivity_level,
      visibility_scope: observation.visibility_scope,
      created_by: access.userId,
    })
    .select('id')
    .single();

  if (insertError || !referral) {
    throw new Error(insertError?.message ?? 'Unable to create the referral.');
  }

  const { data: referralPromotion, error: referralPromotionError } = await supabase
    .schema('case_mgmt')
    .from('observation_promotions')
    .insert({
      observation_id: observationId,
      promotion_type: 'referral',
      target_id: referral.id,
      target_label: referredToName ?? null,
      created_by: access.userId,
      created_by_profile_id: access.profile.id,
    })
    .select('id')
    .single();

  if (referralPromotionError || !referralPromotion) {
    throw new Error(referralPromotionError?.message ?? 'Unable to log the promotion.');
  }

  if (observation.lead_status) {
    await supabase
      .schema('case_mgmt')
      .from('observations')
      .update({
        lead_status: 'in_progress',
        updated_at: new Date().toISOString(),
        updated_by: access.userId,
      })
      .eq('id', observationId);
  }

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: 'observation_promoted_referral',
    entityType: 'case_mgmt.observation_promotions',
    entityRef: buildEntityRef({ schema: 'case_mgmt', table: 'observation_promotions', id: referralPromotion.id }),
    meta: {
      observation_id: observationId,
      referral_id: referral.id,
    },
  });

  revalidatePath(`/ops/clients/${observation.person_id}?tab=overview`);
  revalidatePath(`/ops/clients/${observation.person_id}?tab=timeline`);
  if (observation.encounter_id) {
    revalidatePath(`/ops/encounters/${observation.encounter_id}`);
  }
  revalidatePath('/ops/clients?view=leads');
}
