import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, FileQuestion, HandHeart, LogIn, UsersRound, UserPlus } from 'lucide-react';
import { resolveNextPath } from '@/lib/auth';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';

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
  icon: React.ElementType;
}> = [
  {
    title: 'Get help (new to IHARC)',
    description: 'Start a trauma-informed intake, share contact safety, and request your first appointment.',
    href: (next) => makeNextAwareHref('/register/get-help', next),
    icon: HandHeart,
  },
  {
    title: 'Access my services (already a client)',
    description: 'Claim an existing record using your IHARC ID, email, or phone so you can manage appointments online.',
    href: (next) => makeNextAwareHref('/register/access-services', next),
    icon: LogIn,
  },
  {
    title: 'Join as a community member',
    description: 'Follow neighbourhood updates, raise concerns, and collaborate on local solutions.',
    href: (next) => makeNextAwareHref('/register/community-member', next),
    icon: UsersRound,
  },
  {
    title: 'I’m with a partner organization',
    description: 'Request verified partner access so you can coordinate referrals and share case notes securely.',
    href: (next) => makeNextAwareHref('/register/partner', next),
    icon: UserPlus,
  },
  {
    title: 'Volunteer',
    description: 'Apply to support IHARC outreach teams. Screening ensures neighbours’ privacy is respected.',
    href: (next) => makeNextAwareHref('/register/volunteer', next),
    icon: HandHeart,
  },
  {
    title: 'Report a concern or give feedback',
    description: 'Let us know about safety issues, discrimination, or encampment support needs with or without an account.',
    href: (next) => makeNextAwareHref('/register/report-concern', next),
    icon: FileQuestion,
  },
];

export default async function RegisterLandingPage({ searchParams }: RegisterLandingProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextPath = resolveNextPath(resolvedSearchParams?.next);

  const supabase = await createSupabaseRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(nextPath);
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <header className="mb-10 max-w-3xl space-y-4">
        <p className="text-xs uppercase tracking-wide text-outline">IHARC Portal</p>
        <h1 className="text-4xl font-semibold tracking-tight text-on-surface">What do you want to do today?</h1>
        <p className="text-base text-muted">
          Pick the option that best matches what you need right now. Every path keeps your information private and
          honours your contact safety preferences.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        {ACTIONS.map(({ title, description, href, icon: Icon }) => (
          <Link
            key={title}
            href={href(nextPath)}
            className="group flex h-full flex-col justify-between rounded-2xl border border-outline/40 bg-surface p-6 shadow-subtle transition hover:border-primary/50 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <div className="space-y-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h2 className="text-xl font-semibold text-on-surface">{title}</h2>
              <p className="text-sm text-muted">{description}</p>
            </div>
            <span className="mt-6 inline-flex items-center text-sm font-medium text-primary">
              Continue
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function makeNextAwareHref(base: string, next: string): string {
  if (!next || next === '/') {
    return base;
  }

  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}next=${encodeURIComponent(next)}`;
}
