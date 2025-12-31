'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { assertOrganizationSelected, loadPortalAccess } from '@/lib/portal-access';
import { buildEntityRef, logAuditEvent } from '@/lib/audit';

export type DistributionFormState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  distributionId?: string;
};

function parseOptionalString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function parseRequiredString(value: FormDataEntryValue | null, label: string): string {
  const parsed = parseOptionalString(value);
  if (!parsed) throw new Error(`${label} is required.`);
  return parsed;
}

function parseOptionalNumber(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function distributeInventoryAction(
  _prev: DistributionFormState,
  formData: FormData,
): Promise<DistributionFormState> {
  try {
    const personId = parseOptionalNumber(formData.get('person_id'));
    if (!personId) return { status: 'error', message: 'Select a person for this distribution.' };

    const encounterId = parseOptionalString(formData.get('encounter_id'));
    const locationId = parseRequiredString(formData.get('location_id'), 'Location');
    const notes = parseOptionalString(formData.get('notes'));

    const itemIds = formData.getAll('item_id').map((value) => String(value));
    const qtys = formData.getAll('qty').map((value) => String(value));
    const unitCosts = formData.getAll('unit_cost').map((value) => String(value));

    const itemsPayload = itemIds
      .map((itemId, index) => {
        const qty = Number.parseInt(qtys[index] ?? '0', 10);
        const unitCost = unitCosts[index] ? Number.parseFloat(unitCosts[index]) : null;
        if (!itemId || !Number.isFinite(qty) || qty <= 0) return null;
        return {
          item_id: itemId,
          qty,
          unit_cost: Number.isFinite(unitCost ?? NaN) ? unitCost : null,
        };
      })
      .filter(Boolean) as Array<{ item_id: string; qty: number; unit_cost: number | null }>;

    if (itemsPayload.length === 0) {
      return { status: 'error', message: 'Add at least one item with a quantity.' };
    }

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);

    if (!access || !access.canAccessInventoryOps) {
      return { status: 'error', message: 'You do not have permission to distribute supplies.' };
    }

    assertOrganizationSelected(access, 'Select an acting organization before distributing supplies.');

    const payload = {
      location_id: locationId,
      client_id: String(personId),
      person_id: String(personId),
      encounter_id: encounterId ?? null,
      provider_org_id: access.organizationId,
      notes: notes ?? null,
      items: itemsPayload,
    };

    const { data, error } = await supabase.schema('inventory').rpc('distribute_items', {
      p_payload: payload,
    });

    if (error || !data) {
      return { status: 'error', message: error?.message ?? 'Unable to distribute supplies.' };
    }

    const distributionId = String(data);

    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'inventory_distribution_created',
      entityType: 'inventory.distributions',
      entityRef: buildEntityRef({ schema: 'inventory', table: 'distributions', id: distributionId }),
      meta: {
        person_id: personId,
        encounter_id: encounterId,
        location_id: locationId,
        items: itemsPayload,
      },
    });

    revalidatePath(`/ops/clients/${personId}?tab=overview`);
    if (encounterId) {
      revalidatePath(`/ops/encounters/${encounterId}`);
    }

    return { status: 'success', message: 'Supplies distributed.', distributionId };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to distribute supplies.' };
  }
}
