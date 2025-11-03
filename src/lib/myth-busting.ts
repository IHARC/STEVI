import type { Database, Json } from '@/types/supabase';

export type MythStatus = Database['public']['Enums']['myth_truth_status'];

export type MythSource = {
  label: string;
  url?: string;
};

export const MYTH_STATUS_CONFIG: Record<
  MythStatus,
  {
    label: string;
    helper: string;
    tone: 'affirmed' | 'incorrect' | 'mixed' | 'contextual' | 'uncertain';
  }
> = {
  true: {
    label: 'True',
    helper: 'Evidence from partners and neighbours confirms this statement.',
    tone: 'affirmed',
  },
  false: {
    label: 'False',
    helper: 'Collaborative data and case notes contradict this claim.',
    tone: 'incorrect',
  },
  partially_true: {
    label: 'Partially true',
    helper: 'Some parts are accurate, but key details are missing or outdated.',
    tone: 'mixed',
  },
  context_dependent: {
    label: 'Context dependent',
    helper: 'Accurate in limited situations—review the nuance and local examples.',
    tone: 'contextual',
  },
  needs_more_evidence: {
    label: 'Needs more evidence',
    helper: 'We are gathering additional stories and data before confirming.',
    tone: 'uncertain',
  },
};

export type MythStatusBadgeStyle = {
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
};

export const MYTH_STATUS_BADGE_STYLES: Record<MythStatus, MythStatusBadgeStyle> = {
  true: { variant: 'default' },
  false: { variant: 'destructive' },
  partially_true: { variant: 'secondary' },
  context_dependent: { variant: 'outline', className: 'border-outline/40 bg-surface-container text-on-surface' },
  needs_more_evidence: { variant: 'outline', className: 'border-outline/40 bg-surface-container-low text-on-surface/80' },
};

export function normalizeMythSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function parseMythSourcesInput(input: string): MythSource[] {
  if (!input) {
    return [];
  }

  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawLabel, rawUrl] = line.split('|');
      const label = rawLabel?.trim() ?? '';
      const url = rawUrl?.trim() ?? '';
      if (!label) {
        return null;
      }
      const source: MythSource = { label };
      if (url) {
        source.url = url;
      }
      return source;
    })
    .filter((source): source is MythSource => source !== null);
}

export function parseMythTagsInput(input: string): string[] {
  if (!input) {
    return [];
  }

  return input
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

export function mythSourcesFromJson(value: Json | MythSource[] | null | undefined): MythSource[] {
  if (!value) {
    return [];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const label = 'label' in item && typeof item.label === 'string' ? item.label : '';
      if (!label) {
        return null;
      }

      const url = 'url' in item && typeof item.url === 'string' ? item.url : undefined;
      return url ? { label, url } : { label };
    })
    .filter((source): source is MythSource => source !== null);
}

export function mythSourcesToTextarea(value: Json | MythSource[] | null | undefined): string {
  return mythSourcesFromJson(value)
    .map((source) => (source.url ? `${source.label} | ${source.url}` : source.label))
    .join('\n');
}

export function isValidMythStatus(value: string | null | undefined): value is MythStatus {
  if (!value) {
    return false;
  }
  return Object.hasOwn(MYTH_STATUS_CONFIG, value);
}
