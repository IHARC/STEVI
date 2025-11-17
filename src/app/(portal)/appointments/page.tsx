import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensurePortalProfile } from '@/lib/profile';
import { logAuditEvent } from '@/lib/audit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RequestAppointmentForm } from './request-appointment-form';
import type { AppointmentRequestState } from './types';

export const dynamic = 'force-dynamic';

type AppointmentEntry = {
  id: string;
  title: string;
  occursAt: string;
  location: string;
  staffContact: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
};

const placeholderUpcoming: AppointmentEntry[] = [
  {
    id: 'upcoming-1',
    title: 'Housing options review',
    occursAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    location: 'IHARC Outreach Hub — meeting room 2',
    staffContact: 'Jordan Lee',
    status: 'scheduled',
    notes: 'Bring identification to review supports.',
  },
];

const placeholderHistory: AppointmentEntry[] = [
  {
    id: 'history-1',
    title: 'Rapid Access Addiction Medicine intake',
    occursAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    location: 'Northumberland Hills Hospital',
    staffContact: 'Dr. Sheppard',
    status: 'completed',
    notes: 'Follow-up scheduled for next week.',
  },
  {
    id: 'history-2',
    title: 'Employment services refresher',
    occursAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    location: 'Fidelis Street drop-in centre',
    staffContact: 'Morgan Patel',
    status: 'cancelled',
    notes: 'Rescheduled because of overlapping medical visit.',
  },
];

const appointmentDateFormatter = new Intl.DateTimeFormat('en-CA', {
  dateStyle: 'full',
  timeStyle: 'short',
});

function formatOccursAt(value: string) {
  try {
    return appointmentDateFormatter.format(new Date(value));
  } catch {
    return value;
  }
}

async function submitAppointmentRequest(
  _prev: AppointmentRequestState,
  formData: FormData,
): Promise<AppointmentRequestState> {
  'use server';

  const reason = (formData.get('reason') as string | null)?.trim();
  const preferredDate = (formData.get('preferred_date') as string | null)?.trim();
  const staffPreference = (formData.get('staff_preference') as string | null)?.trim();

  if (!reason || reason.length < 8) {
    return { status: 'error', message: 'Share a brief note so the outreach team can prepare.' };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { status: 'error', message: 'Sign in before requesting an appointment.' };
    }

    const profile = await ensurePortalProfile(supabase, user.id);

    await logAuditEvent(supabase, {
      actorProfileId: profile.id,
      action: 'appointment_request_logged',
      entityType: 'appointment_request',
      entityId: null,
      meta: {
        reason,
        preferred_date: preferredDate || null,
        staff_preference: staffPreference || null,
      },
    });

    return {
      status: 'success',
      message: 'Thanks — the outreach team will review and follow up.',
    };
  } catch {
    return {
      status: 'error',
      message: 'We could not log the request right now. Please try again shortly.',
    };
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
  const upcomingAppointments = placeholderUpcoming;
  const pastAppointments = placeholderHistory;

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
            {upcomingAppointments.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">
                No appointments booked yet. Use the request form below or call your outreach worker
                to set something up.
              </p>
            ) : (
              upcomingAppointments.map((appointment) => (
                <article
                  key={appointment.id}
                  className="rounded-xl border border-outline/20 bg-surface-container-low p-space-md shadow-level-1"
                  aria-labelledby={`upcoming-${appointment.id}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 id={`upcoming-${appointment.id}`} className="text-title-md font-medium">
                      {appointment.title}
                    </h2>
                    <Badge className="capitalize">{appointment.status}</Badge>
                  </div>
                  <dl className="mt-space-sm space-y-[0.35rem] text-body-sm text-on-surface/80">
                    <div className="flex flex-wrap gap-1">
                      <dt className="font-medium text-on-surface/70">When:</dt>
                      <dd>{formatOccursAt(appointment.occursAt)}</dd>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <dt className="font-medium text-on-surface/70">Where:</dt>
                      <dd>{appointment.location}</dd>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <dt className="font-medium text-on-surface/70">Staff contact:</dt>
                      <dd>{appointment.staffContact}</dd>
                    </div>
                    {appointment.notes ? (
                      <div className="flex flex-wrap gap-1">
                        <dt className="font-medium text-on-surface/70">Notes:</dt>
                        <dd>{appointment.notes}</dd>
                      </div>
                    ) : null}
                  </dl>
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
            {pastAppointments.map((appointment) => (
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
                    {appointment.status}
                  </Badge>
                </div>
                <p className="mt-space-xs text-body-sm text-muted-foreground">
                  {formatOccursAt(appointment.occursAt)}
                </p>
                <p className="text-body-sm text-on-surface/80">With {appointment.staffContact}</p>
                {appointment.notes ? (
                  <p className="mt-space-xs text-body-sm text-on-surface/70">{appointment.notes}</p>
                ) : null}
              </article>
            ))}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="request-heading" id="request-form">
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
              action={submitAppointmentRequest}
              profileDisplayName={profile.display_name}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
