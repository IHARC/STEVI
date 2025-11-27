'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
import { logAuditEvent } from '@/lib/audit';
import type { AppointmentRequestState } from '@/app/(portal)/appointments/types';
import type { AppointmentChannel, AppointmentStatus } from './types';

type ActionResult = { success: true } | { success: false; error: string };

function readString(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length ? trimmed : null;
}

function parseDateTime(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Provide a valid date and time.');
  }
  return parsed.toISOString();
}

function parseInteger(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseLocationType(value: string | null): AppointmentChannel {
  const allowed: AppointmentChannel[] = ['in_person', 'phone', 'video', 'field', 'other'];
  if (!value) return 'in_person';
  const normalized = value as AppointmentChannel;
  return allowed.includes(normalized) ? normalized : 'in_person';
}

async function touchAppointmentListings() {
  revalidatePath('/appointments');
  revalidatePath('/home');
  revalidatePath('/staff/appointments');
  revalidatePath('/org/appointments');
  revalidatePath('/admin/appointments');
}

export async function requestAppointmentAction(
  _prev: AppointmentRequestState,
  formData: FormData,
): Promise<AppointmentRequestState> {
  try {
    const title = readString(formData, 'reason');
    const requestedWindow = readString(formData, 'preferred_date');
    const staffPreference = readString(formData, 'staff_preference');
    const locationType = parseLocationType(readString(formData, 'location_type'));
    const meetingUrl = readString(formData, 'meeting_url');

    if (!title || title.length < 6) {
      return { status: 'error', message: 'Share a short note (at least 6 characters).' };
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { status: 'error', message: 'Sign in before requesting an appointment.' };
    }

    const profile = await ensurePortalProfile(supabase, user.id);

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
      return { status: 'error', message: 'We could not log the request right now.' };
    }

    await logAuditEvent(supabase, {
      actorProfileId: profile.id,
      action: 'appointment_requested',
      entityType: 'appointment',
      entityId: data.id,
      meta: {
        requested_window: requestedWindow,
        staff_preference: staffPreference,
        location_type: locationType,
      },
    });

    await touchAppointmentListings();

    return {
      status: 'success',
      message: 'Thanks — the outreach team will review and confirm a time.',
    };
  } catch (error) {
    console.error('requestAppointmentAction error', error);
    return { status: 'error', message: 'Unable to submit right now. Please try again.' };
  }
}

export async function cancelAppointmentAsClient(formData: FormData): Promise<ActionResult> {
  try {
    const appointmentId = readString(formData, 'appointment_id');
    const reason = readString(formData, 'cancellation_reason');

    if (!appointmentId) {
      throw new Error('Missing appointment id.');
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error('Sign in to cancel an appointment.');

    const profile = await ensurePortalProfile(supabase, user.id);

    const { error } = await supabase
      .schema('portal')
      .from('appointments')
      .update({
        status: 'cancelled_by_client' as AppointmentStatus,
        canceled_at: new Date().toISOString(),
        cancellation_reason: reason ?? 'Client cancelled via portal',
      })
      .eq('id', appointmentId);

    if (error) {
      throw error;
    }

    await logAuditEvent(supabase, {
      actorProfileId: profile.id,
      action: 'appointment_cancelled_by_client',
      entityType: 'appointment',
      entityId: appointmentId,
      meta: { cancellation_reason: reason },
    });

    await touchAppointmentListings();

    return { success: true };
  } catch (error) {
    console.error('cancelAppointmentAsClient error', error);
    return { success: false, error: 'Unable to cancel right now. Please try again.' };
  }
}

export async function requestRescheduleAsClient(formData: FormData): Promise<ActionResult> {
  try {
    const appointmentId = readString(formData, 'appointment_id');
    const requestedWindow = readString(formData, 'requested_window');
    const locationType = parseLocationType(readString(formData, 'location_type'));
    const meetingUrl = readString(formData, 'meeting_url');
    const preferredLocation = readString(formData, 'location');

    if (!appointmentId) throw new Error('Missing appointment id.');

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Sign in to request a change.');

    const profile = await ensurePortalProfile(supabase, user.id);

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
      .eq('id', appointmentId);

    if (error) {
      throw error;
    }

    await logAuditEvent(supabase, {
      actorProfileId: profile.id,
      action: 'appointment_reschedule_requested',
      entityType: 'appointment',
      entityId: appointmentId,
      meta: { requested_window: requestedWindow },
    });

    await touchAppointmentListings();

    return { success: true };
  } catch (error) {
    console.error('requestRescheduleAsClient error', error);
    return { success: false, error: 'Unable to request a change right now.' };
  }
}

export async function confirmAppointment(formData: FormData): Promise<ActionResult> {
  try {
    const appointmentId = readString(formData, 'appointment_id');
    const occursAtInput = readString(formData, 'occurs_at');
    const durationInput = readString(formData, 'duration_minutes');
    const location = readString(formData, 'location');
    const locationType = parseLocationType(readString(formData, 'location_type'));
    const meetingUrl = readString(formData, 'meeting_url');
    const notes = readString(formData, 'notes');
    const staffProfileId = readString(formData, 'staff_profile_id');

    if (!appointmentId) throw new Error('Missing appointment id.');

    const occursAt = parseDateTime(occursAtInput);
    if (!occursAt) throw new Error('Add a date and time before confirming.');

    const durationMinutes = parseInteger(durationInput, 60);

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);
    if (!access || (!access.canAccessStaffWorkspace && !access.canAccessOrgWorkspace && !access.canAccessAdminWorkspace)) {
      throw new Error('You do not have permission to confirm appointments.');
    }

    const actorProfile = await ensurePortalProfile(supabase, access.userId);

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
        confirmed_at: new Date().toISOString(),
        confirmed_by_profile_id: actorProfile.id,
        reschedule_note: notes,
      })
      .eq('id', appointmentId);

    if (error) {
      throw error;
    }

    await logAuditEvent(supabase, {
      actorProfileId: actorProfile.id,
      action: 'appointment_confirmed',
      entityType: 'appointment',
      entityId: appointmentId,
      meta: { occurs_at: occursAt, duration_minutes: durationMinutes, location, location_type: locationType },
    });

    await touchAppointmentListings();

    return { success: true };
  } catch (error) {
    console.error('confirmAppointment error', error);
    return { success: false, error: 'Unable to confirm right now.' };
  }
}

export async function createOfflineAppointment(formData: FormData): Promise<ActionResult> {
  try {
    const clientProfileId = readString(formData, 'client_profile_id');
    const title = readString(formData, 'title');
    const occursAt = parseDateTime(readString(formData, 'occurs_at'));
    const location = readString(formData, 'location');
    const locationType = parseLocationType(readString(formData, 'location_type'));
    const meetingUrl = readString(formData, 'meeting_url');
    const durationMinutes = parseInteger(readString(formData, 'duration_minutes'), 60);
    const staffProfileId = readString(formData, 'staff_profile_id');

    if (!clientProfileId || !title) {
      throw new Error('Client and title are required.');
    }

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);

    if (!access || (!access.canAccessStaffWorkspace && !access.canAccessOrgWorkspace && !access.canAccessAdminWorkspace)) {
      throw new Error('You do not have permission to create appointments.');
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
      entityId: data.id,
      meta: {
        occurs_at: occursAt,
        client_profile_id: clientProfileId,
      },
    });

    await touchAppointmentListings();

    return { success: true };
  } catch (error) {
    console.error('createOfflineAppointment error', error);
    return { success: false, error: 'Unable to create appointment right now.' };
  }
}

export async function completeAppointment(formData: FormData): Promise<ActionResult> {
  try {
    const appointmentId = readString(formData, 'appointment_id');
    const outcomeNotes = readString(formData, 'outcome_notes');
    if (!appointmentId) throw new Error('Missing appointment id.');

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);
    if (!access || (!access.canAccessStaffWorkspace && !access.canAccessAdminWorkspace && !access.canAccessOrgWorkspace)) {
      throw new Error('You do not have permission to complete appointments.');
    }

    const actorProfile = await ensurePortalProfile(supabase, access.userId);

    const { error } = await supabase
      .schema('portal')
      .from('appointments')
      .update({
        status: 'completed' as AppointmentStatus,
        outcome_notes: outcomeNotes,
      })
      .eq('id', appointmentId);

    if (error) throw error;

    await logAuditEvent(supabase, {
      actorProfileId: actorProfile.id,
      action: 'appointment_completed',
      entityType: 'appointment',
      entityId: appointmentId,
      meta: { outcome_notes: outcomeNotes },
    });

    await touchAppointmentListings();

    return { success: true };
  } catch (error) {
    console.error('completeAppointment error', error);
    return { success: false, error: 'Unable to mark complete right now.' };
  }
}

export async function cancelAppointmentAsStaff(formData: FormData): Promise<ActionResult> {
  try {
    const appointmentId = readString(formData, 'appointment_id');
    const reason = readString(formData, 'cancellation_reason');
    if (!appointmentId) throw new Error('Missing appointment id.');

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);
    if (!access || (!access.canAccessStaffWorkspace && !access.canAccessAdminWorkspace && !access.canAccessOrgWorkspace)) {
      throw new Error('You do not have permission to cancel appointments.');
    }

    const actorProfile = await ensurePortalProfile(supabase, access.userId);

    const { error } = await supabase
      .schema('portal')
      .from('appointments')
      .update({
        status: 'cancelled_by_staff' as AppointmentStatus,
        canceled_at: new Date().toISOString(),
        cancellation_reason: reason ?? 'Cancelled by staff',
      })
      .eq('id', appointmentId);

    if (error) throw error;

    await logAuditEvent(supabase, {
      actorProfileId: actorProfile.id,
      action: 'appointment_cancelled_by_staff',
      entityType: 'appointment',
      entityId: appointmentId,
      meta: { cancellation_reason: reason },
    });

    await touchAppointmentListings();

    return { success: true };
  } catch (error) {
    console.error('cancelAppointmentAsStaff error', error);
    return { success: false, error: 'Unable to cancel appointment right now.' };
  }
}
