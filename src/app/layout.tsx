import { Suspense } from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { cn } from '@/lib/utils';
import '@/styles/theme.css';
import { ThemeProvider } from '@shared/providers/theme-provider';
import { AnalyticsProvider } from '@shared/providers/analytics-provider';
import { getBrandingAssets } from '@/lib/marketing/branding';

export const dynamic = 'force-dynamic';

const DEFAULT_APP_URL = 'https://stevi.iharc.ca';
const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_APP_URL;
const metadataBase = (() => {
  try {
    return new URL(appUrl);
  } catch {
    return new URL(DEFAULT_APP_URL);
  }
})();

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_ID ?? process.env.PUBLIC_GA4_ID ?? null;
const ANALYTICS_DISABLED =
  (process.env.NEXT_PUBLIC_ANALYTICS_DISABLED ?? 'false').toLowerCase() === 'true';
const ANALYTICS_ENABLED = Boolean(GA_MEASUREMENT_ID) && !ANALYTICS_DISABLED;
const OG_IMAGE_PATH = '/logo.png';
const OG_IMAGE_ALT = 'STEVI — IHARC Client Portal';

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBrandingAssets();

  return {
    metadataBase,
    title: 'STEVI — Supportive Technology to Enable Vulnerable Individuals | IHARC Client Portal',
    description:
      'STEVI connects IHARC clients with outreach teams to request appointments, track progress, and access compassionate resources in Northumberland County.',
    icons: {
      icon: branding.faviconUrl,
    },
    openGraph: {
      type: 'website',
      siteName: 'STEVI',
      title: 'STEVI — Supportive Technology to Enable Vulnerable Individuals | IHARC Client Portal',
      description:
        'Request support, follow working plans, and collaborate with IHARC through the STEVI client portal.',
      images: [
        {
          url: OG_IMAGE_PATH,
          alt: OG_IMAGE_ALT,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'STEVI — Supportive Technology to Enable Vulnerable Individuals | IHARC Client Portal',
      description:
        'Request support, follow working plans, and collaborate with IHARC through the STEVI client portal.',
      images: [OG_IMAGE_PATH],
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce');
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-sans text-foreground antialiased',
        )}
      >
        <ThemeProvider nonce={nonce}>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
          >
            Skip to main content
          </a>
          <Suspense fallback={null}>
            <AnalyticsProvider measurementId={GA_MEASUREMENT_ID} enabled={ANALYTICS_ENABLED} nonce={nonce} />
          </Suspense>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
