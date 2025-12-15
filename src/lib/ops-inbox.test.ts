import { describe, expect, it } from 'vitest';
import { cleanPathname, shouldShowOpsInbox } from '@/lib/ops-inbox';

describe('ops inbox visibility', () => {
  it('cleans query strings and trailing slashes', () => {
    expect(cleanPathname('/ops/today?foo=1')).toBe('/ops/today');
    expect(cleanPathname('/ops/today/')).toBe('/ops/today');
    expect(cleanPathname('/')).toBe('/');
  });

  it('shows inbox only on /ops/today when there are items', () => {
    expect(shouldShowOpsInbox('/ops/today', 1)).toBe(true);
    expect(shouldShowOpsInbox('/ops/today?x=1', 1)).toBe(true);
    expect(shouldShowOpsInbox('/ops/today', 0)).toBe(false);
    expect(shouldShowOpsInbox('/ops/supplies/donations', 99)).toBe(false);
    expect(shouldShowOpsInbox(null, 99)).toBe(false);
  });
});
