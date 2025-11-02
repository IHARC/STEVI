export type TelemetryPayload = Record<string, unknown>;

type TelemetryWindow = Window & { dataLayer?: unknown[] };

const TELEMETRY_ENDPOINT = '/api/portal/telemetry';

export function trackClientEvent(event: string, payload: TelemetryPayload = {}): void {
  if (typeof window === 'undefined') {
    return;
  }

  const telemetryWindow = window as TelemetryWindow;

  try {
    if (!Array.isArray(telemetryWindow.dataLayer)) {
      telemetryWindow.dataLayer = [];
    }
    telemetryWindow.dataLayer.push({ event, ...payload });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('Telemetry dataLayer push skipped', error);
    }
  }

  try {
    const body = JSON.stringify({ event, payload, ts: Date.now() });
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(TELEMETRY_ENDPOINT, body);
      return;
    }

    void fetch(TELEMETRY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('Telemetry dispatch skipped', error);
    }
  }
}
