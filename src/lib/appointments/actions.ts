'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
import { logAuditEvent, buildEntityRef } from '@/lib/audit';
import { resolveCostCategoryIdByName, resolveStaffRate } from '@/lib/costs/queries';
import { assertRpcOk } from '@/lib/supabase/guards';
import type { AppointmentStatus } from './types';
import { assertOnboardingComplete } from '@/lib/onboarding/guard';
import {
  ActionResult,
  ActionState,
  actionError,
  actionOk,
  parseFormData,
  zodOptionalString,
  zodRequiredNumber,
  zodRequiredString,
} from '@/lib/server-actions/validate';

type AppointmentActionData = { message?: string };
type AppointmentActionState = ActionState<AppointmentActionData>;

const LOCATION_OPTIONS = ['in_person', 'phone', 'video', 'field', 'other'] as const;

const enumWithDefault = <T extends string>(options: readonly T[], fallback: T) =>
  z.preprocess(
    (value) => {
      if (typeof value !== 'string') return undefined;
      const trimmed = value.trim();
      return trimmed.length ? trimmed : undefined;
    },
    z.enum(options as [T, ...T[]]).transform((value) => value ?? fallback),
  );

function parseDateTime(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

const ALLOWED_MEETING_PROTOCOLS = new Set(['http:', 'https:', 'tel:', 'mailto:']);

function sanitizeMeetingUrl(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    return ALLOWED_MEETING_PROTOCOLS.has(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

async function loadActionAccess(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  return loadPortalAccess(supabase, { allowSideEffects: true });
}

type AppointmentScopeRow = {
  id: string;
  client_profile_id: string;
  organization_id: number | null;
  staff_profile_id: string | null;
  staff_role?: string | null;
  duration_minutes?: number | null;
  occurs_at?: string | null;
};

function isIharcAdmin(access: Awaited<ReturnType<typeof loadPortalAccess>>): boolean {
  return access?.isGlobalAdmin ?? false;
}

async function fetchAppointmentScope(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  appointmentId: string,
): Promise<AppointmentScopeRow> {
  const { data, error } = await supabase
    .schema('portal')
    .from('appointments')
    .select('id, client_profile_id, organization_id, staff_profile_id, staff_role, duration_minutes, occurs_at')
    .eq('id', appointmentId)
    .maybeSingle();

  if (error || !data) {
    throw new Error('Appointment not found or unavailable.');
  }

  return data as AppointmentScopeRow;
}

function assertCanActOnAppointment(
  appointment: AppointmentScopeRow,
  access: NonNullable<Awaited<ReturnType<typeof loadPortalAccess>>>,
  context: 'client' | 'staff',
) {
  if (isIharcAdmin(access)) {
    return;
  }

  const sameOrg = appointment.organization_id !== null && appointment.organization_id === access.organizationId;

  if (context === 'client') {
    if (appointment.client_profile_id === access.profile.id) return;
    throw new Error('You do not have permission to modify this appointment.');
  }

  // staff/org/admin context
  const isAssignedStaff = appointment.staff_profile_id === access.profile.id;
  const isOrgScoped = access.canAccessOpsOrg && sameOrg;
  const isStaffScoped = access.canAccessOpsFrontline && (sameOrg || isAssignedStaff);
  const isPortalAdminScoped = access.canAccessOpsAdmin && sameOrg;

  if (isStaffScoped || isOrgScoped || isPortalAdminScoped) return;

  throw new Error('You do not have permission to modify this appointment.');
}

async function touchAppointmentListings() {
  const paths = ['/appointments', '/home', '/ops/programs', '/ops/organizations'];
  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.warn('Unable to revalidate appointment listing path.', { path, error });
      }
    }
  }
}

export async function requestAppointmentAction(
  _prev: AppointmentActionState,
  formData: FormData,
): Promise<AppointmentActionState> {
  try {
    const parsed = parseFormData(
      formData,
      z.object({
        reason: zodRequiredString('Share a short note (at least 8 characters).', { min: 8 }),
        preferred_date: zodOptionalString(),
        staff_preference: zodOptionalString(),
        location_type: enumWithDefault(LOCATION_OPTIONS, 'in_person'),
        meeting_url: zodOptionalString(),
      }),
    );

    if (!parsed.ok) {
      return parsed;
    }

    const {
      reason: title,
      preferred_date: requestedWindow,
      staff_preference: staffPreference,
      location_type: locationType,
      meeting_url: meetingUrlRaw,
    } = parsed.data;

    const meetingUrl = sanitizeMeetingUrl(meetingUrlRaw ?? null);
    if (meetingUrlRaw && !meetingUrl) {
      return actionError('Enter a valid meeting link or phone number.', {
        meeting_url: 'Enter a valid meeting link or phone number.',
      });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return actionError('Sign in before requesting an appointment.');
    }

    const profile = await ensurePortalProfile(supabase, user.id);
    try {
      await assertOnboardingComplete(supabase, user.id);
    } catch (error) {
      return actionError(
        error instanceof Error ? error.message : 'Finish onboarding before requesting appointments.',
      );
    }

    const { data, error } = await supabase
      .schema('portal')
      .from('appointments')
      .insert({
        title,
        description: staffPreference ? `Preferred staff: ${staffPreference}` : null,
        status: 'requested',
        requested_window: requestedWindow,
        location_type: locationType,
        meeting_url: meetingUrl,
        client_profile_id: profile.id,
        requester_profile_id: profile.id,
        organization_id: profile.organization_id ?? null,
      })
      .select('id')
      .single();

    if (error || !data) {
      console.error('requestAppointmentAction failed', error);
      return actionError('We could not log the request right now.');
    }

    await logAuditEvent(supabase, {
      actorProfileId: profile.id,
      action: 'appointment_requested',
      entityType: 'appointment',
      entityRef: buildEntityRef({ schema: 'portal', table: 'appointments', id: data.id }),
      meta: {
        requested_window: requestedWindow,
        staff_preference: staffPreference,
        location_type: locationType,
      },
    });

    await touchAppointmentListings();

    return actionOk({ message: 'Thanks — the outreach team will review and confirm a time.' });
  } catch (error) {
    console.error('requestAppointmentAction error', error);
    return actionError('Unable to submit right now. Please try again.');
  }
}

export async function cancelAppointmentAsClient(formData: FormData): Promise<ActionResult<AppointmentActionData>> {
  try {
    const parsed = parseFormData(
      formData,
      z.object({
        appointment_id: zodRequiredString('Appointment is required.'),
        cancellation_reason: zodOptionalString(),
      }),
    );

    if (!parsed.ok) {
      return parsed;
    }

    const { appointment_id: appointmentId, cancellation_reason: reason } = parsed.data;

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return actionError('Sign in to cancel an appointment.');

    const profile = await ensurePortalProfile(supabase, user.id);
    const access = await loadActionAccess(supabase);
    if (!access) return actionError('Sign in to cancel an appointment.');
    await assertOnboardingComplete(supabase, user.id);
    const appointment = await fetchAppointmentScope(supabase, appointmentId);
    assertCanActOnAppointment(appointment, { ...access, profile }, 'client');

    const { error } = await supabase
      .schema('portal')
      .from('appointments')
      .update({
        status: 'cancelled_by_client' as AppointmentStatus,
        canceled_at: new Date().toISOString(),
        cancellation_reason: reason ?? 'Client cancelled via portal',
      })
      .eq('id', appointmentId)
      .eq('client_profile_id', profile.id);

    if (error) {
      throw error;
    }

    await logAuditEvent(supabase, {
      actorProfileId: profile.id,
      action: 'appointment_cancelled_by_client',
      entityType: 'appointment',
      entityRef: buildEntityRef({ schema: 'portal', table: 'appointments', id: appointmentId }),
      meta: { cancellation_reason: reason },
    });

    await touchAppointmentListings();

    return actionOk({ message: 'Appointment cancelled.' });
  } catch (error) {
    console.error('cancelAppointmentAsClient error', error);
    return actionError('Unable to cancel right now. Please try again.');
  }
}

export async function requestRescheduleAsClient(formData: FormData): Promise<ActionResult<AppointmentActionData>> {
  try {
    const parsed = parseFormData(
      formData,
      z.object({
        appointment_id: zodRequiredString('Appointment is required.'),
        requested_window: zodRequiredString('Add your preferred window.'),
        location_type: enumWithDefault(LOCATION_OPTIONS, 'in_person'),
        meeting_url: zodOptionalString(),
        location: zodOptionalString(),
      }),
    );

    if (!parsed.ok) {
      return parsed;
    }

    const {
      appointment_id: appointmentId,
      requested_window: requestedWindow,
      location_type: locationType,
      meeting_url: meetingUrlRaw,
      location: preferredLocation,
    } = parsed.data;

    const meetingUrl = sanitizeMeetingUrl(meetingUrlRaw ?? null);
    if (meetingUrlRaw && !meetingUrl) {
      return actionError('Enter a valid meeting link or phone number.', {
        meeting_url: 'Enter a valid meeting link or phone number.',
      });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return actionError('Sign in to request a change.');

    const profile = await ensurePortalProfile(supabase, user.id);
    const access = await loadActionAccess(supabase);
    if (!access) return actionError('Sign in to request a change.');
    await assertOnboardingComplete(supabase, user.id);
    const appointment = await fetchAppointmentScope(supabase, appointmentId);
    assertCanActOnAppointment(appointment, { ...access, profile }, 'client');

    const { error } = await supabase
      .schema('portal')
      .from('appointments')
      .update({
        status: 'reschedule_requested' as AppointmentStatus,
        requested_window: requestedWindow,
        reschedule_note: requestedWindow,
        location_type: locationType,
        meeting_url: meetingUrl,
        location: preferredLocation,
      })
      .eq('id', appointmentId)
      .eq('client_profile_id', profile.id);

    if (error) {
      throw error;
    }

    await logAuditEvent(supabase, {
      actorProfileId: profile.id,
      action: 'appointment_reschedule_requested',
      entityType: 'appointment',
      entityRef: buildEntityRef({ schema: 'portal', table: 'appointments', id: appointmentId }),
      meta: { requested_window: requestedWindow },
    });

    await touchAppointmentListings();

    return actionOk({ message: 'Reschedule request sent.' });
  } catch (error) {
    console.error('requestRescheduleAsClient error', error);
    return actionError('Unable to request a change right now.');
  }
}

export async function confirmAppointment(formData: FormData): Promise<ActionResult<AppointmentActionData>> {
  try {
    const parsed = parseFormData(
      formData,
      z.object({
        appointment_id: zodRequiredString('Appointment is required.'),
        occurs_at: zodRequiredString('Add a date and time before confirming.'),
        duration_minutes: zodRequiredNumber('Provide the appointment duration in minutes.', {
          int: true,
          positive: true,
        }),
        location: zodOptionalString(),
        location_type: enumWithDefault(LOCATION_OPTIONS, 'in_person'),
        meeting_url: zodOptionalString(),
        notes: zodOptionalString(),
        staff_profile_id: zodOptionalString(),
        staff_role: zodRequiredString('Select the staff role used for this appointment.'),
      }),
    );

    if (!parsed.ok) {
      return parsed;
    }

    const {
      appointment_id: appointmentId,
      occurs_at: occursAtInput,
      duration_minutes: durationMinutes,
      location,
      location_type: locationType,
      meeting_url: meetingUrlRaw,
      notes,
      staff_profile_id: staffProfileId,
      staff_role: staffRole,
    } = parsed.data;

    const occursAt = parseDateTime(occursAtInput ?? null);
    if (!occursAt) {
      return actionError('Provide a valid date and time.', { occurs_at: 'Provide a valid date and time.' });
    }

    const meetingUrl = sanitizeMeetingUrl(meetingUrlRaw ?? null);
    if (meetingUrlRaw && !meetingUrl) {
      return actionError('Enter a valid meeting link or phone number.', {
        meeting_url: 'Enter a valid meeting link or phone number.',
      });
    }

    const supabase = await createSupabaseServerClient();
    const access = await loadActionAccess(supabase);
    if (!access || (!access.canAccessOpsFrontline && !access.canAccessOpsOrg && !access.canAccessOpsAdmin)) {
      return actionError('You do not have permission to confirm appointments.');
    }

    const actorProfile = await ensurePortalProfile(supabase, access.userId);
    const appointment = await fetchAppointmentScope(supabase, appointmentId);
    assertCanActOnAppointment(appointment, { ...access, profile: actorProfile }, 'staff');

    const { error } = await supabase
      .schema('portal')
      .from('appointments')
      .update({
        status: 'scheduled' as AppointmentStatus,
        occurs_at: occursAt,
        duration_minutes: durationMinutes,
        location,
        location_type: locationType,
        meeting_url: meetingUrl,
        staff_profile_id: staffProfileId ?? actorProfile.id,
        staff_role: staffRole,
        confirmed_at: new Date().toISOString(),
        confirmed_by_profile_id: actorProfile.id,
        reschedule_note: notes,
      })
      .eq('id', appointmentId)
      .eq('organization_id', appointment.organization_id);

    if (error) {
      throw error;
    }

    await logAuditEvent(supabase, {
      actorProfileId: actorProfile.id,
      action: 'appointment_confirmed',
      entityType: 'appointment',
      entityRef: buildEntityRef({ schema: 'portal', table: 'appointments', id: appointmentId }),
      meta: { occurs_at: occursAt, duration_minutes: durationMinutes, location, location_type: locationType },
    });

    await touchAppointmentListings();

    return actionOk({ message: 'Appointment confirmed.' });
  } catch (error) {
    console.error('confirmAppointment error', error);
    return actionError('Unable to confirm right now.');
  }
}

export async function createOfflineAppointment(formData: FormData): Promise<ActionResult<AppointmentActionData>> {
  try {
    const parsed = parseFormData(
      formData,
      z.object({
        client_profile_id: zodRequiredString('Client is required.'),
        title: zodRequiredString('Title is required.'),
        occurs_at: zodOptionalString(),
        location: zodOptionalString(),
        location_type: enumWithDefault(LOCATION_OPTIONS, 'in_person'),
        meeting_url: zodOptionalString(),
        duration_minutes: zodRequiredNumber('Provide the appointment duration in minutes.', {
          int: true,
          positive: true,
        }),
        staff_profile_id: zodOptionalString(),
        staff_role: zodRequiredString('Select the staff role used for this appointment.'),
      }),
    );

    if (!parsed.ok) {
      return parsed;
    }

    const {
      client_profile_id: clientProfileId,
      title,
      occurs_at: occursAtInput,
      location,
      location_type: locationType,
      meeting_url: meetingUrlRaw,
      duration_minutes: durationMinutes,
      staff_profile_id: staffProfileId,
      staff_role: staffRole,
    } = parsed.data;

    const occursAt = parseDateTime(occursAtInput ?? null);
    if (occursAtInput && !occursAt) {
      return actionError('Provide a valid date and time.', { occurs_at: 'Provide a valid date and time.' });
    }

    const meetingUrl = sanitizeMeetingUrl(meetingUrlRaw ?? null);
    if (meetingUrlRaw && !meetingUrl) {
      return actionError('Enter a valid meeting link or phone number.', {
        meeting_url: 'Enter a valid meeting link or phone number.',
      });
    }

    const supabase = await createSupabaseServerClient();
    const access = await loadActionAccess(supabase);

    if (!access || (!access.canAccessOpsFrontline && !access.canAccessOpsOrg && !access.canAccessOpsAdmin)) {
      return actionError('You do not have permission to create appointments.');
    }

    const actorProfile = await ensurePortalProfile(supabase, access.userId);

    const { error, data } = await supabase
      .schema('portal')
      .from('appointments')
      .insert({
        title,
        status: occursAt ? ('scheduled' as AppointmentStatus) : ('pending_confirmation' as AppointmentStatus),
        occurs_at: occursAt,
        duration_minutes: durationMinutes,
        location,
        location_type: locationType,
        meeting_url: meetingUrl,
        client_profile_id: clientProfileId,
        requester_profile_id: actorProfile.id,
        staff_profile_id: staffProfileId ?? actorProfile.id,
        staff_role: staffRole,
        organization_id: access.organizationId ?? null,
      })
      .select('id')
      .single();

    if (error || !data) {
      throw error;
    }

    await logAuditEvent(supabase, {
      actorProfileId: actorProfile.id,
      action: 'appointment_created_offline',
      entityType: 'appointment',
      entityRef: buildEntityRef({ schema: 'portal', table: 'appointments', id: data.id }),
      meta: {
        occurs_at: occursAt,
        client_profile_id: clientProfileId,
      },
    });

    await touchAppointmentListings();

    return actionOk({ message: 'Appointment created.' });
  } catch (error) {
    console.error('createOfflineAppointment error', error);
    return actionError('Unable to create appointment right now.');
  }
}

export async function completeAppointment(formData: FormData): Promise<ActionResult<AppointmentActionData>> {
  try {
    const parsed = parseFormData(
      formData,
      z.object({
        appointment_id: zodRequiredString('Appointment is required.'),
        outcome_notes: zodOptionalString(),
      }),
    );

    if (!parsed.ok) {
      return parsed;
    }

    const { appointment_id: appointmentId, outcome_notes: outcomeNotes } = parsed.data;

    const supabase = await createSupabaseServerClient();
    const access = await loadActionAccess(supabase);
    if (!access || (!access.canAccessOpsFrontline && !access.canAccessOpsAdmin && !access.canAccessOpsOrg)) {
      return actionError('You do not have permission to complete appointments.');
    }

    const actorProfile = await ensurePortalProfile(supabase, access.userId);
    const appointment = await fetchAppointmentScope(supabase, appointmentId);
    assertCanActOnAppointment(appointment, { ...access, profile: actorProfile }, 'staff');

    if (!appointment.organization_id) {
      throw new Error('Appointments must be tied to an organization to record costs.');
    }

    if (!appointment.staff_role) {
      throw new Error('Appointments must include a staff role to record costs.');
    }

    if (!appointment.duration_minutes || appointment.duration_minutes <= 0) {
      throw new Error('Appointments must include a duration to record costs.');
    }

    if (!appointment.occurs_at) {
      throw new Error('Appointments must have a scheduled time to record costs.');
    }

    const { data: personLink, error: personError } = await supabase
      .schema('core')
      .from('user_people')
      .select('person_id')
      .eq('profile_id', appointment.client_profile_id)
      .maybeSingle();

    if (personError || !personLink?.person_id) {
      throw new Error('Unable to resolve the client record for cost tracking.');
    }

    const staffRate = await resolveStaffRate(
      supabase,
      appointment.organization_id,
      appointment.staff_role,
      appointment.occurs_at,
    );
    const hours = appointment.duration_minutes / 60;
    const costAmount = Number((hours * Number(staffRate.hourly_rate)).toFixed(2));
    const costCategoryId = await resolveCostCategoryIdByName(supabase, 'appointments');

    const completionResult = await supabase
      .schema('portal')
      .rpc('complete_appointment_with_costs', {
        p_appointment_id: appointmentId,
        p_outcome_notes: outcomeNotes,
        p_person_id: personLink.person_id,
        p_cost_category_id: costCategoryId,
        p_cost_amount: costAmount,
        p_currency: 'CAD',
        p_quantity: Number(hours.toFixed(3)),
        p_unit_cost: Number(staffRate.hourly_rate),
        p_uom: 'hour',
        p_metadata: {
          appointment_id: appointmentId,
          staff_role: appointment.staff_role,
          duration_minutes: appointment.duration_minutes,
          staff_profile_id: appointment.staff_profile_id,
        },
        p_created_by: access.userId,
      });

    assertRpcOk(completionResult, 'complete_appointment_with_costs');

    const completionRow = Array.isArray(completionResult.data) ? completionResult.data[0] : null;
    if (!completionRow?.cost_event_id) {
      throw new Error('Unable to create appointment cost event.');
    }

    await touchAppointmentListings();

    return actionOk({ message: 'Appointment completed.' });
  } catch (error) {
    console.error('completeAppointment error', error);
    return actionError('Unable to mark complete right now.');
  }
}

export async function cancelAppointmentAsStaff(formData: FormData): Promise<ActionResult<AppointmentActionData>> {
  try {
    const parsed = parseFormData(
      formData,
      z.object({
        appointment_id: zodRequiredString('Appointment is required.'),
        cancellation_reason: zodOptionalString(),
      }),
    );

    if (!parsed.ok) {
      return parsed;
    }

    const { appointment_id: appointmentId, cancellation_reason: reason } = parsed.data;

    const supabase = await createSupabaseServerClient();
    const access = await loadActionAccess(supabase);
    if (!access || (!access.canAccessOpsFrontline && !access.canAccessOpsAdmin && !access.canAccessOpsOrg)) {
      return actionError('You do not have permission to cancel appointments.');
    }

    const actorProfile = await ensurePortalProfile(supabase, access.userId);
    const appointment = await fetchAppointmentScope(supabase, appointmentId);
    assertCanActOnAppointment(appointment, { ...access, profile: actorProfile }, 'staff');

    const { error } = await supabase
      .schema('portal')
      .from('appointments')
      .update({
        status: 'cancelled_by_staff' as AppointmentStatus,
        canceled_at: new Date().toISOString(),
        cancellation_reason: reason ?? 'Cancelled by staff',
      })
      .eq('id', appointmentId)
      .eq('organization_id', appointment.organization_id);

    if (error) throw error;

    await logAuditEvent(supabase, {
      actorProfileId: actorProfile.id,
      action: 'appointment_cancelled_by_staff',
      entityType: 'appointment',
      entityRef: buildEntityRef({ schema: 'portal', table: 'appointments', id: appointmentId }),
      meta: { cancellation_reason: reason },
    });

    await touchAppointmentListings();

    return actionOk({ message: 'Appointment cancelled.' });
  } catch (error) {
    console.error('cancelAppointmentAsStaff error', error);
    return actionError('Unable to cancel appointment right now.');
  }
}
