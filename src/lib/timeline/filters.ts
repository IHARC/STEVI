import type { TimelineEvent, TimelineEventCategory } from '@/lib/timeline/types';

export const TIMELINE_FILTERS = [
  'all',
  'encounters',
  'tasks',
  'client_updates',
  'notes',
  'medical',
  'justice',
  'relationships',
  'characteristics',
] as const;

export type TimelineFilterId = (typeof TIMELINE_FILTERS)[number];

const ENCOUNTER_CATEGORIES: TimelineEventCategory[] = ['encounter', 'intake', 'appointment'];

export function filterTimelineEvent(event: TimelineEvent, filter: TimelineFilterId): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'encounters':
      return ENCOUNTER_CATEGORIES.includes(event.eventCategory);
    case 'tasks':
      return event.eventCategory === 'task';
    case 'client_updates':
      return event.eventCategory === 'client_update';
    case 'notes':
      return event.eventCategory === 'note';
    case 'medical':
      return event.eventCategory === 'medical';
    case 'justice':
      return event.eventCategory === 'justice';
    case 'relationships':
      return event.eventCategory === 'relationship';
    case 'characteristics':
      return event.eventCategory === 'characteristic';
    default:
      return true;
  }
}
