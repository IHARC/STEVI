import { describe, expect, it } from 'vitest';
import { filterTimelineEvent } from '@/lib/timeline/filters';
import type { TimelineEvent, TimelineEventCategory } from '@/lib/timeline/types';

function makeEvent(category: TimelineEventCategory): TimelineEvent {
  return {
    id: 'event-1',
    personId: 1,
    caseId: null,
    encounterId: null,
    owningOrgId: 10,
    eventCategory: category,
    eventAt: '2025-01-01T00:00:00Z',
    summary: null,
    metadata: {},
    visibilityScope: 'internal_to_org',
    sensitivityLevel: 'standard',
    createdByOrg: null,
  };
}

describe('timeline filters', () => {
  it('returns all events for the all filter', () => {
    expect(filterTimelineEvent(makeEvent('task'), 'all')).toBe(true);
  });

  it('groups encounter-style categories', () => {
    expect(filterTimelineEvent(makeEvent('encounter'), 'encounters')).toBe(true);
    expect(filterTimelineEvent(makeEvent('intake'), 'encounters')).toBe(true);
    expect(filterTimelineEvent(makeEvent('appointment'), 'encounters')).toBe(true);
    expect(filterTimelineEvent(makeEvent('task'), 'encounters')).toBe(false);
  });

  it('filters client updates and tasks explicitly', () => {
    expect(filterTimelineEvent(makeEvent('client_update'), 'client_updates')).toBe(true);
    expect(filterTimelineEvent(makeEvent('task'), 'client_updates')).toBe(false);
    expect(filterTimelineEvent(makeEvent('task'), 'tasks')).toBe(true);
    expect(filterTimelineEvent(makeEvent('note'), 'tasks')).toBe(false);
  });
});
