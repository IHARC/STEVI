export const GENDER_VALUES = ['Male', 'Female', 'Non-binary', 'Other', 'Prefer not to say'] as const;

export const HOUSING_STATUS_VALUES = [
  'housed',
  'emergency_shelter',
  'transitional_housing',
  'temporarily_housed',
  'unsheltered',
  'unknown',
] as const;

export const RISK_LEVEL_VALUES = ['low', 'medium', 'high', 'critical', 'unknown'] as const;

export const URGENCY_VALUES = ['emergency', 'urgent', 'concern', 'followup', 'routine'] as const;

export const HEALTH_CONCERN_VALUES = [
  'mental_health',
  'addiction_substance_use',
  'physical_health',
  'chronic_conditions',
  'disabilities',
  'none',
] as const;

export const RISK_FACTOR_VALUES = [
  'Substance Use',
  'Mental Health',
  'Domestic Violence',
  'Justice Involvement',
  'Chronic Health',
  'Weather Exposure',
  'Mobility Issue',
] as const;

export function formatValueLabel(value: string): string {
  if (!value) return value;
  if (/[A-Z]/.test(value)) return value;
  return value
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export const GENDER_OPTIONS = GENDER_VALUES.map((value) => ({ value, label: value }));
export const HOUSING_STATUS_OPTIONS = HOUSING_STATUS_VALUES.map((value) => ({ value, label: formatValueLabel(value) }));
export const RISK_LEVEL_OPTIONS = RISK_LEVEL_VALUES.map((value) => ({ value, label: formatValueLabel(value) }));
export const URGENCY_OPTIONS = URGENCY_VALUES.map((value) => ({ value, label: formatValueLabel(value) }));
export const HEALTH_CONCERN_OPTIONS = HEALTH_CONCERN_VALUES.map((value) => ({ value, label: formatValueLabel(value) }));
export const RISK_FACTOR_OPTIONS = RISK_FACTOR_VALUES.map((value) => ({ value, label: value }));
