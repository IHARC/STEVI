'use server';

import { revalidatePath } from 'next/cache';
import { buildEntityRef, logAuditEvent } from '@/lib/audit';
import { resolveCostCategoryIdByName, resolveStaffRate } from '@/lib/costs/queries';
import { assertOrganizationSelected, loadPortalAccess } from '@/lib/portal-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type TimeActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
};

const TIME_PATH = '/ops/time';

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

type RoleSnapshot = { roleName: string; roleKind: 'staff' | 'volunteer' };

async function resolveRoleSnapshot(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  orgId: number,
  userId: string,
  roleId: string,
): Promise<RoleSnapshot | null> {
  const { data, error } = await supabase
    .schema('core')
    .from('user_org_roles')
    .select('org_roles ( id, name, role_kind )')
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .eq('org_role_id', roleId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const roleValue = Array.isArray(data.org_roles) ? data.org_roles[0] : data.org_roles;
  if (!roleValue || typeof roleValue !== 'object') {
    return null;
  }

  return {
    roleName: String(roleValue.name),
    roleKind: roleValue.role_kind === 'volunteer' ? 'volunteer' : 'staff',
  };
}

function minutesBetween(start: string, end: Date): number {
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) {
    return 0;
  }
  return Math.max(0, Math.floor((end.getTime() - startDate.getTime()) / 60000));
}

export async function startShiftAction(
  _prevState: TimeActionState,
  formData: FormData,
): Promise<TimeActionState> {
  try {
    const roleId = readRequiredString(formData, 'role_id', 'Select the role used for this shift.');
    const notes = readOptionalString(formData, 'notes');
    if (notes && notes.length > 1200) {
      return { status: 'error', message: 'Keep shift notes under 1200 characters.' };
    }

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);

    if (!access || !access.canTrackTime) {
      return { status: 'error', message: 'You do not have permission to track time.' };
    }

    assertOrganizationSelected(access, 'Select an acting organization before clocking in.');

    const roleSnapshot = await resolveRoleSnapshot(supabase, access.organizationId, access.userId, roleId);
    if (!roleSnapshot) {
      return { status: 'error', message: 'Unable to use the selected role for this shift.' };
    }

    const { data: existingOpenShift } = await supabase
      .schema('core')
      .from('staff_time_entries')
      .select('id')
      .eq('user_id', access.userId)
      .is('shift_end', null)
      .maybeSingle();

    if (existingOpenShift) {
      return { status: 'error', message: 'You already have an open shift.' };
    }

    const { data: newShift, error } = await supabase
      .schema('core')
      .from('staff_time_entries')
      .insert({
        organization_id: access.organizationId,
        user_id: access.userId,
        role_name: roleSnapshot.roleName,
        role_kind: roleSnapshot.roleKind,
        shift_start: new Date().toISOString(),
        status: 'open',
        notes: notes ?? null,
      })
      .select('id')
      .single();

    if (error || !newShift) {
      if (error && 'code' in error && error.code === '23505') {
        return { status: 'error', message: 'You already have an open shift.' };
      }
      return { status: 'error', message: 'Unable to start your shift. Please try again.' };
    }

    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'staff_time_clock_in',
      entityType: 'core.staff_time_entries',
      entityRef: buildEntityRef({ schema: 'core', table: 'staff_time_entries', id: newShift.id }),
      meta: {
        organization_id: access.organizationId,
        role_name: roleSnapshot.roleName,
        role_kind: roleSnapshot.roleKind,
      },
    });

    revalidatePath(TIME_PATH);
    return { status: 'success', message: 'Shift started.' };
  } catch (error) {
    console.error('Failed to start shift', error);
    return { status: 'error', message: 'Unable to start your shift.' };
  }
}

export async function endShiftAction(
  _prevState: TimeActionState,
  formData: FormData,
): Promise<TimeActionState> {
  try {
    const timeEntryId = readOptionalString(formData, 'time_entry_id');

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);

    if (!access) {
      return { status: 'error', message: 'You must be signed in to clock out.' };
    }

    assertOrganizationSelected(access, 'Select an acting organization before clocking out.');

    let timeEntryQuery = supabase
      .schema('core')
      .from('staff_time_entries')
      .select(
        'id, user_id, organization_id, role_name, role_kind, shift_start, shift_end, status, currency, break_minutes',
      );

    if (timeEntryId) {
      timeEntryQuery = timeEntryQuery.eq('id', timeEntryId);
    } else {
      timeEntryQuery = timeEntryQuery.eq('user_id', access.userId).is('shift_end', null);
    }

    const { data: timeEntry, error } = await timeEntryQuery.maybeSingle();

    if (error || !timeEntry) {
      return { status: 'error', message: 'No open shift found to close.' };
    }

    if (timeEntry.shift_end) {
      return { status: 'error', message: 'This shift has already been closed.' };
    }

    const isOwnShift = timeEntry.user_id === access.userId;
    if (!isOwnShift && !access.canManageTime) {
      return { status: 'error', message: 'You do not have permission to close this shift.' };
    }

    const shiftEnd = new Date();
    const shiftEndIso = shiftEnd.toISOString();

    await supabase
      .schema('core')
      .from('staff_break_entries')
      .update({ ended_at: shiftEndIso })
      .eq('time_entry_id', timeEntry.id)
      .is('ended_at', null);

    const { data: breaks, error: breaksError } = await supabase
      .schema('core')
      .from('staff_break_entries')
      .select('started_at, ended_at')
      .eq('time_entry_id', timeEntry.id);

    if (breaksError) {
      return { status: 'error', message: 'Unable to calculate break time.' };
    }

    const breakRows = (breaks ?? []) as Array<{ started_at: string | null; ended_at: string | null }>;
    const breakMinutes = breakRows.reduce((total, entry) => {
      if (!entry?.started_at || !entry?.ended_at) return total;
      const started = new Date(entry.started_at);
      const ended = new Date(entry.ended_at);
      if (Number.isNaN(started.getTime()) || Number.isNaN(ended.getTime())) return total;
      return total + Math.max(0, Math.floor((ended.getTime() - started.getTime()) / 60000));
    }, 0);

    const totalMinutes = Math.max(0, minutesBetween(timeEntry.shift_start, shiftEnd) - breakMinutes);
    const hours = totalMinutes / 60;

    let hourlyRate = 0;
    let costAmount = 0;

    if (timeEntry.role_kind !== 'volunteer') {
      try {
        const rate = await resolveStaffRate(supabase, timeEntry.organization_id, timeEntry.role_name, timeEntry.shift_start);
        hourlyRate = Number(rate.hourly_rate);
        costAmount = Number((hours * hourlyRate).toFixed(2));
      } catch (rateError) {
        const message = rateError instanceof Error ? rateError.message : 'Unable to resolve staff rate.';
        return { status: 'error', message };
      }
    }

    let costCategoryId = '';
    try {
      costCategoryId = await resolveCostCategoryIdByName(supabase, 'staff_time');
    } catch (categoryError) {
      const message = categoryError instanceof Error ? categoryError.message : 'Unable to resolve cost category.';
      return { status: 'error', message };
    }

    const { data: costEvent, error: costError } = await supabase
      .schema('core')
      .from('cost_events')
      .insert({
        organization_id: timeEntry.organization_id,
        source_type: 'staff_time',
        source_id: timeEntry.id,
        occurred_at: shiftEndIso,
        cost_amount: costAmount,
        currency: timeEntry.currency ?? 'CAD',
        quantity: Number(hours.toFixed(3)),
        unit_cost: hourlyRate,
        uom: 'hour',
        cost_category_id: costCategoryId,
        metadata: {
          time_entry_id: timeEntry.id,
          role_name: timeEntry.role_name,
          role_kind: timeEntry.role_kind,
          break_minutes: breakMinutes,
          total_minutes: totalMinutes,
          user_id: timeEntry.user_id,
        },
        created_by: access.userId,
      })
      .select('id')
      .single();

    if (costError || !costEvent) {
      return { status: 'error', message: 'Unable to record time costs. Please try again.' };
    }

    const { error: updateError } = await supabase
      .schema('core')
      .from('staff_time_entries')
      .update({
        shift_end: shiftEndIso,
        status: 'closed',
        break_minutes: breakMinutes,
        total_minutes: totalMinutes,
        hourly_rate_snapshot: hourlyRate,
        cost_amount_snapshot: costAmount,
        cost_event_id: costEvent.id,
        updated_by: access.userId,
      })
      .eq('id', timeEntry.id);

    if (updateError) {
      await supabase.schema('core').from('cost_events').delete().eq('id', costEvent.id);
      return { status: 'error', message: 'Unable to close your shift. Please try again.' };
    }

    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'staff_time_clock_out',
      entityType: 'core.staff_time_entries',
      entityRef: buildEntityRef({ schema: 'core', table: 'staff_time_entries', id: timeEntry.id }),
      meta: {
        organization_id: timeEntry.organization_id,
        role_name: timeEntry.role_name,
        role_kind: timeEntry.role_kind,
        total_minutes: totalMinutes,
        cost_amount: costAmount,
      },
    });

    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'cost_event_created',
      entityType: 'core.cost_events',
      entityRef: buildEntityRef({ schema: 'core', table: 'cost_events', id: costEvent.id }),
      meta: {
        source_type: 'staff_time',
        source_id: timeEntry.id,
        organization_id: timeEntry.organization_id,
        cost_amount: costAmount,
      },
    });

    revalidatePath(TIME_PATH);
    return { status: 'success', message: 'Shift closed.' };
  } catch (error) {
    console.error('Failed to end shift', error);
    return { status: 'error', message: 'Unable to close your shift.' };
  }
}

export async function startBreakAction(
  _prevState: TimeActionState,
  formData: FormData,
): Promise<TimeActionState> {
  try {
    const timeEntryId = readRequiredString(formData, 'time_entry_id', 'Missing time entry.');

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);

    if (!access || !access.canTrackTime) {
      return { status: 'error', message: 'You do not have permission to start a break.' };
    }

    const { data: timeEntry, error } = await supabase
      .schema('core')
      .from('staff_time_entries')
      .select('id, shift_end')
      .eq('id', timeEntryId)
      .maybeSingle();

    if (error || !timeEntry) {
      return { status: 'error', message: 'Unable to start a break for this shift.' };
    }

    if (timeEntry.shift_end) {
      return { status: 'error', message: 'This shift is already closed.' };
    }

    const { data: openBreak } = await supabase
      .schema('core')
      .from('staff_break_entries')
      .select('id')
      .eq('time_entry_id', timeEntryId)
      .is('ended_at', null)
      .maybeSingle();

    if (openBreak) {
      return { status: 'error', message: 'A break is already running.' };
    }

    const { data: breakEntry, error: breakError } = await supabase
      .schema('core')
      .from('staff_break_entries')
      .insert({
        time_entry_id: timeEntryId,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (breakError || !breakEntry) {
      return { status: 'error', message: 'Unable to start your break.' };
    }

    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'staff_time_break_started',
      entityType: 'core.staff_break_entries',
      entityRef: buildEntityRef({ schema: 'core', table: 'staff_break_entries', id: breakEntry.id }),
      meta: { time_entry_id: timeEntryId },
    });

    revalidatePath(TIME_PATH);
    return { status: 'success', message: 'Break started.' };
  } catch (error) {
    console.error('Failed to start break', error);
    return { status: 'error', message: 'Unable to start your break.' };
  }
}

export async function endBreakAction(
  _prevState: TimeActionState,
  formData: FormData,
): Promise<TimeActionState> {
  try {
    const breakId = readRequiredString(formData, 'break_id', 'Missing break entry.');

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);

    if (!access || !access.canTrackTime) {
      return { status: 'error', message: 'You do not have permission to end a break.' };
    }

    const { data: breakEntry, error } = await supabase
      .schema('core')
      .from('staff_break_entries')
      .update({ ended_at: new Date().toISOString(), updated_by: access.userId })
      .eq('id', breakId)
      .is('ended_at', null)
      .select('id, time_entry_id')
      .maybeSingle();

    if (error || !breakEntry) {
      return { status: 'error', message: 'Unable to end this break.' };
    }

    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'staff_time_break_ended',
      entityType: 'core.staff_break_entries',
      entityRef: buildEntityRef({ schema: 'core', table: 'staff_break_entries', id: breakEntry.id }),
      meta: { time_entry_id: breakEntry.time_entry_id },
    });

    revalidatePath(TIME_PATH);
    return { status: 'success', message: 'Break ended.' };
  } catch (error) {
    console.error('Failed to end break', error);
    return { status: 'error', message: 'Unable to end your break.' };
  }
}
