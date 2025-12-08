import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, FileQuestion, HandHeart, LogIn, UsersRound, UserPlus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { resolveNextPath } from '@/lib/auth';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-areas';
import { FormPageShell } from '@shared/layout/form-page-shell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'IHARC Portal registration',
  description: 'Choose the path that matches what you need today — from new client intake to partner and volunteer onboarding.',
};

type SearchParams = Record<string, string | string[]>;

type RegisterLandingProps = {
  searchParams?: Promise<SearchParams>;
};

const ACTIONS: Array<{
  title: string;
  description: string;
  href: (next: string) => string;
  glyph: LucideIcon;
}> = [
  {
    title: 'Get help (new to IHARC)',
    description: 'Start a trauma-informed intake, share contact safety, and request your first appointment.',
    href: (next) => makeNextAwareHref('/register/get-help', next),
    glyph: HandHeart,
  },
  {
    title: 'Access my services (already a client)',
    description: 'Claim an existing record using your IHARC ID, email, or phone so you can manage appointments online.',
    href: (next) => makeNextAwareHref('/register/access-services', next),
    glyph: LogIn,
  },
  {
    title: 'Join as a community member',
    description: 'Follow neighbourhood updates, raise concerns, and collaborate on local solutions.',
    href: (next) => makeNextAwareHref('/register/community-member', next),
    glyph: UsersRound,
  },
  {
    title: 'I’m with a partner organization',
    description: 'Request verified partner access so you can coordinate referrals and share case notes securely.',
    href: (next) => makeNextAwareHref('/register/partner', next),
    glyph: UserPlus,
  },
  {
    title: 'Volunteer',
    description: 'Apply to support IHARC outreach teams. Screening ensures neighbours’ privacy is respected.',
    href: (next) => makeNextAwareHref('/register/volunteer', next),
    glyph: HandHeart,
  },
  {
    title: 'Report a concern or give feedback',
    description: 'Let us know about safety issues, discrimination, or encampment support needs with or without an account.',
    href: (next) => makeNextAwareHref('/register/report-concern', next),
    glyph: FileQuestion,
  },
];

export default async function RegisterLandingPage({ searchParams }: RegisterLandingProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rawNext = resolvedSearchParams?.next;

  const supabase = await createSupabaseRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const portalAccess = user ? await loadPortalAccess(supabase) : null;
  const landingPath = resolveLandingPath(portalAccess);
  const nextPath = resolveNextPath(rawNext, landingPath);

  if (user) {
    redirect(nextPath);
  }

  return (
    <FormPageShell
      eyebrow="IHARC portal"
      title="What do you want to do today?"
      description="Pick the option that best matches what you need right now. Every path keeps your information private and honours your contact safety preferences."
      maxWidth="xl"
    >
      <div className="grid gap-4 md:grid-cols-2">
        {ACTIONS.map(({ title, description, href, glyph: Glyph }) => (
          <Link
            key={title}
            href={href(nextPath)}
            className="group flex h-full flex-col justify-between rounded-2xl border border-border/50 bg-card p-6 shadow-sm transition duration-200 ease-out hover:border-primary/60 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <div className="space-y-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Glyph className="h-5 w-5" aria-hidden />
              </span>
              <h2 className="text-xl font-semibold text-foreground">{title}</h2>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <span className="mt-6 inline-flex items-center text-sm font-medium text-primary">
              Continue
              <ArrowRight
                className="ml-2 h-4 w-4 transition-transform duration-150 ease-out group-hover:translate-x-1"
                aria-hidden
              />
            </span>
          </Link>
        ))}
      </div>
    </FormPageShell>
  );
}

function makeNextAwareHref(base: string, next: string): string {
  if (!next || next === '/') {
    return base;
  }

  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}next=${encodeURIComponent(next)}`;
}
