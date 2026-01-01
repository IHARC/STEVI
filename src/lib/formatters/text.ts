export function formatEnumLabel(value: string | null | undefined, fallback = '—'): string {
  if (!value) return fallback;
  const normalized = value.replaceAll('_', ' ');
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatSnakeCase(value: string | null | undefined, fallback = '—'): string {
  if (!value) return fallback;
  return value.replaceAll('_', ' ');
}
