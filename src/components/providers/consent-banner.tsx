'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/lib/analytics';

type ConsentState = 'granted' | 'denied';

const STORAGE_KEY = 'iharc-consent-preference';
const GRANTED_FLAGS = {
  ad_storage: 'granted',
  analytics_storage: 'granted',
  ad_user_data: 'granted',
  ad_personalization: 'granted',
} as const;
const DENIED_FLAGS = {
  ad_storage: 'denied',
  analytics_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
} as const;

function updateConsentFlags(state: ConsentState) {
  if (typeof window === 'undefined') {
    return;
  }

  const consentFlags = state === 'granted' ? GRANTED_FLAGS : DENIED_FLAGS;
  const globalWindow = window as Window & {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  };
  const gtag =
    globalWindow.gtag ??
    function gtagFallback(...args: unknown[]) {
      globalWindow.dataLayer = globalWindow.dataLayer ?? [];
      (globalWindow.dataLayer as unknown[]).push(args);
    };

  gtag('consent', 'update', consentFlags);
  gtag('set', 'ads_data_redaction', state === 'denied');

  if (state === 'granted') {
    const pagePath = `${window.location.pathname}${window.location.search}`;
    gtag('event', 'page_view', {
      page_location: window.location.href,
      page_path: pagePath,
      page_title: document.title,
    });
  }
}

function persistPreference(state: ConsentState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, state);
  } catch {
    // Ignore storage errors (e.g., private browsing)
  }
}

export function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let stored: ConsentState | null = null;
    try {
      const value = window.localStorage.getItem(STORAGE_KEY);
      stored = value === 'granted' || value === 'denied' ? value : null;
    } catch {
      stored = null;
    }

    if (!stored) {
      startTransition(() => setVisible(true));
    }
  }, []);

  const handleChoice = useCallback((state: ConsentState) => {
    persistPreference(state);
    updateConsentFlags(state);
    trackEvent('consent_preference_saved', { state });
    setVisible(false);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-outline bg-surface shadow-lg">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-4 text-sm md:flex-row md:items-center md:justify-between md:px-6">
        <div className="text-on-surface md:max-w-xl">
          <p className="font-medium">Cookies that strengthen community care</p>
          <p className="mt-1 text-muted-foreground">
            We use privacy-aware analytics to learn where neighbours need more support. Approving cookies helps us
            improve shared solutions faster.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleChoice('denied')}
            data-testid="consent-decline"
            className="w-full sm:w-auto"
          >
            No, prefer fewer cookies
          </Button>
          <Button
            size="sm"
            onClick={() => handleChoice('granted')}
            data-testid="consent-accept"
            className="w-full sm:w-auto"
          >
            Yes, support IHARC insights
          </Button>
        </div>
      </div>
    </div>
  );
}
