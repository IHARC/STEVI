'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { assertOrganizationSelected, loadPortalAccess } from '@/lib/portal-access';
import { logAuditEvent, buildEntityRef } from '@/lib/audit';
import type { EncounterSummary } from '@/lib/encounters/types';

export type EncounterFormState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  encounterId?: string;
};

function parseOptionalNumber(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function parseOptionalDateTime(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Provide a valid start time.');
  }
  return parsed.toISOString();
}

function parseEnum<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  if (!value) return fallback;
  const normalized = value as T;
  return allowed.includes(normalized) ? normalized : fallback;
}

export async function createEncounter(
  input: {
    personId: number;
    caseId: number | null;
    encounterType: string;
    startedAt?: string | null;
    locationContext?: string | null;
    programContext?: string | null;
    summary?: string | null;
    notes?: string | null;
    visibilityScope?: string;
    sensitivityLevel?: string;
  },
): Promise<EncounterSummary> {
  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessOpsFrontline) {
    throw new Error('You need staff access to create encounters.');
  }

  assertOrganizationSelected(access, 'Select an acting organization before creating an encounter.');

  const encounterType = parseEnum(
    input.encounterType,
    ['outreach', 'intake', 'program', 'appointment', 'other'] as const,
    'outreach',
  );
  const visibilityScope = parseEnum(
    input.visibilityScope ?? null,
    ['internal_to_org', 'shared_via_consent'] as const,
    'internal_to_org',
  );
  const sensitivityLevel = parseEnum(
    input.sensitivityLevel ?? null,
    ['standard', 'sensitive', 'high', 'restricted'] as const,
    'standard',
  );

  const { data, error } = await supabase
    .schema('case_mgmt')
    .from('encounters')
    .insert({
      person_id: input.personId,
      case_id: input.caseId,
      owning_org_id: access.organizationId,
      encounter_type: encounterType,
      started_at: input.startedAt ?? new Date().toISOString(),
      location_context: input.locationContext ?? null,
      program_context: input.programContext ?? null,
      summary: input.summary ?? null,
      notes: input.notes ?? null,
      recorded_by_profile_id: access.profile.id,
      recorded_at: new Date().toISOString(),
      visibility_scope: visibilityScope,
      sensitivity_level: sensitivityLevel,
      created_by: access.userId,
    })
    .select('*')
    .single();

  if (error || !data) {
    console.error('Failed to create encounter', error);
    throw new Error('Unable to create the encounter right now.');
  }

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: 'encounter_created',
    entityType: 'case_mgmt.encounters',
    entityRef: buildEntityRef({ schema: 'case_mgmt', table: 'encounters', id: data.id }),
    meta: {
      person_id: data.person_id,
      case_id: data.case_id,
      encounter_type: data.encounter_type,
      owning_org_id: data.owning_org_id,
    },
  });

  return {
    id: data.id,
    personId: data.person_id,
    caseId: data.case_id ?? null,
    owningOrgId: data.owning_org_id,
    encounterType: data.encounter_type,
    startedAt: data.started_at,
    endedAt: data.ended_at ?? null,
    locationContext: data.location_context ?? null,
    programContext: data.program_context ?? null,
    summary: data.summary ?? null,
    notes: data.notes ?? null,
    visibilityScope: data.visibility_scope,
    sensitivityLevel: data.sensitivity_level,
  };
}

export async function createEncounterAction(
  _prev: EncounterFormState,
  formData: FormData,
): Promise<EncounterFormState> {
  try {
    const personId = parseOptionalNumber(formData.get('person_id'));
    if (!personId) {
      return { status: 'error', message: 'Select a person to start the encounter.' };
    }

    const caseId = parseOptionalNumber(formData.get('case_id'));
    const encounterType = parseOptionalString(formData.get('encounter_type')) ?? 'outreach';
    const startedAt = parseOptionalDateTime(formData.get('started_at'));
    const locationContext = parseOptionalString(formData.get('location_context'));
    const programContext = parseOptionalString(formData.get('program_context'));
    const summary = parseOptionalString(formData.get('summary'));
    const notes = parseOptionalString(formData.get('notes'));
    const visibilityScope = parseOptionalString(formData.get('visibility_scope')) ?? 'internal_to_org';
    const sensitivityLevel = parseOptionalString(formData.get('sensitivity_level')) ?? 'standard';

    const encounter = await createEncounter({
      personId,
      caseId,
      encounterType,
      startedAt: startedAt ?? undefined,
      locationContext,
      programContext,
      summary,
      notes,
      visibilityScope,
      sensitivityLevel,
    });

    revalidatePath(`/ops/encounters/${encounter.id}`);
    revalidatePath(`/ops/clients/${personId}?tab=overview`);
    revalidatePath('/ops/clients?view=activity');

    return { status: 'success', encounterId: encounter.id };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to create encounter.' };
  }
}

export async function closeEncounterAction(encounterId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessOpsFrontline) {
    throw new Error('You need staff access to close encounters.');
  }

  const endedAt = new Date().toISOString();
  const { data, error } = await supabase
    .schema('case_mgmt')
    .from('encounters')
    .update({ ended_at: endedAt, updated_at: endedAt, updated_by: access.userId })
    .eq('id', encounterId)
    .select('id, person_id, case_id')
    .single();

  if (error || !data) {
    throw new Error('Unable to close the encounter right now.');
  }

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: 'encounter_closed',
    entityType: 'case_mgmt.encounters',
    entityRef: buildEntityRef({ schema: 'case_mgmt', table: 'encounters', id: encounterId }),
    meta: {
      person_id: data.person_id,
      case_id: data.case_id,
      ended_at: endedAt,
    },
  });

  revalidatePath(`/ops/encounters/${encounterId}`);
  revalidatePath(`/ops/clients/${data.person_id}?tab=overview`);
}
