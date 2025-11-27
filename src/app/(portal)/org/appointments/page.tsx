import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';
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
import { CancelAppointmentForm } from '../../appointments/cancel-appointment-form';
import { fetchScopedAppointments } from '@/lib/appointments/queries';
import { confirmAppointment, cancelAppointmentAsStaff } from '@/lib/appointments/actions';
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

function ConfirmForm({
  appointment,
  onConfirm,
}: {
  appointment: AppointmentWithRelations;
  onConfirm: (formData: FormData) => Promise<void>;
}) {
  const quickSlots = generateAvailabilitySlots();

  return (
    <form action={onConfirm} className="space-y-space-xs rounded-lg border border-outline/20 p-space-sm">
      <input type="hidden" name="appointment_id" value={appointment.id} />
      <div className="grid gap-space-xs sm:grid-cols-2">
        <Input
          type="datetime-local"
          name="occurs_at"
          required
          defaultValue={appointment.occurs_at?.slice(0, 16)}
          className="sm:w-full"
        />
        <Input
          name="location"
          placeholder="Meeting room or link"
          defaultValue={appointment.location ?? ''}
          className="sm:w-full"
        />
      </div>
      <div className="grid gap-space-xs sm:grid-cols-2">
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
        <Input name="meeting_url" placeholder="Meeting link / phone (optional)" defaultValue={appointment.meeting_url ?? ''} />
      </div>
      <AvailabilityPicker slots={quickSlots} targetInputId={`occurs-${appointment.id}`} />
      <ProfileSearch
        name="staff_profile_id"
        label="Assign staff (optional)"
        scope="staff"
        defaultValue={appointment.staff_profile_id ?? ''}
        placeholder="Search staff"
        helperText="Leave blank to stay unassigned."
      />
      <Textarea
        name="notes"
        placeholder="Include prep notes or access info"
        defaultValue={appointment.reschedule_note ?? ''}
        rows={2}
      />
      <div className="flex flex-wrap gap-space-sm">
        <Button type="submit" size="sm">
          Confirm
        </Button>
        <CancelAppointmentForm action={cancelAppointmentAsStaff} appointmentId={appointment.id} />
      </div>
    </form>
  );
}

export default async function OrgAppointmentsPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessOrgWorkspace) {
    redirect(resolveDefaultWorkspacePath(access));
  }

  await ensurePortalProfile(supabase, access.userId);

  const { upcoming, past } = await fetchScopedAppointments(supabase, access, { includeCompleted: true });

  const handleConfirm = async (formData: FormData) => {
    await confirmAppointment(formData);
  };

  return (
    <div className="space-y-space-lg">
      <header className="space-y-space-2xs">
        <p className="text-label-sm font-semibold uppercase text-muted-foreground">Appointments</p>
        <h1 className="text-headline-lg text-on-surface">Organization requests</h1>
        <p className="max-w-3xl text-body-md text-muted-foreground">
          Manage appointment requests linked to your organization and confirm times with clients.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-title-lg">Pending</CardTitle>
        </CardHeader>
        <CardContent className="space-y-space-md">
          {upcoming.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">No pending appointments.</p>
          ) : (
            upcoming.map((appointment) => (
              <article key={appointment.id} className="rounded-xl border border-outline/20 bg-surface-container-low p-space-md shadow-level-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-title-md font-semibold text-on-surface">{appointment.title}</p>
                    <p className="text-body-sm text-muted-foreground">
                      {appointment.client?.display_name ?? 'Client'} · {appointment.requested_window ?? 'no window provided'}
                    </p>
                  </div>
                  <Badge className="capitalize">{appointment.status.replaceAll('_', ' ')}</Badge>
                </div>
                <p className="text-body-sm text-on-surface/80">Preferred time: {appointment.requested_window ?? 'unspecified'}</p>
                {appointment.meeting_url ? (
                  <p className="text-body-sm text-primary">
                    <a className="underline-offset-4 hover:underline" href={appointment.meeting_url} target="_blank" rel="noreferrer">
                      Open meeting link
                    </a>
                  </p>
                ) : null}
                <ConfirmForm appointment={appointment} onConfirm={handleConfirm} />
              </article>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-title-lg">History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-space-sm">
          {past.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">No history yet.</p>
          ) : (
            past.map((appointment) => (
              <div key={appointment.id} className="rounded-md border border-outline/15 bg-surface p-space-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-body-md font-medium text-on-surface">{appointment.title}</p>
                  <Badge variant="outline" className="capitalize">{appointment.status.replaceAll('_', ' ')}</Badge>
                </div>
                <p className="text-body-sm text-muted-foreground">{formatDate(appointment.occurs_at)}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
