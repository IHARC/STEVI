import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SupportComposer } from './support-composer';

export const dynamic = 'force-dynamic';

const supportChannels = [
  {
    id: 'coordination',
    label: 'Outreach coordination desk',
    description:
      'For booking, rescheduling, and document requests. Messages sync with the STEVI Ops queue so the first available staff member can help.',
    email: 'support@iharc.ca',
    phone: '289-555-0100',
    hours: 'Mon–Fri 9:00–17:00',
  },
  {
    id: 'after-hours',
    label: 'After-hours shelter/navigation line',
    description: 'Evenings and weekends for urgent shelter and safety planning.',
    phone: '289-555-0110',
    hours: 'Daily 17:00–07:00',
  },
  {
    id: 'peer-navigators',
    label: 'Peer support drop-in',
    description: 'Live experience navigators for accompaniment, supplies, and advocacy.',
    location: 'IHARC Outreach Hub — community room',
    hours: 'Tue & Thu 11:00–15:00',
  },
];

const faqs = [
  {
    question: 'How fast will I hear back about an appointment request?',
    answer:
      'We aim to respond within one business day. You will get an email or text confirmation once staff review availability.',
  },
  {
    question: 'What if I lose access to my documents?',
    answer:
      'Contact the coordination desk. We will regenerate a secure download link or schedule a pickup. Links expire automatically for safety.',
  },
  {
    question: 'Can I add a trusted contact to my profile?',
    answer:
      'Yes. Update your profile with the trusted contact details and consent preferences. The team will confirm during your next visit.',
  },
];

export default async function SupportPage() {
  const supabase = await createSupabaseRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/support');
  }

  await ensurePortalProfile(supabase, user.id);

  return (
    <div className="page-shell page-stack">
      <header className="flex flex-col gap-space-xs">
        <p className="text-label-sm font-medium uppercase text-muted-foreground">
          Connect with IHARC
        </p>
        <h1 className="text-headline-lg text-on-surface sm:text-display-sm">Support and contact</h1>
        <p className="max-w-2xl text-body-md text-muted-foreground sm:text-body-lg">
          These channels connect directly with the outreach, housing, and health teams collaborating
          through STEVI.
        </p>
      </header>

      <section aria-label="Support channels" className="grid gap-space-md md:grid-cols-2">
        {supportChannels.map((channel) => (
          <Card key={channel.id} className="flex flex-col justify-between">
            <CardHeader>
              <CardTitle className="text-title-md">{channel.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-space-sm text-body-sm text-muted-foreground">
              <p>{channel.description}</p>
              {channel.email ? (
                <p>
                  Email{' '}
                  <a
                    href={`mailto:${channel.email}`}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {channel.email}
                  </a>
                </p>
              ) : null}
              {channel.phone ? (
                <p>
                  Phone{' '}
                  <a href={`tel:${channel.phone}`} className="text-primary underline-offset-4 hover:underline">
                    {channel.phone}
                  </a>
                </p>
              ) : null}
              {channel.location ? <p>Location: {channel.location}</p> : null}
              <p>Available {channel.hours}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section aria-labelledby="faq-heading" className="grid gap-space-md md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle id="faq-heading" className="text-title-lg">
              Frequently asked questions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-space-md md:grid-cols-3">
            {faqs.map((faq) => (
              <article key={faq.question} className="rounded-xl border border-outline/20 p-space-md">
                <h2 className="text-title-sm font-medium text-on-surface">{faq.question}</h2>
                <p className="mt-space-xs text-body-sm text-muted-foreground">{faq.answer}</p>
              </article>
            ))}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="feedback-heading">
        <Card>
          <CardHeader>
            <CardTitle id="feedback-heading" className="text-title-lg">
              Something not working?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-space-sm text-body-sm text-muted-foreground">
            <p>
              Share a quick note with the STEVI team and we’ll follow up. This creates a ticket in
              the operations system so nothing gets lost.
            </p>
            <Button asChild className="w-full sm:w-auto">
              <Link href="mailto:portal-feedback@iharc.ca">Email portal feedback</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <div id="message-tray" aria-label="Message the team">
        <SupportComposer />
      </div>
    </div>
  );
}
