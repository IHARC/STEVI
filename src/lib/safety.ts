const REDACTED_VALUE = '[redacted]';
const MAX_STRING_LENGTH = 1024;
const SENSITIVE_KEYWORDS = [
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
  'session',
  'otp',
  'code',
  'sin',
  'ssn',
  'birth',
  'dob',
  'email',
  'phone',
  'contact',
  'address',
];

type JsonPrimitive = string | number | boolean | null;
type JsonLike = JsonPrimitive | JsonLike[] | { [key: string]: JsonLike };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

function shouldRedact(key: string) {
  const normalized = key.toLowerCase();

  return SENSITIVE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function sanitizeValue(value: unknown, seen: WeakSet<object>): JsonLike | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === 'string') {
    if (value.length > MAX_STRING_LENGTH) {
      return `${value.slice(0, MAX_STRING_LENGTH)}...`;
    }

    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof URL) {
    return value.toString();
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
    };
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeValue(item, seen))
      .filter((item): item is JsonLike => item !== undefined);
  }

  if (value instanceof Set) {
    return Array.from(value)
      .map((item) => sanitizeValue(item, seen))
      .filter((item): item is JsonLike => item !== undefined);
  }

  if (value instanceof Map) {
    const result: Record<string, JsonLike> = {};

    value.forEach((mapValue, key) => {
      const sanitized = sanitizeValue(mapValue, seen);
      if (sanitized !== undefined) {
        result[String(key)] = sanitized;
      }
    });

    return result;
  }

  if (typeof value === 'object' && isPlainObject(value)) {
    if (seen.has(value)) {
      return REDACTED_VALUE;
    }

    seen.add(value);

    return sanitizeObject(value, seen);
  }

  return String(value);
}

function sanitizeObject(
  value: Record<string, unknown>,
  seen: WeakSet<object>,
): Record<string, JsonLike> {
  const output: Record<string, JsonLike> = {};

  Object.entries(value).forEach(([key, entryValue]) => {
    if (shouldRedact(key)) {
      output[key] = REDACTED_VALUE;
      return;
    }

    const sanitized = sanitizeValue(entryValue, seen);

    if (sanitized !== undefined) {
      output[key] = sanitized;
    }
  });

  return output;
}

export function sanitizeForAudit(meta: Record<string, unknown>): Record<string, JsonLike> {
  if (!isPlainObject(meta)) {
    return {};
  }

  return sanitizeObject(meta, new WeakSet());
}
