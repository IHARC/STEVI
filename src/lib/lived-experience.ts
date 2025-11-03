import type { Database } from '@/types/supabase';

export type LivedExperienceStatus = Database['portal']['Enums']['lived_experience_status'];

export const LIVED_EXPERIENCE_VALUES = ['none', 'current', 'former', 'prefer_not_to_share'] as const satisfies LivedExperienceStatus[];

export const LIVED_EXPERIENCE_COPY: Record<LivedExperienceStatus, { label: string; description: string }> = {
  none: {
    label: 'No lived experience to share',
    description: 'Keeps collaboration focused on community building without adding personal context.',
  },
  current: {
    label: 'Currently navigating this lived experience',
    description: 'Signals that you are living through this reality right now and want that perspective acknowledged.',
  },
  former: {
    label: 'Previously navigated this lived experience',
    description: 'Honours lived expertise from past chapters and ongoing peer mentorship.',
  },
  prefer_not_to_share: {
    label: 'Prefer not to share',
    description: 'Lets neighbours know you are choosing privacy while still welcoming collaboration.',
  },
};

export const LIVED_EXPERIENCE_OPTIONS = LIVED_EXPERIENCE_VALUES.map((value) => ({
  value,
  label: LIVED_EXPERIENCE_COPY[value].label,
  description: LIVED_EXPERIENCE_COPY[value].description,
}));

export function normalizeLivedExperience(value: string | null | undefined): LivedExperienceStatus {
  if (!value) {
    return 'none';
  }

  if (LIVED_EXPERIENCE_VALUES.includes(value as LivedExperienceStatus)) {
    return value as LivedExperienceStatus;
  }

  return 'none';
}

export function getHomelessnessBadgeLabel(status: LivedExperienceStatus): string | null {
  switch (status) {
    case 'current':
      return 'Currently experiencing homelessness';
    case 'former':
      return 'Formerly experienced homelessness';
    default:
      return null;
  }
}

export function getSubstanceUseBadgeLabel(status: LivedExperienceStatus): string | null {
  switch (status) {
    case 'current':
      return 'Currently navigating substance use challenges';
    case 'former':
      return 'Formerly navigated substance use challenges';
    default:
      return null;
  }
}
