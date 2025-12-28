'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { loadPortalAccess, assertOrganizationSelected } from '@/lib/portal-access';
import { logAuditEvent, buildEntityRef } from '@/lib/audit';
import { resolveCostCategoryIdByName } from './queries';

function readRequiredString(formData: FormData, key: string, message: string): string {
  const value = formData.get(key);
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(message);
  }
  return value.trim();
}

function readOptionalString(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function readRequiredNumber(formData: FormData, key: string, message: string): number {
  const raw = readRequiredString(formData, key, message);
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(message);
  }
  return parsed;
}

function readOptionalNumber(formData: FormData, key: string): number | null {
  const raw = readOptionalString(formData, key);
  if (!raw) return null;
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid value for ${key}.`);
  }
  return parsed;
}

function readDate(value: string, message: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(message);
  }
  return parsed.toISOString().slice(0, 10);
}

export async function createStaffRateAction(formData: FormData): Promise<void> {
  const roleName = readRequiredString(formData, 'role_name', 'Role name is required.');
  const hourlyRate = readRequiredNumber(formData, 'hourly_rate', 'Hourly rate must be greater than 0.');
  const effectiveFromRaw = readRequiredString(formData, 'effective_from', 'Effective start date is required.');
  const effectiveToRaw = readOptionalString(formData, 'effective_to');

  const effectiveFrom = readDate(effectiveFromRaw, 'Effective start date is invalid.');
  const effectiveTo = effectiveToRaw ? readDate(effectiveToRaw, 'Effective end date is invalid.') : null;

  if (effectiveTo && effectiveTo < effectiveFrom) {
    throw new Error('Effective end date must be after the start date.');
  }

  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canManageCosts) {
    throw new Error('You do not have permission to manage staff rates.');
  }

  assertOrganizationSelected(access, 'Select an acting organization before managing staff rates.');

  const { data, error } = await supabase
    .schema('core')
    .from('staff_rates')
    .insert({
      org_id: access.organizationId,
      role_name: roleName,
      hourly_rate: hourlyRate,
      effective_from: effectiveFrom,
      effective_to: effectiveTo,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw error ?? new Error('Unable to save the staff rate.');
  }

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: 'cost_staff_rate_created',
    entityType: 'core.staff_rates',
    entityRef: buildEntityRef({ schema: 'core', table: 'staff_rates', id: data.id }),
    meta: {
      organization_id: access.organizationId,
      role_name: roleName,
      hourly_rate: hourlyRate,
      effective_from: effectiveFrom,
      effective_to: effectiveTo,
    },
  });

  revalidatePath(`/ops/organizations/${access.organizationId}?tab=costs`);
}

export async function endStaffRateAction(formData: FormData): Promise<void> {
  const rateId = readRequiredString(formData, 'rate_id', 'Missing staff rate.');
  const effectiveToRaw = readRequiredString(formData, 'effective_to', 'Effective end date is required.');
  const effectiveTo = readDate(effectiveToRaw, 'Effective end date is invalid.');

  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canManageCosts) {
    throw new Error('You do not have permission to update staff rates.');
  }

  assertOrganizationSelected(access, 'Select an acting organization before managing staff rates.');

  const { error } = await supabase
    .schema('core')
    .from('staff_rates')
    .update({ effective_to: effectiveTo })
    .eq('id', rateId)
    .eq('org_id', access.organizationId);

  if (error) {
    throw error;
  }

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: 'cost_staff_rate_ended',
    entityType: 'core.staff_rates',
    entityRef: buildEntityRef({ schema: 'core', table: 'staff_rates', id: rateId }),
    meta: { organization_id: access.organizationId, effective_to: effectiveTo },
  });

  revalidatePath(`/ops/organizations/${access.organizationId}?tab=costs`);
}

export async function createServiceCatalogAction(formData: FormData): Promise<void> {
  const serviceCode = readRequiredString(formData, 'service_code', 'Service code is required.');
  const label = readRequiredString(formData, 'label', 'Service label is required.');
  const unitCost = readRequiredNumber(formData, 'unit_cost', 'Unit cost must be greater than 0.');
  const unitType = readRequiredString(formData, 'unit_type', 'Unit type is required.');
  const categoryName = readRequiredString(formData, 'default_category', 'Select a default cost category.');

  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canManageCosts) {
    throw new Error('You do not have permission to manage the service catalog.');
  }

  const defaultCategoryId = await resolveCostCategoryIdByName(supabase, categoryName);

  const { data, error } = await supabase
    .schema('core')
    .from('service_catalog')
    .insert({
      service_code: serviceCode,
      label,
      unit_cost: unitCost,
      unit_type: unitType,
      default_category_id: defaultCategoryId,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw error ?? new Error('Unable to save the service catalog entry.');
  }

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: 'cost_service_catalog_created',
    entityType: 'core.service_catalog',
    entityRef: buildEntityRef({ schema: 'core', table: 'service_catalog', id: data.id }),
    meta: { service_code: serviceCode, label, unit_cost: unitCost, unit_type: unitType },
  });

  revalidatePath('/ops/reports/costs');
  revalidatePath(`/ops/organizations/${access.organizationId ?? ''}?tab=costs`);
}

export async function updateServiceCatalogAction(formData: FormData): Promise<void> {
  const entryId = readRequiredString(formData, 'entry_id', 'Service catalog entry is required.');
  const label = readRequiredString(formData, 'label', 'Service label is required.');
  const unitCost = readRequiredNumber(formData, 'unit_cost', 'Unit cost must be greater than 0.');
  const unitType = readRequiredString(formData, 'unit_type', 'Unit type is required.');
  const categoryName = readRequiredString(formData, 'default_category', 'Select a default cost category.');

  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canManageCosts) {
    throw new Error('You do not have permission to update the service catalog.');
  }

  const defaultCategoryId = await resolveCostCategoryIdByName(supabase, categoryName);

  const { error } = await supabase
    .schema('core')
    .from('service_catalog')
    .update({
      label,
      unit_cost: unitCost,
      unit_type: unitType,
      default_category_id: defaultCategoryId,
    })
    .eq('id', entryId);

  if (error) {
    throw error;
  }

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: 'cost_service_catalog_updated',
    entityType: 'core.service_catalog',
    entityRef: buildEntityRef({ schema: 'core', table: 'service_catalog', id: entryId }),
    meta: { label, unit_cost: unitCost, unit_type: unitType },
  });

  revalidatePath('/ops/reports/costs');
  revalidatePath(`/ops/organizations/${access.organizationId ?? ''}?tab=costs`);
}

export async function createCostDimensionAction(formData: FormData): Promise<void> {
  const dimensionType = readRequiredString(formData, 'dimension_type', 'Dimension type is required.');
  const name = readRequiredString(formData, 'name', 'Dimension name is required.');
  const description = readOptionalString(formData, 'description');

  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAdminCosts) {
    throw new Error('You do not have permission to manage cost dimensions.');
  }

  const { data, error } = await supabase
    .schema('core')
    .from('cost_dimensions')
    .insert({ dimension_type: dimensionType, name, description })
    .select('id')
    .single();

  if (error || !data) {
    throw error ?? new Error('Unable to save the cost dimension.');
  }

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: 'cost_dimension_created',
    entityType: 'core.cost_dimensions',
    entityRef: buildEntityRef({ schema: 'core', table: 'cost_dimensions', id: data.id }),
    meta: { dimension_type: dimensionType, name },
  });

  revalidatePath(`/ops/organizations/${access.organizationId ?? ''}?tab=costs`);
}

export async function deleteCostDimensionAction(formData: FormData): Promise<void> {
  const dimensionId = readRequiredString(formData, 'dimension_id', 'Dimension is required.');

  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAdminCosts) {
    throw new Error('You do not have permission to delete cost dimensions.');
  }

  const { error } = await supabase
    .schema('core')
    .from('cost_dimensions')
    .delete()
    .eq('id', dimensionId);

  if (error) {
    throw error;
  }

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: 'cost_dimension_deleted',
    entityType: 'core.cost_dimensions',
    entityRef: buildEntityRef({ schema: 'core', table: 'cost_dimensions', id: dimensionId }),
  });

  revalidatePath(`/ops/organizations/${access.organizationId ?? ''}?tab=costs`);
}

export async function refreshCostRollupsAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canReportCosts) {
    throw new Error('You do not have permission to refresh cost reports.');
  }

  const { error } = await supabase.schema('analytics').rpc('refresh_cost_rollups');

  if (error) {
    throw new Error('Unable to refresh cost reports right now.');
  }

  revalidatePath('/ops/reports/costs');
}
