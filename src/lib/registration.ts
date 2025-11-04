import crypto from 'node:crypto';

const DIGITS = '0123456789';

export function generatePortalCode(length = 8): string {
  if (length <= 0) {
    throw new Error('Portal code length must be greater than zero');
  }

  let result = '';
  for (let i = 0; i < length; i += 1) {
    const index = crypto.randomInt(0, DIGITS.length);
    result += DIGITS[index];
  }
  return result;
}

export function formatPortalCode(code: string | null | undefined): string | null {
  if (!code) {
    return null;
  }

  const cleaned = code.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  if (cleaned.length <= 4) {
    return cleaned;
  }

  if (cleaned.length === 8) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  }

  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  return cleaned;
}

export function emptyToNull(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function normalizePostalCode(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const cleaned = value.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  if (!cleaned) {
    return null;
  }

  if (cleaned.length === 6) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
  }

  return cleaned;
}
