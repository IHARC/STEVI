import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/SiteFooter';
import { getBrandingAssets } from '@/lib/marketing/branding';

export async function MarketingShell({ children }: { children: ReactNode }) {
  const branding = await getBrandingAssets();

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-background">
      <header className="border-b border-outline/12 bg-surface text-on-surface shadow-level-1">
        <div className="mx-auto flex w-full max-w-page items-center justify-between gap-space-md px-space-lg py-space-md">
          <Link
            href="/"
            className="inline-flex items-center gap-space-sm rounded-2xl border border-transparent px-space-sm py-space-2xs transition-colors hover:border-outline/30 hover:bg-surface-container-low focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            aria-label="STEVI home"
          >
            <Image
              src={branding.logoLightUrl}
              alt="IHARC"
              width={72}
              height={72}
              priority
              className="h-10 w-auto dark:hidden"
            />
            <Image
              src={branding.logoDarkUrl}
              alt="IHARC"
              width={72}
              height={72}
              priority
              className="hidden h-10 w-auto dark:block"
            />
            <span className="text-left">
              <span className="block text-label-sm font-semibold uppercase tracking-label-uppercase text-primary">STEVI</span>
              <span className="block text-title-sm font-semibold text-on-surface">Supportive Technology to Enable Vulnerable Individuals</span>
            </span>
          </Link>
          <div className="flex items-center gap-space-sm">
            <Link
              href="/login"
              className="rounded-full px-space-md py-space-2xs text-label-md font-semibold text-primary transition-colors hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-primary px-space-md py-space-2xs text-label-md font-semibold text-primary-foreground shadow-level-2 transition-colors hover:bg-primary/92 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              Get support
            </Link>
          </div>
        </div>
      </header>
      <main id="main-content" className="flex-1 bg-background">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
