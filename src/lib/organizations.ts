import type { Json } from '@/types/supabase';

export const ORG_FEATURE_OPTIONS = [
  { value: 'appointments', label: 'Appointments' },
  { value: 'documents', label: 'Documents locker' },
  { value: 'notifications', label: 'Notifications' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'donations', label: 'Donations' },
  { value: 'metrics', label: 'Metrics' },
  { value: 'org_workspace', label: 'Org workspace' },
] as const;

export type OrgFeatureKey = (typeof ORG_FEATURE_OPTIONS)[number]['value'];

export const ORG_FEATURE_KEYS: OrgFeatureKey[] = ORG_FEATURE_OPTIONS.map((option) => option.value);

const ORG_FEATURE_SET = new Set<OrgFeatureKey>(ORG_FEATURE_KEYS);

export function isOrgFeatureKey(value: string | null | undefined): value is OrgFeatureKey {
  if (!value) return false;
  return ORG_FEATURE_SET.has(value as OrgFeatureKey);
}

export function extractOrgFeatureFlags(tags: Json | null): OrgFeatureKey[] {
  if (!tags) return [];

  if (Array.isArray(tags)) {
    return tags
      .map((tag) => (typeof tag === 'string' ? tag : null))
      .filter(isOrgFeatureKey);
  }

  if (typeof tags === 'object') {
    const featureList = (tags as Record<string, unknown>).features;
    if (Array.isArray(featureList)) {
      return featureList
        .map((tag) => (typeof tag === 'string' ? tag : null))
        .filter(isOrgFeatureKey);
    }
  }

  return [];
}

export function mergeFeatureFlagsIntoTags(existing: Json | null, features: OrgFeatureKey[]): Json | null {
  if (Array.isArray(existing)) {
    const preserved = existing
      .map((entry) => (typeof entry === 'string' ? entry : null))
      .filter((entry): entry is string => Boolean(entry) && !isOrgFeatureKey(entry));
    if (features.length === 0) {
      return preserved.length ? preserved : null;
    }
    return [...preserved, ...features];
  }

  if (existing && typeof existing === 'object') {
    const base = { ...(existing as Record<string, unknown>) };
    if (features.length) {
      base.features = features;
    } else {
      delete base.features;
    }
    return Object.keys(base).length ? (base as Json) : null;
  }

  if (features.length === 0) {
    return null;
  }

  return features;
}
