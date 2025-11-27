import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClientPreviewGuard } from '@/components/layout/client-preview-guard';
import { fetchClientAppointments } from '@/lib/appointments/queries';
import type { AppointmentWithRelations } from '@/lib/appointments/types';
import { findPersonForUser } from '@/lib/cases/person';

export const dynamic = 'force-dynamic';

type AppointmentPreview = {
  id: string;
  title: string;
  occursAt: string;
  location: string;
  staffContact: string;
  status: 'scheduled' | 'requested' | 'completed';
  locationType?: string;
  meetingUrl?: string | null;
};

type SupportContact = {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  available: string;
};

const supportTeam: SupportContact[] = [
  {
    id: 'primary-worker',
    name: 'Jordan Lee',
    role: 'Primary outreach worker',
    phone: '289-555-0150',
    email: 'jordan.lee@iharc.ca',
    available: 'Weekdays 9:00–17:00',
  },
  {
    id: 'peer-support',
    name: 'Morgan Patel',
    role: 'Peer navigator',
    phone: '289-555-0163',
    email: 'morgan.patel@iharc.ca',
    available: 'Drop-ins Tue & Thu 11:00–15:00',
  },
];

const appointmentFormatter = new Intl.DateTimeFormat('en-CA', {
  dateStyle: 'full',
  timeStyle: 'short',
});

function formatAppointmentDate(value: string) {
  try {
    return appointmentFormatter.format(new Date(value));
  } catch {
    return value;
  }
}

export default async function HomePage() {
  const supabase = await createSupabaseRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/home');
  }

  const profile = await ensurePortalProfile(supabase, user.id);
  const person = await findPersonForUser(supabase, user.id);
  const { upcoming, past } = await fetchClientAppointments(supabase, profile.id);
  const timelineSource = [...upcoming, ...past]
    .sort((a, b) => new Date(a.occurs_at ?? a.created_at ?? 0).getTime() - new Date(b.occurs_at ?? b.created_at ?? 0).getTime())
    .slice(0, 4);
  const appointments: AppointmentPreview[] = timelineSource.map((appt: AppointmentWithRelations) => ({
    id: appt.id,
    title: appt.title,
    occursAt: appt.occurs_at ?? appt.created_at,
    location: appt.location ?? 'To be confirmed',
    staffContact: appt.staff?.display_name ?? 'Outreach team',
    status:
      appt.status === 'scheduled'
        ? 'scheduled'
        : appt.status === 'completed'
          ? 'completed'
          : 'requested',
    locationType: appt.location_type,
    meetingUrl: appt.meeting_url,
  }));

  const preferredName = profile.display_name || 'Community member';
  const preferredPronouns = person?.preferred_pronouns ?? 'Not provided';
  const preferredContact = person?.preferred_contact_method ?? 'Not provided';

  return (
    <div className="page-shell page-stack">
      <header className="flex flex-col gap-space-sm rounded-2xl border border-outline/20 bg-surface-container-low p-space-md shadow-level-1">
        <div className="flex flex-col gap-space-2xs sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-label-sm font-medium uppercase text-muted-foreground">Welcome back</p>
            <h1 className="text-headline-lg text-on-surface sm:text-display-sm">
              Hi {preferredName}, you’re connected to STEVI
            </h1>
          </div>
          <div className="space-y-space-2xs rounded-xl bg-surface/70 px-space-md py-space-sm text-body-sm">
            <p className="text-label-sm text-muted-foreground">Your preferences</p>
            <p><span className="text-muted-foreground">Pronouns:</span> {preferredPronouns}</p>
            <p><span className="text-muted-foreground">Preferred contact:</span> {preferredContact}</p>
            <Link href="/profile" className="text-primary underline-offset-4 hover:underline">Update in profile</Link>
          </div>
        </div>
        <p className="max-w-2xl text-body-md text-muted-foreground sm:text-body-lg">
          Track appointments, review documents, and stay in touch with outreach staff. Updates here
          sync with the STEVI Ops tools the field team uses.
        </p>
        <ClientPreviewGuard message="You’re previewing the client portal. Requests are read-only until you exit preview.">
          <div className="flex flex-wrap gap-space-md pt-space-xs">
            <Button asChild>
              <Link href="/appointments">Request a new appointment</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/documents">View secure documents</Link>
            </Button>
          </div>
        </ClientPreviewGuard>
      </header>

      <section aria-labelledby="appointments-heading" className="grid gap-space-md md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-col gap-space-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle id="appointments-heading" className="text-title-lg">
                Your timeline
              </CardTitle>
              <p className="text-body-sm text-muted-foreground">
                Upcoming and recent appointments in one view. We respond within one business day.
              </p>
            </div>
            <Button variant="ghost" asChild className="text-label-md font-medium">
              <Link href="/appointments">
                Manage appointments
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-space-md">
            {appointments.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">No appointments yet. Request one to get started.</p>
            ) : (
              appointments.map((appointment) => (
                <article
                  key={appointment.id}
                  className="rounded-xl border border-outline/20 bg-surface-container-low p-space-md shadow-level-1 transition state-layer-color-primary hover:border-primary hover:state-layer-hover hover:shadow-level-2"
                  aria-labelledby={`appointment-${appointment.id}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 id={`appointment-${appointment.id}`} className="text-title-md font-medium text-on-surface">
                      {appointment.title}
                    </h3>
                    <Badge
                      variant={appointment.status === 'completed' ? 'secondary' : 'default'}
                      className="capitalize"
                    >
                      {appointment.status}
                    </Badge>
                  </div>
                  <dl className="mt-space-xs space-y-[0.35rem] text-body-sm text-on-surface/80">
                    <div className="flex flex-wrap gap-1">
                      <dt className="font-medium text-on-surface/70">When:</dt>
                      <dd>{formatAppointmentDate(appointment.occursAt)}</dd>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <dt className="font-medium text-on-surface/70">Where:</dt>
                      <dd>{appointment.location}</dd>
                      {appointment.locationType ? (
                        <dd className="text-on-surface/60">({appointment.locationType.replaceAll('_', ' ')})</dd>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <dt className="font-medium text-on-surface/70">With:</dt>
                      <dd>{appointment.staffContact}</dd>
                    </div>
                    {appointment.meetingUrl ? (
                      <div className="flex flex-wrap gap-1">
                        <dt className="font-medium text-on-surface/70">Join:</dt>
                        <dd>
                          <a className="text-primary underline-offset-4 hover:underline" href={appointment.meetingUrl} target="_blank" rel="noreferrer">
                            Meeting link
                          </a>
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </article>
              ))
            )}
            <p className="text-body-sm text-muted-foreground">
              Need to change something?{' '}
              <Link href="/support" className="text-primary underline-offset-4 hover:underline">
                Message the outreach team
              </Link>
              .
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-title-md">Support contacts</CardTitle>
            <p className="text-body-sm text-muted-foreground">
              Reach out when you need to reschedule, request supplies, or connect with services.
            </p>
          </CardHeader>
          <CardContent className="space-y-space-md">
            {supportTeam.map((contact) => (
              <article key={contact.id} className="rounded-xl border border-outline/20 p-space-md">
                <header>
                  <p className="text-title-sm font-medium text-on-surface">{contact.name}</p>
                  <p className="text-body-sm text-muted-foreground">{contact.role}</p>
                </header>
                <dl className="mt-space-sm space-y-[0.35rem] text-body-sm">
                  <div className="flex flex-wrap gap-1">
                    <dt className="font-medium text-on-surface/70">Phone:</dt>
                    <dd>
                      <a href={`tel:${contact.phone}`} className="text-primary underline-offset-4 hover:underline">
                        {contact.phone}
                      </a>
                    </dd>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <dt className="font-medium text-on-surface/70">Email:</dt>
                    <dd>
                      <a href={`mailto:${contact.email}`} className="text-primary underline-offset-4 hover:underline">
                        {contact.email}
                      </a>
                    </dd>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <dt className="font-medium text-on-surface/70">Availability:</dt>
                    <dd>{contact.available}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-title-md">Focus areas</CardTitle>
            <p className="text-body-sm text-muted-foreground">
              Snapshot of your current goals. Staff update these as part of outreach notes.
            </p>
          </CardHeader>
          <CardContent className="space-y-space-md">
            <article className="rounded-xl border border-outline/20 p-space-md">
              <div className="flex items-center justify-between">
                <p className="text-title-sm font-medium text-on-surface">Housing application</p>
                <Badge variant="secondary">In review</Badge>
              </div>
              <p className="mt-space-xs text-body-sm text-muted-foreground">
                Ontario Works packet submitted last week. Awaiting confirmation from housing help centre.
              </p>
            </article>
            <article className="rounded-xl border border-outline/20 p-space-md">
              <div className="flex items-center justify-between">
                <p className="text-title-sm font-medium text-on-surface">Health supports</p>
                <Badge variant="outline">Active</Badge>
              </div>
              <p className="mt-space-xs text-body-sm text-muted-foreground">
                Harm reduction supplies packaged for pickup at the outreach hub. Check in with Morgan if plans change.
              </p>
            </article>
            <article className="rounded-xl border border-outline/20 p-space-md">
              <div className="flex items-center justify-between">
                <p className="text-title-sm font-medium text-on-surface">Income stabilization</p>
                <Badge>New</Badge>
              </div>
              <p className="mt-space-xs text-body-sm text-muted-foreground">
                Let the team know if you want help with part-time gig matching or training stipends.
              </p>
            </article>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
