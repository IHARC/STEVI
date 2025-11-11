import crypto from 'node:crypto';
import { cookies } from 'next/headers';

export const CSRF_COOKIE_NAME = '__Host-stevi-csrf';
export const CSRF_FIELD_NAME = 'csrf_token';
const TOKEN_LENGTH_BYTES = 32;
export const CSRF_ERROR_MESSAGE = 'For your safety, refresh the page and try again.';

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
  const existing = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  if (existing) {
    return existing;
  }

  const token = generateToken();
  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV !== 'development',
    path: '/',
  });

  return token;
}

export async function assertValidCsrfToken(value: string | null | undefined): Promise<void> {
  const cookieStore = await cookies();
  const stored = cookieStore.get(CSRF_COOKIE_NAME)?.value;

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
