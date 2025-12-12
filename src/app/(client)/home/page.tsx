import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/ui/card';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { ClientPreviewGuard } from '@shared/layout/client-preview-guard';
import { fetchClientAppointments } from '@/lib/appointments/queries';
import type { AppointmentWithRelations } from '@/lib/appointments/types';
import { findPersonForUser } from '@/lib/cases/person';
import { RequestRescheduleForm } from '@/app/(client)/appointments/request-reschedule-form';
import { CancelAppointmentForm } from '@shared/appointments/cancel-appointment-form';
import {
  cancelAppointmentAsClient,
  requestRescheduleAsClient,
} from '@/lib/appointments/actions';
import { PageHeader } from '@shared/layout/page-header';

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

function isActionable(status: AppointmentPreview['status']): boolean {
  return !['completed'].includes(status);
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
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Client portal"
        title={`Hi ${preferredName}, you’re connected to STEVI`}
        description="Track appointments, review documents, and stay in touch with outreach staff. Updates here sync with the STEVI Ops tools the field team uses."
        actions={
          <ClientPreviewGuard message="You’re previewing the client portal. Requests are read-only until you exit preview.">
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/appointments">Request a new appointment</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/documents">View secure documents</Link>
              </Button>
            </div>
          </ClientPreviewGuard>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="relative overflow-hidden border-border/60 bg-card shadow-md lg:col-span-1">
          <div className="h-1 w-full bg-primary" aria-hidden />
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle id="appointments-heading" className="text-xl">
                Your timeline
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Upcoming and recent appointments in one view. We respond within one business day.
              </p>
            </div>
            <Button variant="ghost" asChild size="sm" className="text-xs font-medium">
              <Link href="/appointments">Manage appointments</Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {appointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No appointments yet. Request one to get started.
              </p>
            ) : (
              appointments.map((appointment) => (
                <article
                  key={appointment.id}
                  className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition duration-150 ease-out hover:-translate-y-[1px] hover:border-primary hover:bg-muted hover:shadow-md"
                  aria-labelledby={`appointment-${appointment.id}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 id={`appointment-${appointment.id}`} className="text-lg font-semibold text-foreground">
                      {appointment.title}
                    </h3>
                    <Badge
                      variant={appointment.status === 'completed' ? 'secondary' : 'default'}
                      className="capitalize"
                    >
                      {appointment.status}
                    </Badge>
                  </div>
                  <dl className="mt-2 space-y-[0.35rem] text-sm text-foreground/80">
                    <div className="flex flex-wrap gap-1">
                      <dt className="font-medium text-foreground/70">When:</dt>
                      <dd>{formatAppointmentDate(appointment.occursAt)}</dd>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <dt className="font-medium text-foreground/70">Where:</dt>
                      <dd>{appointment.location}</dd>
                      {appointment.locationType ? (
                        <dd className="text-foreground/60">({appointment.locationType.replaceAll('_', ' ')})</dd>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <dt className="font-medium text-foreground/70">With:</dt>
                      <dd>{appointment.staffContact}</dd>
                    </div>
                    {appointment.meetingUrl ? (
                      <div className="flex flex-wrap gap-1">
                        <dt className="font-medium text-foreground/70">Join:</dt>
                        <dd>
                          <a
                            className="text-primary underline-offset-4 hover:underline"
                            href={appointment.meetingUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Meeting link
                          </a>
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                  {isActionable(appointment.status) ? (
                    <ClientPreviewGuard message="Requests are disabled while you preview the client portal. Exit preview to submit.">
                      <div className="mt-3 space-y-1">
                        <RequestRescheduleForm action={requestRescheduleAsClient} appointmentId={appointment.id} />
                        <CancelAppointmentForm
                          action={cancelAppointmentAsClient}
                          appointmentId={appointment.id}
                          variant="outline"
                        />
                      </div>
                    </ClientPreviewGuard>
                  ) : null}
                </article>
              ))
            )}
            <p className="text-sm text-muted-foreground">
              Need to change something?{' '}
              <Link href="/support" className="text-primary underline-offset-4 hover:underline">
                Message the outreach team
              </Link>
              .
            </p>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="relative overflow-hidden border-border/60 bg-card shadow-md">
            <div className="h-1 w-full bg-primary" aria-hidden />
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">My details</CardTitle>
              <p className="text-sm text-muted-foreground">
                Key preferences IHARC uses to contact you.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <dl className="grid gap-3 sm:grid-cols-2 text-sm">
                <div className="rounded-xl bg-card px-3 py-3 hover:bg-muted transition duration-150 ease-out">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Pronouns</dt>
                  <dd className="text-base text-foreground">{preferredPronouns}</dd>
                </div>
                <div className="rounded-xl bg-card px-3 py-3 hover:bg-muted transition duration-150 ease-out">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Preferred contact</dt>
                  <dd className="text-base text-foreground">{preferredContact}</dd>
                </div>
              </dl>
              <Button variant="outline" size="sm" asChild className="w-fit">
                <Link href="/profile">Update in profile</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Support contacts</CardTitle>
              <p className="text-sm text-muted-foreground">
                Reach out when you need to reschedule, request supplies, or connect with services.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {supportTeam.map((contact) => (
                <article
                  key={contact.id}
                  className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm hover:bg-muted transition duration-150 ease-out"
                >
                  <header className="flex flex-wrap items-center justify-between gap-1">
                    <div>
                      <p className="text-base font-semibold text-foreground">{contact.name}</p>
                      <p className="text-sm text-muted-foreground">{contact.role}</p>
                    </div>
                    <Badge variant="secondary" className="bg-card text-foreground">
                      {contact.available}
                    </Badge>
                  </header>
                  <dl className="mt-3 space-y-[0.35rem] text-sm">
                    <div className="flex flex-wrap gap-1">
                      <dt className="font-medium text-foreground/70">Phone:</dt>
                      <dd>
                        <a href={`tel:${contact.phone}`} className="text-primary underline-offset-4 hover:underline">
                          {contact.phone}
                        </a>
                      </dd>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <dt className="font-medium text-foreground/70">Email:</dt>
                      <dd>
                        <a href={`mailto:${contact.email}`} className="text-primary underline-offset-4 hover:underline">
                          {contact.email}
                        </a>
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Focus areas</CardTitle>
              <p className="text-sm text-muted-foreground">
                Snapshot of your current goals. Staff update these as part of outreach notes.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <article className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm hover:bg-muted transition duration-150 ease-out">
                <div className="flex items-center justify-between">
                  <p className="text-base font-medium text-foreground">Housing application</p>
                  <Badge variant="secondary">In review</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Ontario Works packet submitted last week. Awaiting confirmation from housing help centre.
                </p>
              </article>
              <article className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm hover:bg-muted transition duration-150 ease-out">
                <div className="flex items-center justify-between">
                  <p className="text-base font-medium text-foreground">Health supports</p>
                  <Badge variant="outline">Active</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Harm reduction supplies packaged for pickup at the outreach hub. Check in with Morgan if plans change.
                </p>
              </article>
              <article className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm hover:bg-muted transition duration-150 ease-out">
                <div className="flex items-center justify-between">
                  <p className="text-base font-medium text-foreground">Income stabilization</p>
                  <Badge>New</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Let the team know if you want help with part-time gig matching or training stipends.
                </p>
              </article>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
