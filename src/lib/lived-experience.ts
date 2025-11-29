import type { Database } from '@/types/supabase';
import { formatEnumLabel } from '@/lib/enum-values';

export type LivedExperienceStatus = Database['portal']['Enums']['lived_experience_status'];

export const DEFAULT_LIVED_EXPERIENCE_COPY: Partial<Record<LivedExperienceStatus, { label: string; description: string }>> = {
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

export function buildLivedExperienceOptions(values: string[]) {
  return values.map((value) => {
    const copy = DEFAULT_LIVED_EXPERIENCE_COPY[value as LivedExperienceStatus];
    return {
      value,
      label: copy?.label ?? formatEnumLabel(value),
      description: copy?.description ?? '',
    };
  });
}

export function normalizeLivedExperience(value: string | null | undefined, allowedValues: string[]): LivedExperienceStatus {
  if (!value) {
    return (allowedValues[0] as LivedExperienceStatus) ?? 'none';
  }

  if (allowedValues.includes(value)) {
    return value as LivedExperienceStatus;
  }

  return (allowedValues[0] as LivedExperienceStatus) ?? 'none';
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
