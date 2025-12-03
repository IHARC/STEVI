import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { ensurePortalProfile } from '@/lib/profile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AvailabilityPicker } from '@/components/appointments/availability-picker';
import { generateAvailabilitySlots } from '@/lib/appointments/slots';
import { CancelAppointmentForm } from '../../appointments/cancel-appointment-form';
import { ProfileSearch } from '@/components/appointments/profile-search';
import {
  cancelAppointmentAsStaff,
  completeAppointment,
  confirmAppointment,
  createOfflineAppointment,
} from '@/lib/appointments/actions';
import { fetchScopedAppointments } from '@/lib/appointments/queries';
import type { AppointmentWithRelations } from '@/lib/appointments/types';

export const dynamic = 'force-dynamic';

const appointmentFormatter = new Intl.DateTimeFormat('en-CA', {
  dateStyle: 'full',
  timeStyle: 'short',
});

function formatDate(value: string | null) {
  if (!value) return 'Not scheduled yet';
  try {
    return appointmentFormatter.format(new Date(value));
  } catch {
    return value;
  }
}

function StaffScheduleForm({
  appointment,
  onConfirm,
  onCancel,
}: {
  appointment: AppointmentWithRelations;
  onConfirm: (formData: FormData) => Promise<void>;
  onCancel: (formData: FormData) => Promise<void>;
}) {
  const quickSlots = generateAvailabilitySlots();

  return (
    <form action={onConfirm} className="space-y-space-xs rounded-lg border border-outline/30 p-space-sm">
      <input type="hidden" name="appointment_id" value={appointment.id} />
      <div className="grid gap-space-xs sm:grid-cols-2">
        <div className="space-y-space-2xs">
          <label className="text-label-sm text-on-surface/80" htmlFor={`occurs-${appointment.id}`}>
            Date & time
          </label>
          <Input
            id={`occurs-${appointment.id}`}
            name="occurs_at"
            type="datetime-local"
            required
            defaultValue={appointment.occurs_at?.slice(0, 16)}
          />
        </div>
        <div className="space-y-space-2xs">
          <label className="text-label-sm text-on-surface/80" htmlFor={`location-${appointment.id}`}>
            Location / meeting link
          </label>
          <Input
            id={`location-${appointment.id}`}
            name="location"
            placeholder="IHARC Outreach Hub, phone, or meeting link"
            defaultValue={appointment.location ?? ''}
          />
        </div>
      </div>
      <div className="grid gap-space-xs sm:grid-cols-2">
        <div className="space-y-space-2xs">
          <label className="text-label-sm text-on-surface/80" htmlFor={`duration-${appointment.id}`}>
            Duration (minutes)
          </label>
          <Input
            id={`duration-${appointment.id}`}
            name="duration_minutes"
            type="number"
            min={15}
            step={15}
            defaultValue={appointment.duration_minutes ?? 60}
          />
        </div>
        <div className="space-y-space-2xs">
          <label className="text-label-sm text-on-surface/80" htmlFor={`location-type-${appointment.id}`}>
            Meeting type
          </label>
          <Select name="location_type" defaultValue={appointment.location_type ?? 'in_person'}>
            <SelectTrigger id={`location-type-${appointment.id}`}>
              <SelectValue placeholder="Select a type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="in_person">In person</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="field">Field / outreach</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-space-xs sm:grid-cols-2">
        <div className="space-y-space-2xs">
          <label className="text-label-sm text-on-surface/80" htmlFor={`meeting-url-${appointment.id}`}>
            Meeting link / call-back (optional)
          </label>
          <Input
            id={`meeting-url-${appointment.id}`}
            name="meeting_url"
            placeholder="Zoom/Teams link or phone number"
            defaultValue={appointment.meeting_url ?? ''}
          />
        </div>
        <div className="space-y-space-2xs">
          <label className="text-label-sm text-on-surface/80" htmlFor={`notes-${appointment.id}`}>
            Notes to client (optional)
          </label>
          <Textarea
            id={`notes-${appointment.id}`}
            name="notes"
            rows={2}
            placeholder="Add context or prep steps"
            defaultValue={appointment.reschedule_note ?? ''}
          />
        </div>
      </div>
      <AvailabilityPicker slots={quickSlots} targetInputId={`occurs-${appointment.id}`} />
      <ProfileSearch
        name="staff_profile_id"
        label="Assign staff (optional)"
        scope="staff"
        defaultValue={appointment.staff_profile_id ?? ''}
        placeholder="Search staff"
        helperText="Leave blank to stay assigned to you."
      />
      <div className="flex flex-wrap gap-space-sm">
        <Button type="submit" size="sm">
          Confirm & schedule
        </Button>
        <CancelAppointmentForm
          action={onCancel}
          appointmentId={appointment.id}
          variant="destructive"
        />
      </div>
    </form>
  );
}

function CompleteForm({
  appointment,
  onComplete,
}: {
  appointment: AppointmentWithRelations;
  onComplete: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={onComplete} className="flex flex-col gap-space-xs sm:flex-row sm:items-center">
      <input type="hidden" name="appointment_id" value={appointment.id} />
      <Textarea
        name="outcome_notes"
        placeholder="Outcome or follow-up notes"
        className="sm:min-w-[240px]"
        rows={2}
      />
      <Button type="submit" size="sm" variant="secondary">
        Mark complete
      </Button>
    </form>
  );
}

export default async function StaffAppointmentsPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessStaffWorkspace) {
    redirect(resolveLandingPath(access));
  }

  // Ensure profile exists for downstream actions.
  await ensurePortalProfile(supabase, access.userId);
  const { upcoming, past } = await fetchScopedAppointments(supabase, access, { includeCompleted: true });
  const quickSlots = generateAvailabilitySlots();

  const handleConfirm = async (formData: FormData) => {
    await confirmAppointment(formData);
  };

  const handleComplete = async (formData: FormData) => {
    await completeAppointment(formData);
  };

  const handleCancel = async (formData: FormData) => {
    await cancelAppointmentAsStaff(formData);
  };

  const handleCreateOffline = async (formData: FormData) => {
    await createOfflineAppointment(formData);
  };

  const needsAction = upcoming.filter((appt) =>
    ['requested', 'pending_confirmation', 'reschedule_requested'].includes(appt.status),
  );
  const scheduled = upcoming.filter((appt) => appt.status === 'scheduled');

  return (
    <div className="space-y-space-lg">
      <header className="space-y-space-2xs">
        <p className="text-label-sm font-semibold uppercase text-muted-foreground">Appointments</p>
        <h1 className="text-headline-lg text-on-surface">Review and schedule requests</h1>
        <p className="max-w-3xl text-body-md text-muted-foreground">
          Confirm client requests, book offline appointments, and keep outcomes up to date. This list is scoped to your assignments and organization.
        </p>
      </header>

      <div className="grid gap-space-lg lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-title-lg">Quick offline booking</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              action={handleCreateOffline}
              className="grid gap-space-sm"
            >
              <div className="grid gap-space-sm sm:grid-cols-2">
                <ProfileSearch
                  name="client_profile_id"
                  label="Client"
                  scope="client"
                  placeholder="Search clients by name"
                  required
                />
                <div className="space-y-space-2xs">
                  <label className="text-label-sm text-on-surface/80" htmlFor="offline-occurs">
                    Date & time (optional)
                  </label>
                  <Input id="offline-occurs" name="occurs_at" type="datetime-local" />
                </div>
              </div>
              <Input name="title" placeholder="Appointment title" required />
              <div className="grid gap-space-sm sm:grid-cols-2">
                <Input name="location" placeholder="Location or meeting link" />
                <Input name="duration_minutes" type="number" min={15} step={15} defaultValue={60} />
              </div>
              <div className="grid gap-space-sm sm:grid-cols-2">
                <Select name="location_type" defaultValue="in_person">
                  <SelectTrigger>
                    <SelectValue placeholder="Meeting type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_person">In person</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="field">Field / outreach</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Input name="meeting_url" placeholder="Meeting link / phone (optional)" />
              </div>
              <AvailabilityPicker slots={quickSlots} targetInputId="offline-occurs" label="Suggested slots" />
              <ProfileSearch
                name="staff_profile_id"
                label="Assign staff (optional)"
                scope="staff"
                placeholder="Search staff"
                helperText="Leave blank to assign yourself."
              />
              <Button type="submit" className="w-fit" size="sm">
                Create appointment
              </Button>
              <p className="text-body-xs text-muted-foreground">
                Use profile IDs from the client directory. Booking without a time will keep the request in pending status.
              </p>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-title-lg">Needs attention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-space-md">
            {needsAction.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">No pending requests right now.</p>
            ) : (
              needsAction.map((appointment) => (
                <article
                  key={appointment.id}
                  className="rounded-xl border border-outline/20 bg-surface-container-low p-space-md shadow-level-1"
                  aria-labelledby={`needs-${appointment.id}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 id={`needs-${appointment.id}`} className="text-title-md font-medium text-on-surface">
                        {appointment.title}
                      </h2>
                      <p className="text-body-sm text-muted-foreground">
                        {appointment.client?.display_name ?? 'Client'} · {appointment.organization?.name ?? 'IHARC'}
                      </p>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {appointment.status.replaceAll('_', ' ')}
                  </Badge>
                </div>
                <dl className="mt-space-xs space-y-[0.3rem] text-body-sm text-on-surface/80">
                    {appointment.requested_window ? (
                      <div className="flex flex-wrap gap-1">
                        <dt className="font-medium text-on-surface/70">Requested window:</dt>
                        <dd>{appointment.requested_window}</dd>
                      </div>
                    ) : null}
                    {appointment.description ? (
                      <div className="flex flex-wrap gap-1">
                        <dt className="font-medium text-on-surface/70">Description:</dt>
                        <dd>{appointment.description}</dd>
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-1">
                      <dt className="font-medium text-on-surface/70">Preferred type:</dt>
                      <dd>{appointment.location_type.replaceAll('_', ' ')}</dd>
                    </div>
                  </dl>

                  <div className="mt-space-md space-y-space-sm">
                    <StaffScheduleForm
                      appointment={appointment}
                      onConfirm={handleConfirm}
                      onCancel={handleCancel}
                    />
                  </div>
                </article>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-title-lg">Scheduled</CardTitle>
          </CardHeader>
          <CardContent className="space-y-space-md">
            {scheduled.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">No scheduled appointments.</p>
            ) : (
              scheduled.map((appointment) => (
                <article key={appointment.id} className="rounded-lg border border-outline/20 p-space-md shadow-level-1">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-title-sm font-semibold text-on-surface">{appointment.title}</p>
                    <p className="text-body-sm text-muted-foreground">{appointment.client?.display_name ?? 'Client'}</p>
                  </div>
                  <Badge className="capitalize">{appointment.status}</Badge>
                </div>
                <p className="mt-space-2xs text-body-sm text-on-surface/80">{formatDate(appointment.occurs_at)}</p>
                <p className="text-body-sm text-muted-foreground">
                  {appointment.location ?? 'Location TBD'} · {appointment.location_type.replaceAll('_', ' ')}
                </p>
                {appointment.meeting_url ? (
                  <p className="text-body-sm text-primary">
                    <a className="underline-offset-4 hover:underline" href={appointment.meeting_url} target="_blank" rel="noreferrer">
                      Open meeting link
                    </a>
                  </p>
                ) : null}
                  <div className="mt-space-sm flex flex-wrap gap-space-sm">
                    <CompleteForm appointment={appointment} onComplete={handleComplete} />
                    <CancelAppointmentForm action={handleCancel} appointmentId={appointment.id} variant="secondary" />
                  </div>
                </article>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-title-lg">Completed & cancelled</CardTitle>
          </CardHeader>
          <CardContent className="space-y-space-sm">
            {past.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">No history yet.</p>
            ) : (
              past.map((appointment) => (
                <article key={appointment.id} className="rounded-md border border-outline/15 bg-surface p-space-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-body-md font-medium text-on-surface">{appointment.title}</p>
                    <Badge variant="outline" className="capitalize">
                      {appointment.status.replaceAll('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-body-sm text-muted-foreground">{formatDate(appointment.occurs_at)}</p>
                  {appointment.outcome_notes ? (
                    <p className="text-body-sm text-on-surface/80">{appointment.outcome_notes}</p>
                  ) : null}
                </article>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
