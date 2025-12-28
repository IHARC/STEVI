export type AppointmentStatus =
  | 'requested'
  | 'pending_confirmation'
  | 'scheduled'
  | 'reschedule_requested'
  | 'cancelled_by_client'
  | 'cancelled_by_staff'
  | 'completed'
  | 'no_show';

export type AppointmentChannel = 'in_person' | 'phone' | 'video' | 'field' | 'other';

export type AppointmentRecord = {
  id: string;
  title: string;
  description: string | null;
  status: AppointmentStatus;
  requested_window: string | null;
  occurs_at: string | null;
  duration_minutes: number | null;
  location: string | null;
  location_type: AppointmentChannel;
  meeting_url: string | null;
  client_profile_id: string;
  requester_profile_id: string;
  staff_profile_id: string | null;
  staff_role: string | null;
  organization_id: number | null;
  confirmed_at: string | null;
  confirmed_by_profile_id: string | null;
  canceled_at: string | null;
  cancellation_reason: string | null;
  reschedule_note: string | null;
  outcome_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AppointmentWithRelations = AppointmentRecord & {
  client?: { id: string; display_name: string | null; organization_id: number | null } | null;
  requester?: { id: string; display_name: string | null } | null;
  staff?: { id: string; display_name: string | null } | null;
  organization?: { id: number | null; name: string | null } | null;
};
