import { trackClientEvent } from './telemetry';

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  fbq?: (...args: unknown[]) => void;
};

const isTrue = (value: string | undefined | null) => value?.toLowerCase() === 'true';

const ANALYTICS_DISABLED = isTrue(process.env.NEXT_PUBLIC_ANALYTICS_DISABLED ?? 'false');
const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID ?? process.env.PUBLIC_GA4_ID ?? null;

export function trackEvent(name: string, data: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  if (ANALYTICS_DISABLED || !GA4_ID) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[analytics] Tracking disabled; event skipped', name, data);
    }
    return;
  }

  const analyticsWindow = window as AnalyticsWindow;

  if (!Array.isArray(analyticsWindow.dataLayer)) {
    analyticsWindow.dataLayer = [];
  }

  if (typeof analyticsWindow.gtag !== 'function') {
    analyticsWindow.gtag = (...args: unknown[]) => {
      analyticsWindow.dataLayer?.push(args);
    };
  }

  const payload = { ...data, event: name, timestamp: Date.now() };
  analyticsWindow.dataLayer.push(payload);

  if (GA4_ID && typeof analyticsWindow.gtag === 'function') {
    const gaPayload = { ...data, send_to: GA4_ID };
    analyticsWindow.gtag('event', name, gaPayload);
  }

  if (typeof analyticsWindow.fbq === 'function') {
    analyticsWindow.fbq('trackCustom', name, data);
  }

  trackClientEvent(name, data);
}
