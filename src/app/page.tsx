import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  const supabase = await createSupabaseRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/home');
  }

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-[70vh] w-full max-w-5xl flex-col items-center justify-center gap-6 px-6 py-24 text-center"
    >
      <span className="rounded-full border border-outline bg-surface px-4 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Supportive Technology to Enable Vulnerable Individuals
      </span>
      <h1 className="text-3xl font-semibold text-on-surface md:text-5xl">
        IHARC client portal for housing, health, and outreach support
      </h1>
      <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
        STEVI keeps you connected with outreach workers, appointments, and secure documents. Sign in
        to review your plan, request visits, and receive updates right from your phone.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
        <Button asChild className="min-w-[160px]">
          <Link href="/login">Sign in to STEVI</Link>
        </Button>
        <Button variant="outline" asChild className="min-w-[160px]">
          <Link href="/register">Create an account</Link>
        </Button>
      </div>
      <p className="max-w-xl text-sm text-muted-foreground">
        Need help?{' '}
        <Link href="/support" className="text-primary underline-offset-4 hover:underline">
          Contact the outreach coordination team
        </Link>
        .
      </p>
    </main>
  );
}
