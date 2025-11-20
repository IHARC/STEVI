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

  if (existing) {
    return existing;
  }

  return generateToken();
}

export async function assertValidCsrfToken(value: string | null | undefined): Promise<void> {
  const cookieStore = await cookies();
  const stored =
    cookieStore.get(CSRF_COOKIE_PRIMARY)?.value ?? cookieStore.get(CSRF_COOKIE_FALLBACK)?.value;

  if (!stored || typeof value !== 'string' || !value) {
    throw new InvalidCsrfTokenError();
  }

  const providedBuffer = toBuffer(value);
  const storedBuffer = toBuffer(stored);

  if (providedBuffer.length !== storedBuffer.length) {
    throw new InvalidCsrfTokenError();
  }

  if (!crypto.timingSafeEqual(providedBuffer, storedBuffer)) {
    throw new InvalidCsrfTokenError();
  }
}

export async function validateCsrfFromForm(formData: FormData): Promise<void> {
  const token = formData.get(CSRF_FIELD_NAME);
  await assertValidCsrfToken(typeof token === 'string' ? token : null);
}
