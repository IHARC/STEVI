import { NextRequest, NextResponse } from 'next/server';
import { ALLOWED_TELEMETRY_EVENTS } from '@/lib/telemetry';

const MAX_BODY_BYTES = 8 * 1024;
const ALLOWED_EVENTS = new Set<string>(ALLOWED_TELEMETRY_EVENTS);

function buildAllowedOrigins(currentOrigin: string): Set<string> {
  const origins = new Set<string>([currentOrigin.toLowerCase(), 'http://localhost:3000', 'http://127.0.0.1:3000']);
  const envOrigins = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_MARKETING_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ]
    .filter(Boolean)
    .map((value) => {
      try {
        return new URL(value as string).origin.toLowerCase();
      } catch {
        return null;
      }
    })
    .filter((value): value is string => Boolean(value));

  for (const origin of envOrigins) {
    origins.add(origin);
  }

  return origins;
}

function isOriginAllowed(req: NextRequest): boolean {
  const allowed = buildAllowedOrigins(req.nextUrl.origin);
  const headerOrigins = [req.headers.get('origin'), req.headers.get('referer')]
    .filter(Boolean)
    .map((value) => {
      try {
        return new URL(value as string).origin.toLowerCase();
      } catch {
        return null;
      }
    })
    .filter((value): value is string => Boolean(value));

  if (headerOrigins.length === 0) {
    return false;
  }

  return headerOrigins.every((origin) => allowed.has(origin));
}

type ParsedTelemetry = {
  event: string;
  payload?: Record<string, unknown>;
  ts?: number;
};

function validateTelemetryBody(body: unknown): ParsedTelemetry | { error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Telemetry payload must be an object.' };
  }

  const data = body as Record<string, unknown>;

  const event = typeof data.event === 'string' ? data.event.trim() : '';

  if (!event) {
    return { error: 'Telemetry event is required.' };
  }

  if (!ALLOWED_EVENTS.has(event)) {
    return { error: 'Telemetry event not permitted.' };
  }

  const payload = data.payload;
  if (payload !== undefined && (payload === null || typeof payload !== 'object' || Array.isArray(payload))) {
    return { error: 'Payload must be an object.' };
  }

  const ts = data.ts;
  if (ts !== undefined && typeof ts !== 'number') {
    return { error: 'Timestamp must be a number.' };
  }

  return {
    event,
    payload: payload as Record<string, unknown> | undefined,
    ts: typeof ts === 'number' ? ts : undefined,
  };
}

export async function POST(req: NextRequest) {
  const contentLengthHeader = req.headers.get('content-length');
  if (contentLengthHeader && Number(contentLengthHeader) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large.' }, { status: 413 });
  }

  if (!isOriginAllowed(req)) {
    return NextResponse.json({ error: 'Origin not allowed.' }, { status: 403 });
  }

  const rawBody = await req.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large.' }, { status: 413 });
  }

  let parsed: unknown;
  try {
    parsed = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const validation = validateTelemetryBody(parsed);
  if ('error' in validation) {
    return NextResponse.json({ error: validation.error }, { status: 422 });
  }

  if (process.env.NODE_ENV !== 'production') {
    console.info('Telemetry event', validation.event, validation.payload ?? {});
  }

  return NextResponse.json({ received: true }, { status: 202 });
}
