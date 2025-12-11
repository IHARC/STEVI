export function getString(form: FormData, key: string, { required = false, trim = true }: { required?: boolean; trim?: boolean } = {}): string | null {
  const value = form.get(key);
  if (typeof value !== 'string') {
    if (required) throw new Error(`${key} is required.`);
    return null;
  }
  const normalized = trim ? value.trim() : value;
  if (!normalized && required) throw new Error(`${key} is required.`);
  return normalized || null;
}

export function requireString(form: FormData, key: string): string {
  const value = getString(form, key, { required: true });
  return value as string;
}

export function getBoolean(form: FormData, key: string, fallback = false): boolean {
  const value = form.get(key);
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (['true', '1', 'on', 'yes'].includes(normalized)) return true;
    if (['false', '0', 'off', 'no', ''].includes(normalized)) return false;
  }
  if (typeof value === 'number') return value !== 0;
  return fallback;
}

export function getNumber(
  form: FormData,
  key: string,
  { required = false, allowNegative = false, min, max }: { required?: boolean; allowNegative?: boolean; min?: number; max?: number } = {},
): number | null {
  const raw = form.get(key);
  if (raw === null || raw === undefined || raw === '') {
    if (required) throw new Error(`${key} is required.`);
    return null;
  }
  const parsed = Number.parseFloat(String(raw));
  if (Number.isNaN(parsed)) throw new Error(`${key} must be a number.`);
  if (!allowNegative && parsed < 0) throw new Error(`${key} cannot be negative.`);
  if (typeof min === 'number' && parsed < min) throw new Error(`${key} must be >= ${min}.`);
  if (typeof max === 'number' && parsed > max) throw new Error(`${key} must be <= ${max}.`);
  return parsed;
}

export function parseEnum<T extends string>(value: string | null, allowed: readonly T[], { required = false }: { required?: boolean } = {}): T | null {
  if (!value) {
    if (required) throw new Error('Missing required enum value');
    return null;
  }
  if (allowed.includes(value as T)) {
    return value as T;
  }
  if (required) throw new Error('Invalid option.');
  return null;
}
