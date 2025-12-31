function normalizeArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(Boolean).map(String).slice().sort((a, b) => a.localeCompare(b));
}

export function diffFields<T extends Record<string, unknown>>(current: T, next: Partial<T>): string[] {
  const changed: string[] = [];
  Object.entries(next).forEach(([key, nextValue]) => {
    if (typeof nextValue === 'undefined') return;
    const currentValue = current[key];

    if (Array.isArray(nextValue) || Array.isArray(currentValue)) {
      const left = normalizeArray(currentValue);
      const right = normalizeArray(nextValue);
      if (left.length !== right.length || left.some((value, index) => value !== right[index])) {
        changed.push(key);
      }
      return;
    }

    if (currentValue instanceof Date || nextValue instanceof Date) {
      const left = currentValue ? new Date(currentValue as string).toISOString() : null;
      const right = nextValue ? new Date(nextValue as string).toISOString() : null;
      if (left !== right) changed.push(key);
      return;
    }

    if (currentValue !== nextValue) {
      changed.push(key);
    }
  });
  return changed;
}
