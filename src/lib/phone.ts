const DEFAULT_COUNTRY_CODE = '+1';

function stripNonDigits(value: string): string {
  return value.replace(/\D+/g, '');
}

export function normalizePhoneNumber(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const hasPlus = trimmed.startsWith('+');
  const digits = stripNonDigits(trimmed);
  if (!digits) {
    return undefined;
  }

  if (hasPlus) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `${DEFAULT_COUNTRY_CODE}${digits}`;
  }

  if (digits.length > 10) {
    return `+${digits}`;
  }

  return undefined;
}

export function maskPhoneNumber(value: string): string {
  const normalized = normalizePhoneNumber(value);
  if (!normalized) {
    return '';
  }

  const last4 = normalized.slice(-4);
  const prefix = normalized.slice(0, Math.max(2, normalized.length - 4)).replace(/\d/g, '*');
  return `${prefix}${last4}`;
}
