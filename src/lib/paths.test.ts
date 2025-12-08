import { describe, expect, it } from 'vitest';
import { normalizePathFromHeader, stripRouteGroups } from './paths';

describe('paths helpers', () => {
  describe('stripRouteGroups', () => {
    it('removes route group segments while keeping leading slash', () => {
      expect(stripRouteGroups('/(workspace)/staff/overview')).toBe('/staff/overview');
      expect(stripRouteGroups('/(client)/(foo)/admin/operations')).toBe('/admin/operations');
    });
  });

  describe('normalizePathFromHeader', () => {
    it('parses absolute URLs and strips route groups', () => {
      const result = normalizePathFromHeader('https://example.com/(workspace)/staff/overview?foo=1', '/');
      expect(result).toEqual({ pathname: '/staff/overview', path: '/staff/overview?foo=1' });
    });

    it('parses proxy style original urls', () => {
      const result = normalizePathFromHeader('/(workspace)/staff/caseload?bar=baz', '/');
      expect(result).toEqual({ pathname: '/staff/caseload', path: '/staff/caseload?bar=baz' });
    });

    it('falls back when raw path is missing', () => {
      const result = normalizePathFromHeader(null, '/fallback');
      expect(result).toEqual({ pathname: '/fallback', path: '/fallback' });
    });
  });
});
