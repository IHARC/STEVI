import type { TimelineFilterId } from '@/lib/timeline/filters';
import { formatSnakeCase } from './text';

export function formatTimelineFilterLabel(filter: TimelineFilterId): string {
  switch (filter) {
    case 'encounters':
      return 'Encounters';
    case 'client_updates':
      return 'Client updates';
    case 'observations':
      return 'Observations';
    default:
      return formatSnakeCase(filter, filter);
  }
}

export function formatTimelineCategoryLabel(category: string): string {
  return formatSnakeCase(category, category);
}
