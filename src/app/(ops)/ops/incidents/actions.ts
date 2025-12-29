'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { loadPortalAccess } from '@/lib/portal-access';
import { buildEntityRef, logAuditEvent } from '@/lib/audit';
import { getBoolean, getString, parseEnum } from '@/lib/server-actions/form';
import { DISPATCH_PRIORITY_OPTIONS, INCIDENT_TYPE_OPTIONS, formatCfsLabel } from '@/lib/cfs/constants';

const incidentDetailPath = (incidentId: number | string) => `/ops/incidents/${incidentId}`;

export type IncidentActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
};

export const initialIncidentActionState: IncidentActionState = { status: 'idle' };

const INCIDENT_STATUS_OPTIONS = ['draft', 'open', 'in_progress', 'resolved', 'closed'] as const;

type IncidentStatus = (typeof INCIDENT_STATUS_OPTIONS)[number];

function parseOptionalDatetime(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export async function updateIncidentAction(
  _prevState: IncidentActionState,
  formData: FormData,
): Promise<IncidentActionState> {
  try {
    const incidentIdRaw = getString(formData, 'incident_id', { required: true });
    const incidentId = Number.parseInt(incidentIdRaw ?? '', 10);
    if (!Number.isFinite(incidentId)) {
      return { status: 'error', message: 'Incident context missing.' };
    }

    const incidentType = parseEnum(getString(formData, 'incident_type'), INCIDENT_TYPE_OPTIONS);
    const incidentStatus = parseEnum(getString(formData, 'status'), INCIDENT_STATUS_OPTIONS) ?? 'open';
    const dispatchPriority = parseEnum(getString(formData, 'dispatch_priority'), DISPATCH_PRIORITY_OPTIONS);
    const description = getString(formData, 'description');
    const location = getString(formData, 'location');
    const actionsTaken = getString(formData, 'actions_taken');
    const servicesOffered = getString(formData, 'services_offered');
    const servicesProvided = getString(formData, 'services_provided');
    const resourcesDistributed = getString(formData, 'resources_distributed');
    const followUpRequired = getBoolean(formData, 'follow_up_required');
    const followUpDate = getString(formData, 'follow_up_date');
    const followUpNotes = getString(formData, 'follow_up_notes');
    const dispatchAt = parseOptionalDatetime(getString(formData, 'dispatch_at'));
    const firstAssignedAt = parseOptionalDatetime(getString(formData, 'first_unit_assigned_at'));
    const firstArrivedAt = parseOptionalDatetime(getString(formData, 'first_unit_arrived_at'));
    const clearedAt = parseOptionalDatetime(getString(formData, 'incident_cleared_at'));

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);

    if (!access || (!access.canDispatchCfs && !access.canUpdateCfs)) {
      return { status: 'error', message: 'You do not have permission to update incidents.' };
    }

    const updatePayload: Record<string, unknown> = {
      incident_type: incidentType,
      status: incidentStatus as IncidentStatus,
      dispatch_priority: dispatchPriority,
      description,
      location,
      actions_taken: actionsTaken,
      services_offered: servicesOffered ? servicesOffered.split(',').map((entry) => entry.trim()).filter(Boolean) : null,
      services_provided: servicesProvided ? servicesProvided.split(',').map((entry) => entry.trim()).filter(Boolean) : null,
      resources_distributed: resourcesDistributed ? resourcesDistributed.split(',').map((entry) => entry.trim()).filter(Boolean) : null,
      follow_up_required: followUpRequired,
      follow_up_date: followUpDate,
      follow_up_notes: followUpNotes,
      dispatch_at: dispatchAt,
      first_unit_assigned_at: firstAssignedAt,
      first_unit_arrived_at: firstArrivedAt,
      incident_cleared_at: clearedAt,
      updated_at: new Date().toISOString(),
      updated_by: access.userId,
    };

    const { error } = await supabase
      .schema('case_mgmt')
      .from('incidents')
      .update(updatePayload)
      .eq('id', incidentId);

    if (error) {
      throw error;
    }

    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'incident_updated',
      entityType: 'case_mgmt.incidents',
      entityRef: buildEntityRef({ schema: 'case_mgmt', table: 'incidents', id: incidentId }),
      meta: { status: incidentStatus, incident_type: incidentType, dispatch_priority: dispatchPriority },
    });

    revalidatePath(incidentDetailPath(incidentId));
    return { status: 'success', message: `Incident updated (${formatCfsLabel(incidentStatus)}).` };
  } catch (error) {
    console.error('updateIncidentAction error', error);
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to update incident.' };
  }
}
