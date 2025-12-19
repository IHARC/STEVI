export type SearchParamsRecord = Record<string, string | string[] | undefined>;

export function toSearchParams(input?: SearchParamsRecord | null): URLSearchParams {
  const params = new URLSearchParams();
  if (!input) return params;
  Object.entries(input).forEach(([key, value]) => {
    if (typeof value === 'string') {
      params.set(key, value);
      return;
    }
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
      params.set(key, value[0]);
    }
  });
  return params;
}

export function normalizeEnumParam<T extends string>(
  params: URLSearchParams,
  key: string,
  allowed: readonly T[],
  fallback: T,
): { value: T; redirected: boolean } {
  const current = params.get(key);
  const normalized = allowed.includes(current as T) ? (current as T) : fallback;
  const redirected = current !== normalized;
  if (redirected) {
    params.set(key, normalized);
  }
  return { value: normalized, redirected };
}

export function paramsToRecord(params: URLSearchParams): SearchParamsRecord {
  const record: SearchParamsRecord = {};
  params.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}
