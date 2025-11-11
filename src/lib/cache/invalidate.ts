import { revalidatePath, revalidateTag } from 'next/cache';
import { CACHE_TAGS } from './tags';

const IMMEDIATE_CACHE_LIFE = { expire: 0 } as const;

type InvalidateOptions = {
  ideaId?: string;
  planSlug?: string;
  petitionSlug?: string;
  pitSlug?: string;
  extraTags?: string[];
  paths?: string[];
};
export async function invalidateIdeaCaches(options: InvalidateOptions = {}) {
  const tags = new Set<string>([CACHE_TAGS.ideasList]);

  if (options.ideaId) {
    tags.add(CACHE_TAGS.idea(options.ideaId));
    tags.add(CACHE_TAGS.ideaComments(options.ideaId));
    tags.add(CACHE_TAGS.ideaReactions(options.ideaId));
  }

  if (options.extraTags) {
    for (const tag of options.extraTags) {
      if (tag) tags.add(tag);
    }
  }

  for (const tag of tags) {
    await revalidateTag(tag, IMMEDIATE_CACHE_LIFE);
  }

  if (options.paths) {
    for (const path of options.paths) {
      if (path) await revalidatePath(path, 'page');
    }
  }
}

export async function invalidateMetricCaches() {
  await revalidateTag(CACHE_TAGS.metrics, IMMEDIATE_CACHE_LIFE);
}

export async function invalidatePlanCaches(options: InvalidateOptions = {}) {
  const tags = new Set<string>([CACHE_TAGS.plansList]);

  if (options.planSlug) {
    tags.add(CACHE_TAGS.plan(options.planSlug));
  }

  if (options.extraTags) {
    for (const tag of options.extraTags) {
      if (tag) tags.add(tag);
    }
  }

  for (const tag of tags) {
    await revalidateTag(tag, IMMEDIATE_CACHE_LIFE);
  }

  if (options.paths) {
    for (const path of options.paths) {
      if (path) await revalidatePath(path, 'page');
    }
  }
}

export async function invalidateMythCaches(options: Omit<InvalidateOptions, 'ideaId' | 'planSlug' | 'petitionSlug' | 'pitSlug'> = {}) {
  const tags = new Set<string>([CACHE_TAGS.mythEntries]);

  if (options.extraTags) {
    for (const tag of options.extraTags) {
      if (tag) tags.add(tag);
    }
  }

  for (const tag of tags) {
    await revalidateTag(tag, IMMEDIATE_CACHE_LIFE);
  }

  if (options.paths) {
    for (const path of options.paths) {
      if (path) await revalidatePath(path, 'page');
    }
  }
}

export async function invalidatePitCaches(options: Omit<InvalidateOptions, 'ideaId' | 'planSlug' | 'petitionSlug'> = {}) {
  const tags = new Set<string>([CACHE_TAGS.pitSummary]);

  if (options.pitSlug) {
    tags.add(CACHE_TAGS.pitCount(options.pitSlug));
  }

  if (options.extraTags) {
    for (const tag of options.extraTags) {
      if (tag) tags.add(tag);
    }
  }

  for (const tag of tags) {
    await revalidateTag(tag, IMMEDIATE_CACHE_LIFE);
  }

  if (options.paths) {
    for (const path of options.paths) {
      if (path) await revalidatePath(path, 'page');
    }
  }
}

export async function invalidatePetitionCaches(slug: string, options: Omit<InvalidateOptions, 'petitionSlug' | 'planSlug' | 'ideaId'> = {}) {
  const tags = new Set<string>([CACHE_TAGS.petition(slug), CACHE_TAGS.petitionSigners(slug)]);

  if (options.extraTags) {
    for (const tag of options.extraTags) {
      if (tag) tags.add(tag);
    }
  }

  for (const tag of tags) {
    await revalidateTag(tag, IMMEDIATE_CACHE_LIFE);
  }

  if (options.paths) {
    for (const path of options.paths) {
      if (path) await revalidatePath(path, 'page');
    }
  }
}
