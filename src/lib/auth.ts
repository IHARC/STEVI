export type NextParam = string | string[] | undefined;

export function resolveNextPath(raw: NextParam, fallback = '/home'): string {
  if (!raw) {
    return fallback;
  }

  const candidate = Array.isArray(raw) ? raw[0] : raw;
  if (!candidate) {
    return fallback;
  }

  if (!candidate.startsWith('/') || candidate.startsWith('//')) {
    return fallback;
  }

  return candidate;
}
