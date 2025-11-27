import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RequestAppointmentForm } from './request-appointment-form';
import { ClientPreviewGuard } from '@/components/layout/client-preview-guard';
import { RequestRescheduleForm } from './request-reschedule-form';
import { CancelAppointmentForm } from './cancel-appointment-form';
import { fetchClientAppointments } from '@/lib/appointments/queries';
import {
  cancelAppointmentAsClient,
  requestAppointmentAction,
  requestRescheduleAsClient,
} from '@/lib/appointments/actions';
import type { AppointmentWithRelations } from '@/lib/appointments/types';

export const dynamic = 'force-dynamic';

const appointmentDateFormatter = new Intl.DateTimeFormat('en-CA', {
  dateStyle: 'full',
  timeStyle: 'short',
});

function formatOccursAt(value: string | null) {
  try {
    return value ? appointmentDateFormatter.format(new Date(value)) : 'Not scheduled yet';
  } catch {
    return value;
  }
}

function formatLocationType(value: string | null | undefined): string {
  if (!value) return 'unspecified';
  return value.replaceAll('_', ' ');
}

function getAppointmentDateValue(value: AppointmentWithRelations) {
  return value.occurs_at ?? value.created_at ?? value.updated_at ?? value.requested_window ?? '';
}

function sortAppointmentsByDate(a: AppointmentWithRelations, b: AppointmentWithRelations) {
  const aTime = new Date(getAppointmentDateValue(a)).getTime();
  const bTime = new Date(getAppointmentDateValue(b)).getTime();

  if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
  if (Number.isNaN(aTime)) return 1;
  if (Number.isNaN(bTime)) return -1;
  return aTime - bTime;
}

function formatStatusLabel(status: AppointmentWithRelations['status']): string {
  switch (status) {
    case 'requested':
    case 'pending_confirmation':
    case 'reschedule_requested':
      return 'Needs confirmation';
    case 'scheduled':
      return 'Scheduled';
    case 'completed':
      return 'Completed';
    case 'no_show':
      return 'Missed';
    case 'cancelled_by_client':
    case 'cancelled_by_staff':
      return 'Cancelled';
    default:
      return String(status).replaceAll('_', ' ');
  }
}

function statusBadgeVariant(status: AppointmentWithRelations['status']): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (status === 'completed') return 'secondary';
  if (status === 'cancelled_by_client' || status === 'cancelled_by_staff') return 'outline';
  if (status === 'no_show') return 'destructive';
  return 'default';
}

export default async function AppointmentsPage() {
  const supabase = await createSupabaseRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/appointments');
  }

  const profile = await ensurePortalProfile(supabase, user.id);
  const { upcoming, past } = await fetchClientAppointments(supabase, profile.id);

  const timeline = [...upcoming, ...past].sort((a, b) => sortAppointmentsByDate(a, b));
  const hasAppointments = timeline.length > 0;

  return (
    <div className="page-shell page-stack">
      <header className="flex flex-col gap-space-xs">
        <p className="text-label-sm font-medium uppercase text-muted-foreground">
          Appointment support
        </p>
        <h1 className="text-headline-lg text-on-surface sm:text-display-sm">
          Manage your outreach appointments
        </h1>
        <p className="max-w-2xl text-body-md text-muted-foreground sm:text-body-lg">
          Request meetings, see upcoming visits, and review past appointments linked with your STEVI
          plan.
        </p>
      </header>

      <section aria-labelledby="appointments-timeline">
        <Card>
          <CardHeader className="flex flex-col gap-space-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle id="appointments-timeline" className="text-title-lg">
                Appointments timeline
              </CardTitle>
              <p className="text-body-sm text-muted-foreground">
                All upcoming and past appointments in one place. We respond to new requests within one business day.
              </p>
            </div>
            <Button variant="outline" asChild className="text-label-md font-medium">
              <a href="#request-form">Request change</a>
            </Button>
          </CardHeader>
          <CardContent className="space-y-space-md">
            {!hasAppointments ? (
              <div className="rounded-xl border border-dashed border-outline/30 bg-surface-container-low p-space-md text-body-sm text-muted-foreground">
                <p className="font-medium text-on-surface">No appointments yet</p>
                <p className="mt-space-2xs">
                  Send us your availability and preferred contact method. The outreach coordinator will confirm and add the visit here.
                </p>
                <div className="mt-space-sm flex flex-wrap gap-space-sm">
                  <Button asChild size="sm">
                    <a href="#request-form">Request an appointment</a>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a href="/support">Message support</a>
                  </Button>
                </div>
              </div>
            ) : (
              <ol className="space-y-space-sm">
                {timeline.map((appointment) => {
                  const formattedWhen = formatOccursAt(appointment.occurs_at);
                  const status = formatStatusLabel(appointment.status);
                  const badgeVariant = statusBadgeVariant(appointment.status);
                  const isActionable = appointment.status !== 'completed' &&
                    appointment.status !== 'cancelled_by_client' &&
                    appointment.status !== 'cancelled_by_staff' &&
                    appointment.status !== 'no_show';

                  return (
                    <li
                      key={appointment.id}
                      className="rounded-xl border border-outline/20 bg-surface-container-low p-space-md shadow-level-1"
                      aria-labelledby={`appt-${appointment.id}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-space-sm">
                        <div className="space-y-space-2xs">
                          <p className="text-label-sm text-muted-foreground">{formattedWhen}</p>
                          <h2 id={`appt-${appointment.id}`} className="text-title-md font-medium text-on-surface">
                            {appointment.title}
                          </h2>
                          <p className="text-body-sm text-on-surface/80">
                            With {appointment.staff?.display_name ?? 'outreach team'}
                          </p>
                          <p className="text-body-sm text-muted-foreground">
                            {appointment.location ?? 'To be confirmed'} · {formatLocationType(appointment.location_type)}
                          </p>
                          {appointment.meeting_url ? (
                            <p className="text-body-sm">
                              <a
                                className="text-primary underline-offset-4 hover:underline"
                                href={appointment.meeting_url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Join meeting link
                              </a>
                            </p>
                          ) : null}
                          {appointment.requested_window ? (
                            <p className="text-label-sm text-muted-foreground">Requested window: {appointment.requested_window}</p>
                          ) : null}
                          {appointment.outcome_notes ? (
                            <p className="text-body-sm text-on-surface/80">Outcome: {appointment.outcome_notes}</p>
                          ) : null}
                        </div>
                        <Badge variant={badgeVariant} className="capitalize">
                          {status}
                        </Badge>
                      </div>

                      {isActionable ? (
                        <ClientPreviewGuard message="Requests are disabled while in preview mode.">
                          <div className="mt-space-sm flex flex-wrap gap-space-sm">
                            <RequestRescheduleForm
                              action={requestRescheduleAsClient}
                              appointmentId={appointment.id}
                            />
                            <CancelAppointmentForm
                              action={cancelAppointmentAsClient}
                              appointmentId={appointment.id}
                              variant="secondary"
                            />
                          </div>
                        </ClientPreviewGuard>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            )}

            <p className="text-body-sm text-muted-foreground">
              If plans change on the day-of, call the coordination desk at <a href="tel:289-555-0100" className="text-primary underline-offset-4 hover:underline">289-555-0100</a>. We keep this log synced with STEVI Ops so staff stay aligned.
            </p>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="request-heading" id="request-form">
        <ClientPreviewGuard message="Requests are disabled while you preview the client portal. Exit preview to submit.">
          <Card>
            <CardHeader>
              <CardTitle id="request-heading" className="text-title-lg">
                Request a new appointment
              </CardTitle>
              <p className="text-body-sm text-muted-foreground">
                Tell us what you need. The outreach coordinator will respond using your preferred
                contact method.
              </p>
            </CardHeader>
            <CardContent>
              <RequestAppointmentForm
                action={requestAppointmentAction}
                profileDisplayName={profile.display_name}
              />
            </CardContent>
          </Card>
        </ClientPreviewGuard>
      </section>
    </div>
  );
}
