import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { ensurePortalProfile } from '@/lib/profile';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/ui/card';
import { Badge } from '@shared/ui/badge';
import { Input } from '@shared/ui/input';
import { Textarea } from '@shared/ui/textarea';
import { Button } from '@shared/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import { ProfileSearch } from '@workspace/appointments/profile-search';
import { AvailabilityPicker } from '@workspace/appointments/availability-picker';
import { generateAvailabilitySlots } from '@/lib/appointments/slots';
import { CancelAppointmentForm } from '@shared/appointments/cancel-appointment-form';
import { fetchScopedAppointments } from '@/lib/appointments/queries';
import { confirmAppointment, cancelAppointmentAsStaff } from '@/lib/appointments/actions';
import type { AppointmentWithRelations } from '@/lib/appointments/types';
import { toLocalDateTimeInput } from '@/lib/datetime';

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
    <form action={onConfirm} className="space-y-2 rounded-lg border border-border/40 p-3">
      <input type="hidden" name="appointment_id" value={appointment.id} />
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          type="datetime-local"
          name="occurs_at"
          id={`occurs-${appointment.id}`}
          required
          defaultValue={toLocalDateTimeInput(appointment.occurs_at)}
          className="sm:w-full"
        />
        <Input
          name="location"
          placeholder="Meeting room or link"
          defaultValue={appointment.location ?? ''}
          className="sm:w-full"
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
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
      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="sm">
          Confirm
        </Button>
        <CancelAppointmentForm action={cancelAppointmentAsStaff} appointmentId={appointment.id} />
      </div>
    </form>
  );
}

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function OrgAppointmentsPage({ searchParams }: PageProps) {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect(resolveLandingPath(access));
  }

  const resolved = searchParams ? await searchParams : undefined;
  const orgParam = resolved?.orgId ?? resolved?.org ?? resolved?.organizationId;
  const parsedOrg = Array.isArray(orgParam) ? Number.parseInt(orgParam[0] ?? '', 10) : Number.parseInt(orgParam ?? '', 10);
  const requestedOrgId = Number.isFinite(parsedOrg) ? parsedOrg : null;
  const targetOrgId = access.organizationId ?? requestedOrgId ?? null;

  if (!targetOrgId && access.canAccessOpsAdmin) {
    redirect('/ops/org');
  }

  const allowed = (access.canAccessOpsOrg && access.organizationId === targetOrgId) || access.canAccessOpsAdmin;
  if (!allowed) {
    redirect(resolveLandingPath(access));
  }

  await ensurePortalProfile(supabase, access.userId);

  const { upcoming, past } = await fetchScopedAppointments(supabase, access, { includeCompleted: true, targetOrgId });

  const handleConfirm = async (formData: FormData) => {
    await confirmAppointment(formData);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Appointments</p>
        <h1 className="text-3xl text-foreground">Organization requests</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Manage appointment requests linked to your organization and confirm times with clients.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Pending</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending appointments.</p>
          ) : (
            upcoming.map((appointment) => (
              <article key={appointment.id} className="rounded-xl border border-border/40 bg-muted p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{appointment.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {appointment.client?.display_name ?? 'Client'} · {appointment.requested_window ?? 'no window provided'}
                    </p>
                  </div>
                  <Badge className="capitalize">{appointment.status.replaceAll('_', ' ')}</Badge>
                </div>
                <p className="text-sm text-foreground/80">Preferred time: {appointment.requested_window ?? 'unspecified'}</p>
                {appointment.meeting_url ? (
                  <p className="text-sm text-primary">
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
          <CardTitle className="text-xl">History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {past.length === 0 ? (
            <p className="text-sm text-muted-foreground">No history yet.</p>
          ) : (
            past.map((appointment) => (
              <div key={appointment.id} className="rounded-md border border-border/15 bg-background p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{appointment.title}</p>
                  <Badge variant="outline" className="capitalize">{appointment.status.replaceAll('_', ' ')}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{formatDate(appointment.occurs_at)}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
