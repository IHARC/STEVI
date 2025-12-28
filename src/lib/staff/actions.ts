'use server';

import { revalidatePath } from 'next/cache';
import { buildEntityRef, logAuditEvent } from '@/lib/audit';
import { assertOrganizationSelected, loadPortalAccess } from '@/lib/portal-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { resolveCostCategoryIdByName, resolveServiceCatalogEntry, resolveStaffRate } from '@/lib/costs/queries';

export type OutreachFormState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
};

const MAX_TITLE_LENGTH = 160;
const MAX_SUMMARY_LENGTH = 1200;
const MAX_LOCATION_LENGTH = 240;

function parseOptionalNumber(value: FormDataEntryValue | null, label: string): number | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be greater than 0.`);
  }
  return parsed;
}

function parseOptionalString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

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
  const durationMinutes = parseOptionalNumber(formData.get('duration_minutes'), 'Duration');
  const serviceCode = parseOptionalString(formData.get('service_code'));
  const units = parseOptionalNumber(formData.get('units'), 'Units');
  const costOverride = parseOptionalNumber(formData.get('cost_override'), 'Cost override');
  const costCategory = parseOptionalString(formData.get('cost_category'));
  const uom = parseOptionalString(formData.get('uom'));
  const staffRole = parseOptionalString(formData.get('staff_role'));

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

  if (!access || !access.canAccessOpsFrontline) {
    return { status: 'error', message: 'You need staff access to log outreach.' };
  }

  assertOrganizationSelected(access, 'Select an acting organization before logging outreach.');

  if (durationMinutes && !staffRole) {
    return { status: 'error', message: 'Select a staff role to price staff time.' };
  }

  if (serviceCode && !units) {
    return { status: 'error', message: 'Provide the number of units for the selected service.' };
  }

  if (costOverride && !durationMinutes && !serviceCode && !costCategory) {
    return { status: 'error', message: 'Select a cost category when overriding the amount.' };
  }

  const hasCostSignal = Boolean(costOverride || durationMinutes || serviceCode);
  const costMetadata = {
    duration_minutes: durationMinutes ?? undefined,
    service_code: serviceCode ?? undefined,
    units: units ?? undefined,
    cost_override: costOverride ?? undefined,
    cost_category: costCategory ?? undefined,
    uom: uom ?? undefined,
    staff_role: staffRole ?? undefined,
  };

  const core = supabase.schema('core');
  const { data: activityRow, error } = await core
    .from('people_activities')
    .insert({
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
        ...costMetadata,
      },
      created_by: access.userId,
      provider_profile_id: access.profile.id,
      provider_org_id: access.organizationId,
    })
    .select('id')
    .single();

  if (error || !activityRow) {
    return { status: 'error', message: 'Unable to save outreach right now.' };
  }

  if (hasCostSignal) {
    try {
      const occurredAt = timestamp.toISOString();
      let costAmount = 0;
      let quantity: number | null = null;
      let unitCost: number | null = null;
      let resolvedUom: string | null = uom ?? null;
      let costCategoryId: string | null = null;

      if (costOverride) {
        costAmount = costOverride;
        if (costCategory) {
          costCategoryId = await resolveCostCategoryIdByName(supabase, costCategory);
        }
      } else if (durationMinutes) {
        const rate = await resolveStaffRate(supabase, access.organizationId, staffRole ?? '', occurredAt);
        const hours = durationMinutes / 60;
        unitCost = Number(rate.hourly_rate);
        costAmount = Number((hours * unitCost).toFixed(2));
        quantity = Number(hours.toFixed(3));
        resolvedUom = resolvedUom ?? 'hour';
        costCategoryId = costCategory
          ? await resolveCostCategoryIdByName(supabase, costCategory)
          : await resolveCostCategoryIdByName(supabase, 'staff_time');
      } else if (serviceCode) {
        const service = await resolveServiceCatalogEntry(supabase, serviceCode);
        const unitsValue = units ?? 0;
        unitCost = Number(service.unit_cost);
        costAmount = Number((unitsValue * unitCost).toFixed(2));
        quantity = unitsValue;
        resolvedUom = resolvedUom ?? service.unit_type;
        if (costCategory) {
          costCategoryId = await resolveCostCategoryIdByName(supabase, costCategory);
        } else if (service.default_category_id) {
          costCategoryId = service.default_category_id;
        } else {
          throw new Error('Service catalog entries must include a default cost category.');
        }
      }

      if (costAmount <= 0) {
        throw new Error('Cost amount must be greater than zero.');
      }

      const { data: costRow, error: costError } = await core
        .from('cost_events')
        .insert({
          person_id: personId,
          organization_id: access.organizationId,
          source_type: 'activity',
          source_id: String(activityRow.id),
          occurred_at: occurredAt,
          cost_amount: costAmount,
          currency: 'CAD',
          quantity,
          unit_cost: unitCost,
          uom: resolvedUom,
          cost_category_id: costCategoryId,
          metadata: costMetadata,
          created_by: access.userId,
        })
        .select('id')
        .single();

      if (costError || !costRow) {
        throw costError ?? new Error('Unable to create the cost event.');
      }

      await logAuditEvent(supabase, {
        actorProfileId: access.profile.id,
        action: 'cost_event_created',
        entityType: 'core.cost_events',
        entityRef: buildEntityRef({ schema: 'core', table: 'cost_events', id: costRow.id }),
        meta: {
          source_type: 'activity',
          source_id: activityRow.id,
          person_id: personId,
          organization_id: access.organizationId,
          cost_amount: costAmount,
        },
      });
    } catch (costError) {
      console.error('Unable to create cost event for outreach', costError);
      return { status: 'error', message: 'Outreach saved, but cost capture failed. Please retry.' };
    }
  }

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: 'outreach_contact_logged',
    entityType: 'people_activities',
    entityRef: buildEntityRef({ schema: 'core', table: 'people', id: personId }),
    meta: { person_id: personId, case_id: caseId, via: 'staff_fast_entry' },
  });

  revalidatePath('/ops/clients?view=activity');
  revalidatePath('/ops/programs');

  return { status: 'success', message: 'Outreach saved.' };
}
