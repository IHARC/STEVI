export const PLAN_SUPPORT_THRESHOLD = 10;

export const DEFAULT_FOCUS_AREAS = [
  'Site & Logistics',
  'Health & Safety',
  'Outreach & Intake',
  'Security & Legal',
  'Budget & Procurement',
  'Ops & Staffing',
  'Community Engagement',
  'Data & Metrics',
];

export function slugifyPlanSlug(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
