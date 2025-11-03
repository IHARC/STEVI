export const CACHE_TAGS = {
  metrics: 'portal:metrics',
  metricRange(range: number) {
    return `portal:metrics:range:${range}`;
  },
  ideasList: 'portal:ideas:list',
  idea(id: string) {
    return `portal:ideas:${id}`;
  },
  ideaComments(ideaId: string) {
    return `portal:ideas:${ideaId}:comments`;
  },
  ideaReactions(ideaId: string) {
    return `portal:ideas:${ideaId}:reactions`;
  },
  plansList: 'portal:plans:list',
  plan(slug: string) {
    return `portal:plans:${slug}`;
  },
  mythEntries: 'marketing:myths',
  pitSummary: 'marketing:pit:summary',
  pitCount(slug: string) {
    return `marketing:pit:count:${slug}`;
  },
  petition(slug: string) {
    return `portal:petition:${slug}`;
  },
  petitionSigners(slug: string) {
    return `portal:petition:${slug}:signers`;
  },
} as const;
