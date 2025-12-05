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
import { ProfileSearch } from '@/components/appointments/profile-search';
import { AvailabilityPicker } from '@/components/appointments/availability-picker';
import { generateAvailabilitySlots } from '@/lib/appointments/slots';
import { fetchScopedAppointments } from '@/lib/appointments/queries';
import {
  cancelAppointmentAsStaff,
  confirmAppointment,
  completeAppointment,
} from '@/lib/appointments/actions';
import { CancelAppointmentForm } from '../../appointments/cancel-appointment-form';
import type { AppointmentWithRelations } from '@/lib/appointments/types';

export const dynamic = 'force-dynamic';

const formatter = new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short' });

function formatDate(value: string | null) {
  if (!value) return 'Not scheduled yet';
  try {
    return formatter.format(new Date(value));
  } catch {
    return value;
  }
}

function AdminConfirmForm({
  appointment,
  onConfirm,
}: {
  appointment: AppointmentWithRelations;
  onConfirm: (formData: FormData) => Promise<void>;
}) {
  const quickSlots = generateAvailabilitySlots();

  return (
    <form action={onConfirm} className="grid gap-2 md:grid-cols-3">
      <input type="hidden" name="appointment_id" value={appointment.id} />
      <Input
        type="datetime-local"
        name="occurs_at"
        required
        defaultValue={appointment.occurs_at?.slice(0, 16)}
      />
      <Input name="location" placeholder="Location or link" defaultValue={appointment.location ?? ''} />
      <Select name="location_type" defaultValue={appointment.location_type ?? 'in_person'}>
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
      <Input name="meeting_url" placeholder="Meeting link / phone" defaultValue={appointment.meeting_url ?? ''} />
      <ProfileSearch
        name="staff_profile_id"
        label="Assign staff (optional)"
        scope="staff"
        defaultValue={appointment.staff_profile_id ?? ''}
        placeholder="Search staff"
        helperText="Leave blank to stay unassigned."
      />
      <AvailabilityPicker slots={quickSlots} targetInputId={`occurs-${appointment.id}`} />
      <Button type="submit" size="sm" className="md:col-span-3 w-fit">
        Confirm
      </Button>
    </form>
  );
}

function AdminCompleteForm({
  appointment,
  onComplete,
}: {
  appointment: AppointmentWithRelations;
  onComplete: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={onComplete} className="grid gap-2 md:grid-cols-[1fr_auto]">
      <input type="hidden" name="appointment_id" value={appointment.id} />
      <Textarea
        name="outcome_notes"
        rows={2}
        placeholder="Outcome notes"
        defaultValue={appointment.outcome_notes ?? ''}
      />
      <Button type="submit" variant="secondary" size="sm">
        Complete
      </Button>
    </form>
  );
}

export default async function AdminAppointmentsPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessAdminWorkspace) {
    redirect(resolveLandingPath(access));
  }

  await ensurePortalProfile(supabase, access.userId);

  const handleConfirm = async (formData: FormData) => {
    await confirmAppointment(formData);
  };

  const handleCancel = async (formData: FormData) => {
    await cancelAppointmentAsStaff(formData);
  };

  const handleComplete = async (formData: FormData) => {
    await completeAppointment(formData);
  };

  const { upcoming, past } = await fetchScopedAppointments(supabase, access, { includeCompleted: true });

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Operations</p>
        <h1 className="text-3xl text-foreground">Appointments overview</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Monitor all appointment activity across organizations. Confirm, reassign, or complete bookings when additional support is needed.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Upcoming & pending</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
          ) : (
            upcoming.map((appointment) => (
              <article key={appointment.id} className="rounded-xl border border-border/40 bg-muted p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{appointment.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {appointment.client?.display_name ?? 'Client'} · {appointment.organization?.name ?? 'IHARC'}
                    </p>
                  </div>
                  <Badge className="capitalize">{appointment.status.replaceAll('_', ' ')}</Badge>
                </div>
                <p className="text-sm text-foreground/80">{formatDate(appointment.occurs_at)}</p>
                {appointment.meeting_url ? (
                  <p className="text-sm text-primary">
                    <a className="underline-offset-4 hover:underline" href={appointment.meeting_url} target="_blank" rel="noreferrer">
                      Open meeting link
                    </a>
                  </p>
                ) : null}
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <AdminConfirmForm appointment={appointment} onConfirm={handleConfirm} />
                  <div className="flex flex-wrap gap-3">
                    <CancelAppointmentForm action={handleCancel} appointmentId={appointment.id} />
                  </div>
                </div>
              </article>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Completed & cancelled</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {past.length === 0 ? (
            <p className="text-sm text-muted-foreground">No history recorded.</p>
          ) : (
            past.map((appointment) => (
              <article key={appointment.id} className="rounded-md border border-border/15 bg-background p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{appointment.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {appointment.client?.display_name ?? 'Client'} · {appointment.organization?.name ?? 'IHARC'}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">{appointment.status.replaceAll('_', ' ')}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{formatDate(appointment.occurs_at)}</p>
                {appointment.outcome_notes ? (
                  <p className="text-sm text-foreground/80">{appointment.outcome_notes}</p>
                ) : null}
                <div className="mt-1">
                  <AdminCompleteForm appointment={appointment} onComplete={handleComplete} />
                </div>
              </article>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
