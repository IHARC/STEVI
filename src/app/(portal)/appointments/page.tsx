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

      <section aria-labelledby="upcoming-appointments">
        <Card>
          <CardHeader className="flex flex-col gap-space-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle id="upcoming-appointments" className="text-title-lg">
                Upcoming appointments
              </CardTitle>
              <p className="text-body-sm text-muted-foreground">
                Confirmed sessions appear here once staff approve your request.
              </p>
            </div>
            <Button variant="outline" asChild className="text-label-md font-medium">
              <a href="#request-form">Request change</a>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-space-md">
            {upcoming.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">
                No appointments booked yet. Use the request form below or call your outreach worker
                to set something up.
              </p>
            ) : (
              upcoming.map((appointment) => (
                <article
                  key={appointment.id}
                  className="rounded-xl border border-outline/20 bg-surface-container-low p-space-md shadow-level-1"
                  aria-labelledby={`upcoming-${appointment.id}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 id={`upcoming-${appointment.id}`} className="text-title-md font-medium">
                      {appointment.title}
                    </h2>
                    <Badge className="capitalize">{appointment.status.replaceAll('_', ' ')}</Badge>
                  </div>
                  <dl className="mt-space-sm space-y-[0.35rem] text-body-sm text-on-surface/80">
                    <div className="flex flex-wrap gap-1">
                      <dt className="font-medium text-on-surface/70">When:</dt>
                      <dd>{formatOccursAt(appointment.occurs_at)}</dd>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <dt className="font-medium text-on-surface/70">Where:</dt>
                      <dd>{appointment.location ?? 'To be confirmed'}</dd>
                      <dd className="text-on-surface/60">({appointment.location_type.replaceAll('_', ' ')})</dd>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <dt className="font-medium text-on-surface/70">Staff contact:</dt>
                      <dd>{appointment.staff?.display_name ?? 'To be assigned'}</dd>
                    </div>
                    {appointment.meeting_url ? (
                      <div className="flex flex-wrap gap-1">
                        <dt className="font-medium text-on-surface/70">Join:</dt>
                        <dd>
                          <a
                            className="text-primary underline-offset-4 hover:underline"
                            href={appointment.meeting_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Meeting link
                          </a>
                        </dd>
                      </div>
                    ) : null}
                    {appointment.reschedule_note ? (
                      <div className="flex flex-wrap gap-1">
                        <dt className="font-medium text-on-surface/70">Notes:</dt>
                        <dd>{appointment.reschedule_note}</dd>
                      </div>
                    ) : null}
                    {appointment.requested_window ? (
                      <div className="flex flex-wrap gap-1">
                        <dt className="font-medium text-on-surface/70">Requested window:</dt>
                        <dd>{appointment.requested_window}</dd>
                      </div>
                    ) : null}
                  </dl>
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
                </article>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="appointment-history">
        <Card>
          <CardHeader>
            <CardTitle id="appointment-history" className="text-title-lg">
              Recent history
            </CardTitle>
            <p className="text-body-md text-muted-foreground">
              Outreach staff keep these records synced with STEVI Ops. Reach out if something looks
              incorrect.
            </p>
          </CardHeader>
          <CardContent className="grid gap-space-md sm:grid-cols-2">
            {past.map((appointment: AppointmentWithRelations) => (
              <article
                key={appointment.id}
                className="rounded-xl border border-outline/20 bg-surface-container-low p-space-md"
                aria-labelledby={`history-${appointment.id}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 id={`history-${appointment.id}`} className="text-title-sm font-medium">
                    {appointment.title}
                  </h2>
                  <Badge variant={appointment.status === 'completed' ? 'secondary' : 'outline'}>
                    {appointment.status.replaceAll('_', ' ')}
                  </Badge>
                </div>
                <p className="mt-space-xs text-body-sm text-muted-foreground">
                  {formatOccursAt(appointment.occurs_at)} · {appointment.location_type.replaceAll('_', ' ')}
                </p>
                <p className="text-body-sm text-on-surface/80">
                  With {appointment.staff?.display_name ?? 'outreach team'}
                </p>
                {appointment.meeting_url ? (
                  <p className="text-body-sm text-primary">
                    <a
                      className="underline-offset-4 hover:underline"
                      href={appointment.meeting_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open meeting link
                    </a>
                  </p>
                ) : null}
                {appointment.outcome_notes ? (
                  <p className="mt-space-xs text-body-sm text-on-surface/70">{appointment.outcome_notes}</p>
                ) : null}
              </article>
            ))}
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
