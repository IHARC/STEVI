'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackClientEvent } from '@/lib/telemetry';

type AnalyticsProviderProps = {
  measurementId?: string | null;
  enabled?: boolean;
};

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

type ConsentState = 'granted' | 'denied' | null;

export function AnalyticsProvider({ measurementId, enabled = true }: AnalyticsProviderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = useMemo(() => searchParams?.toString() ?? '', [searchParams]);
  const lastTrackedPathRef = useRef<string | null>(null);
  const [consentState, setConsentState] = useState<ConsentState>(null);

  useEffect(() => {
    if (!enabled || !measurementId || typeof window === 'undefined') {
      return;
    }

    setConsentState(getStoredConsent());

    const handler = (event: Event) => {
      const consentDetail = (event as CustomEvent<ConsentState>).detail;
      if (consentDetail === 'granted' || consentDetail === 'denied') {
        setConsentState(consentDetail);
      }
    };

    window.addEventListener('iharc-consent-change', handler);
    return () => window.removeEventListener('iharc-consent-change', handler);
  }, [enabled, measurementId]);

  useEffect(() => {
    if (!enabled || !measurementId || consentState !== 'granted' || typeof window === 'undefined') {
      return;
    }

    const analyticsWindow = window as AnalyticsWindow;
    analyticsWindow.dataLayer = analyticsWindow.dataLayer ?? [];
    analyticsWindow.gtag =
      analyticsWindow.gtag ??
      function gtag(...args: unknown[]) {
        analyticsWindow.dataLayer?.push(args);
      };

    const pagePath = search ? `${pathname}?${search}` : pathname ?? '/';

    if (lastTrackedPathRef.current === pagePath) {
      return;
    }

    const pageLocation = window.location.href;
    const pageTitle = document.title;
    const payload = {
      page_location: pageLocation,
      page_path: pagePath,
      page_title: pageTitle,
    };

    if (lastTrackedPathRef.current === null) {
      lastTrackedPathRef.current = pagePath;
      trackClientEvent('page_view', payload);
      return;
    }

    lastTrackedPathRef.current = pagePath;

    analyticsWindow.gtag('config', measurementId, {
      page_path: pagePath,
      page_location: pageLocation,
      page_title: pageTitle,
    });

    trackClientEvent('page_view', payload);
  }, [enabled, measurementId, pathname, search, consentState]);

  if (!enabled || !measurementId || consentState !== 'granted') {
    return null;
  }

  return (
    <>
      <Script
        id="ga4-script"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script
        id="ga4-inline"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function () {
              var measurementId = ${JSON.stringify(measurementId)};
              var consentKey = 'iharc-consent-preference';
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = window.gtag || gtag;
              gtag('consent', 'default', {
                ad_storage: 'granted',
                analytics_storage: 'granted',
                ad_user_data: 'granted',
                ad_personalization: 'granted',
                wait_for_update: 500,
              });
              gtag('set', 'ads_data_redaction', false);
              gtag('js', new Date());
              gtag('config', measurementId, { anonymize_ip: true });
            })();
          `,
        }}
      />
    </>
  );
}

function getStoredConsent(): ConsentState {
  try {
    const stored = window.localStorage.getItem('iharc-consent-preference');
    if (stored === 'granted' || stored === 'denied') {
      return stored;
    }
  } catch {
    // ignore
  }
  return null;
}
