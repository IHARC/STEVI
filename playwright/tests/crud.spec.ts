import { test, expect } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildCrudSlug,
  cleanupResourcePages,
  createAuthedSupabase,
  fetchAdminProfileId,
  resolveCrudEnv,
  CRUD_SLUG_PREFIX,
} from '../utils/e2e-supabase';

const envResult = resolveCrudEnv();

test.describe('Supabase CRUD (resource pages)', () => {
  const skipReason = envResult.ready ? undefined : envResult.reason;
  test.skip(!envResult.ready, skipReason);

  let supabase: SupabaseClient | null = null;
  let adminProfileId = '';

  test.beforeAll(async () => {
    if (!envResult.ready) return;
    supabase = await createAuthedSupabase(envResult.env);
    adminProfileId = await fetchAdminProfileId(supabase);
  });

  test.afterAll(async () => {
    if (!envResult.ready) return;
    try {
      await cleanupResourcePages(envResult.env, supabase ?? undefined);
    } catch (error) {
      console.error(String(error));
      throw error;
    }
  });

  test('creates, reads, updates, and deletes a resource page', async () => {
    if (!envResult.ready) return;

    if (!supabase) {
      throw new Error('Supabase client was not initialized for CRUD tests.');
    }

    const slug = buildCrudSlug();
    const createdAt = new Date().toISOString();
    let createdId: string | null = null;
    let testError: unknown = null;

    try {
      const { data: created, error: createError } = await supabase
        .schema('portal')
        .from('resource_pages')
        .insert({
          slug,
          title: `E2E CRUD ${createdAt}`,
          summary: 'E2E CRUD test page',
          body_html: '<p>E2E CRUD test page</p>',
          date_published: createdAt,
          kind: 'other',
          is_published: false,
          tags: ['e2e', 'crud'],
          embed_placement: 'below',
          created_by_profile_id: adminProfileId,
          updated_by_profile_id: adminProfileId,
        })
        .select('id, slug, title')
        .single();

      expect(createError).toBeNull();
      expect(created?.id).toBeTruthy();
      createdId = created?.id ?? null;

      const { data: fetched, error: fetchError } = await supabase
        .schema('portal')
        .from('resource_pages')
        .select('id, slug, title, summary')
        .eq('id', createdId!)
        .maybeSingle();

      expect(fetchError).toBeNull();
      expect(fetched?.slug).toBe(slug);
      expect(fetched?.summary).toBe('E2E CRUD test page');

      const updatedTitle = `E2E CRUD Updated ${createdAt}`;
      const { error: updateError } = await supabase
        .schema('portal')
        .from('resource_pages')
        .update({
          title: updatedTitle,
          summary: 'E2E CRUD updated summary',
          updated_by_profile_id: adminProfileId,
        })
        .eq('id', createdId!);

      expect(updateError).toBeNull();

      const { data: updated, error: updatedFetchError } = await supabase
        .schema('portal')
        .from('resource_pages')
        .select('id, title, summary')
        .eq('id', createdId!)
        .maybeSingle();

      expect(updatedFetchError).toBeNull();
      expect(updated?.title).toBe(updatedTitle);
      expect(updated?.summary).toBe('E2E CRUD updated summary');
    } catch (error) {
      testError = error;
      throw error;
    } finally {
      if (!createdId) return;

      try {
        const { error: deleteError } = await supabase
          .schema('portal')
          .from('resource_pages')
          .delete()
          .eq('id', createdId);

        if (deleteError) {
          throw deleteError;
        }

        const { data: deletedCheck, error: deletedCheckError } = await supabase
          .schema('portal')
          .from('resource_pages')
          .select('id')
          .eq('id', createdId)
          .maybeSingle();

        if (deletedCheckError) {
          throw deletedCheckError;
        }

        expect(deletedCheck).toBeNull();
      } catch (cleanupError) {
        console.error(
          `E2E cleanup failed for resource page ${createdId}. Manual cleanup: delete from portal.resource_pages where slug like '${CRUD_SLUG_PREFIX}%' or id = '${createdId}'.`,
        );
        if (!testError) {
          throw cleanupError;
        }
      }
    }
  });
});
