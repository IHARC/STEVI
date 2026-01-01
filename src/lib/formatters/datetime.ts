const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short' });
const DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' });

function coerceDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function formatDateTime(value: string | Date | null | undefined, fallback = 'Unknown date'): string {
  if (!value) return fallback;
  const date = coerceDate(value);
  if (!date) {
    return typeof value === 'string' ? value : fallback;
  }
  return DATE_TIME_FORMATTER.format(date);
}

export function formatDate(value: string | Date | null | undefined, fallback = '—'): string {
  if (!value) return fallback;
  const date = coerceDate(value);
  if (!date) {
    return typeof value === 'string' ? value : fallback;
  }
  return DATE_FORMATTER.format(date);
}
