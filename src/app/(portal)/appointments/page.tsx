import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensurePortalProfile } from '@/lib/profile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

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

type AppointmentRequestState =
  | { status: 'idle' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };

const INITIAL_REQUEST_STATE: AppointmentRequestState = { status: 'idle' };

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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Appointment support
        </p>
        <h1 className="text-3xl font-semibold text-on-surface sm:text-4xl">
          Manage your outreach appointments
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Request meetings, see upcoming visits, and review past appointments linked with your STEVI
          plan.
        </p>
      </header>

      <section aria-labelledby="upcoming-appointments">
        <Card>
          <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle id="upcoming-appointments" className="text-xl">
                Upcoming appointments
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Confirmed sessions appear here once staff approve your request.
              </p>
            </div>
            <Button variant="outline" asChild>
              <a href="#request-form">Request change</a>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {upcomingAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No appointments booked yet. Use the request form below or call your outreach worker
                to set something up.
              </p>
            ) : (
              upcomingAppointments.map((appointment) => (
                <article
                  key={appointment.id}
                  className="rounded-xl border border-outline/10 bg-surface-container-low p-4 shadow-sm"
                  aria-labelledby={`upcoming-${appointment.id}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 id={`upcoming-${appointment.id}`} className="text-lg font-semibold">
                      {appointment.title}
                    </h2>
                    <Badge className="capitalize">{appointment.status}</Badge>
                  </div>
                  <dl className="mt-3 space-y-1 text-sm text-on-surface/80">
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
            <CardTitle id="appointment-history" className="text-xl">
              Recent history
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Outreach staff keep these records synced with STEVI Ops. Reach out if something looks
              incorrect.
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {pastAppointments.map((appointment) => (
              <article
                key={appointment.id}
                className="rounded-xl border border-outline/10 bg-surface-container-low p-4"
                aria-labelledby={`history-${appointment.id}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 id={`history-${appointment.id}`} className="text-base font-semibold">
                    {appointment.title}
                  </h2>
                  <Badge variant={appointment.status === 'completed' ? 'secondary' : 'outline'}>
                    {appointment.status}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {formatOccursAt(appointment.occursAt)}
                </p>
                <p className="text-sm text-on-surface/80">With {appointment.staffContact}</p>
                {appointment.notes ? (
                  <p className="mt-2 text-sm text-on-surface/70">{appointment.notes}</p>
                ) : null}
              </article>
            ))}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="request-heading" id="request-form">
        <Card>
          <CardHeader>
            <CardTitle id="request-heading" className="text-xl">
              Request a new appointment
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Tell us what you need. The outreach coordinator will respond using your preferred
              contact method.
            </p>
          </CardHeader>
          <CardContent>
            <form action={submitAppointmentRequest} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="reason" className="text-sm font-semibold text-on-surface">
                  What do you want to discuss?
                </label>
                <Textarea
                  id="reason"
                  name="reason"
                  required
                  minLength={8}
                  placeholder="Example: I need help rescheduling my RAAM visit or getting new ID."
                  className="min-h-[120px]"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="preferred-date" className="text-sm font-semibold text-on-surface">
                  Preferred date or time window <span className="text-on-surface/60">(optional)</span>
                </label>
                <Input
                  id="preferred-date"
                  name="preferred_date"
                  placeholder="Example: mornings this week or after 3pm next Tuesday"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="staff-preference" className="text-sm font-semibold text-on-surface">
                  Preferred staff member <span className="text-on-surface/60">(optional)</span>
                </label>
                <Input
                  id="staff-preference"
                  name="staff_preference"
                  placeholder="Example: Jordan, Morgan, peer navigator, or whoever is available"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Submitting will notify the outreach coordination queue linked with STEVI Ops for{' '}
                {profile.display_name ?? 'your profile'}.
              </p>
              <Button type="submit" className="w-full sm:w-auto">
                Send request
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
