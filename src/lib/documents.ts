import { createSupabaseRSCClient } from '@/lib/supabase/rsc';

export type ClientDocument = {
  path: string;
  name: string;
  signedUrl: string | null;
  lastModified: string | null;
  size: number | null;
  category: string | null;
  expiresAt: string | null;
  sharedBy?: string | null;
  lastViewedAt?: string | null;
};

type AttachmentMetadata = {
  category?: string;
  expires_at?: string;
  expiresAt?: string;
  shared_by?: string;
  last_viewed_at?: string;
  [key: string]: unknown;
};

type StorageObject = {
  name: string;
  id?: string;
  created_at?: string;
  updated_at?: string;
  last_accessed_at?: string;
  metadata?: AttachmentMetadata | null;
  size?: number;
};

const BUCKET = 'portal-attachments';

function resolveCategoryFromName(name: string): string | null {
  const lowered = name.toLowerCase();
  if (lowered.includes('id') || lowered.includes('passport') || lowered.includes('license')) return 'identity';
  if (lowered.includes('health') || lowered.includes('med') || lowered.includes('clinic')) return 'health';
  if (lowered.includes('lease') || lowered.includes('housing')) return 'housing';
  return null;
}

function readExpiresAt(meta: AttachmentMetadata | null | undefined): string | null {
  if (!meta) return null;
  const value = meta.expires_at || meta.expiresAt;
  if (!value || typeof value !== 'string') return null;
  return value;
}

export async function listClientDocuments(profileId: string): Promise<ClientDocument[]> {
  const supabase = await createSupabaseRSCClient();

  try {
    const prefix = profileId;
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
      limit: 50,
      sortBy: { column: 'created_at', order: 'desc' },
    });

    if (error) {
      console.warn('Unable to list client documents', error);
      return [];
    }

    const objects = (data ?? []) as StorageObject[];

    const results: ClientDocument[] = [];
    for (const object of objects) {
      const path = `${prefix}/${object.name}`;
      const expiresAt = readExpiresAt(object.metadata ?? null);
      const category = (object.metadata?.category as string | undefined) ?? resolveCategoryFromName(object.name);
      const sharedBy = (object.metadata?.shared_by as string | undefined) ?? null;
      const lastViewedAt = (object.metadata?.last_viewed_at as string | undefined) ?? null;

      let signedUrl: string | null = null;
      try {
        const { data: signed } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(path, 60 * 30); // 30 minutes
        signedUrl = signed?.signedUrl ?? null;
      } catch (signedError) {
        console.warn('Failed to create signed URL for document', path, signedError);
      }

      results.push({
        path,
        name: object.name,
        signedUrl,
        lastModified: object.updated_at ?? object.created_at ?? null,
        size: object.size ?? null,
        category: category ?? null,
        expiresAt,
        sharedBy,
        lastViewedAt,
      });
    }

    return results;
  } catch (err) {
    console.warn('Failed to load client documents', err);
    return [];
  }
}
