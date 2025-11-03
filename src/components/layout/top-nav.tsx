import Image from 'next/image';
import Link from 'next/link';
import { getUserNavigation } from '@/components/layout/user-nav';
import { ThemeToggle } from '@/components/layout/theme-toggle';

export async function TopNav() {
  const { desktop, mobile } = await getUserNavigation();

  return (
    <header className="border-b border-outline/20 bg-surface/95 text-on-surface backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-3 rounded-lg px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            aria-label="STEVI home"
          >
            <Image
              src="/logos/logo-default.png"
              alt="IHARC"
              width={72}
              height={72}
              priority
              className="h-10 w-auto dark:hidden"
            />
            <Image
              src="/logos/logoinverted.png"
              alt="IHARC"
              width={72}
              height={72}
              priority
              className="hidden h-10 w-auto dark:block"
            />
            <span className="text-left">
              <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                STEVI
              </span>
              <span className="block text-base font-semibold text-on-surface">
                Client Support Portal
              </span>
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-2 md:hidden">
          {mobile}
          <ThemeToggle />
        </div>
        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          {desktop}
        </div>
      </div>
    </header>
  );
}
