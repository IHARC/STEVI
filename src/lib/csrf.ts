import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import {
  CSRF_COOKIE_PRIMARY,
  CSRF_COOKIE_FALLBACK,
  CSRF_FIELD_NAME,
  TOKEN_LENGTH_BYTES,
} from '@/lib/csrf/constants';

export {
  CSRF_COOKIE_PRIMARY,
  CSRF_COOKIE_FALLBACK,
  CSRF_FIELD_NAME,
} from '@/lib/csrf/constants';
export { CSRF_ERROR_MESSAGE } from '@/lib/csrf/constants';

export class InvalidCsrfTokenError extends Error {
  constructor() {
    super('Invalid CSRF token');
    this.name = 'InvalidCsrfTokenError';
  }
}

function generateToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH_BYTES).toString('hex');
}

function toBuffer(value: string): Buffer {
  return Buffer.from(value, 'hex');
}

export async function getOrCreateCsrfToken(): Promise<string> {
  const cookieStore = await cookies();
  const existing =
    cookieStore.get(CSRF_COOKIE_PRIMARY)?.value ?? cookieStore.get(CSRF_COOKIE_FALLBACK)?.value;

  return existing ?? generateToken();
}

export async function assertValidCsrfToken(value: string | null | undefined): Promise<void> {
  const cookieStore = await cookies();
  const stored =
    cookieStore.get(CSRF_COOKIE_PRIMARY)?.value ?? cookieStore.get(CSRF_COOKIE_FALLBACK)?.value;

  if (!stored || typeof value !== 'string' || !value) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[csrf] missing token', {
        hasStored: Boolean(stored),
        providedType: typeof value,
        providedLength: typeof value === 'string' ? value.length : null,
        cookieNames: cookieStore.getAll().map((c) => c.name),
      });
    }
    throw new InvalidCsrfTokenError();
  }

  const providedBuffer = toBuffer(value);
  const storedBuffer = toBuffer(stored);

  if (providedBuffer.length !== storedBuffer.length) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[csrf] length mismatch', {
        providedLength: providedBuffer.length,
        storedLength: storedBuffer.length,
      });
    }
    throw new InvalidCsrfTokenError();
  }

  if (!crypto.timingSafeEqual(providedBuffer, storedBuffer)) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[csrf] token mismatch', {
        providedPrefix: value.slice(0, 6),
        providedSuffix: value.slice(-6),
        storedPrefix: stored.slice(0, 6),
        storedSuffix: stored.slice(-6),
      });
    }
    throw new InvalidCsrfTokenError();
  }
}

export async function validateCsrfFromForm(formData: FormData): Promise<void> {
  const token = formData.get(CSRF_FIELD_NAME);
  await assertValidCsrfToken(typeof token === 'string' ? token : null);
}
