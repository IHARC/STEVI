'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensurePortalProfile } from '@/lib/profile';
import { getIharcRoles } from '@/lib/ihar-auth';
import { logAuditEvent } from '@/lib/audit';

type AdminContext = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  donationsClient: ReturnType<Awaited<ReturnType<typeof createSupabaseServerClient>>['schema']>;
  actorProfileId: string;
};

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `donation-${Date.now()}`;
}

async function requirePortalAdmin(): Promise<AdminContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw error ?? new Error('Sign in to continue.');
  }

  const roles = getIharcRoles(user);
  if (!roles.includes('iharc_admin')) {
    throw new Error('IHARC admin access is required.');
  }

  const profile = await ensurePortalProfile(supabase, user.id);
  return { supabase, donationsClient: supabase.schema('donations'), actorProfileId: profile.id };
}

export async function saveCatalogItem(formData: FormData) {
  const { supabase, donationsClient, actorProfileId } = await requirePortalAdmin();

  const id = (formData.get('id') as string | null)?.trim() || null;
  const rawTitle = (formData.get('title') as string | null)?.trim() ?? '';
  if (!rawTitle) {
    throw new Error('Add a title for this item.');
  }

  const slugInput = (formData.get('slug') as string | null)?.trim() ?? '';
  const slug = normalizeSlug(slugInput || rawTitle);
  const shortDescription = (formData.get('short_description') as string | null)?.trim() || null;
  const longDescription = (formData.get('long_description') as string | null)?.trim() || null;
  const category = (formData.get('category') as string | null)?.trim() || null;
  const inventoryItemId = (formData.get('inventory_item_id') as string | null)?.trim() || null;
  if (!inventoryItemId) {
    throw new Error('Select an inventory item to link.');
  }
  const unitCostInput = (formData.get('unit_cost') as string | null)?.trim() ?? '';
  const unitCostCents =
    unitCostInput.length === 0 ? null : Math.max(0, Math.round((Number.parseFloat(unitCostInput) || 0) * 100));
  const currency = ((formData.get('currency') as string | null)?.trim() || 'CAD').toUpperCase();
  const defaultQuantity = Math.max(1, parseInt(String(formData.get('default_quantity') ?? '1'), 10) || 1);
  const priority = Math.max(1, parseInt(String(formData.get('priority') ?? '100'), 10) || 100);
  const targetBuffer = formData.get('target_buffer')
    ? parseInt(String(formData.get('target_buffer')), 10) || null
    : null;
  const imageUrl = (formData.get('image_url') as string | null)?.trim() || null;
  const stripePriceId = (formData.get('stripe_price_id') as string | null)?.trim() || null;
  const isActive = formData.get('is_active') === 'on';

  const payload = {
    slug,
    title: rawTitle,
    short_description: shortDescription,
    long_description: longDescription,
    category,
    inventory_item_id: inventoryItemId,
    unit_cost_cents: unitCostCents,
    currency,
    default_quantity: defaultQuantity,
    priority,
    target_buffer: targetBuffer,
    image_url: imageUrl,
    stripe_price_id: stripePriceId,
    is_active: isActive,
  };

  const query = id
    ? donationsClient.from('catalog_items').update(payload).eq('id', id)
    : donationsClient.from('catalog_items').insert(payload);

  const { data, error: upsertError } = await query.select('id').maybeSingle();
  if (upsertError) {
    throw upsertError;
  }

  await logAuditEvent(supabase, {
    actorProfileId,
    action: id ? 'donation_catalog_updated' : 'donation_catalog_created',
    entityType: 'donation_catalog_item',
    entityId: data?.id ?? null,
    meta: { slug, title: rawTitle },
  });

  await revalidatePath('/admin/donations');
}

export async function toggleCatalogItem(formData: FormData) {
  const { supabase, donationsClient, actorProfileId } = await requirePortalAdmin();
  const id = (formData.get('id') as string | null)?.trim();
  if (!id) {
    throw new Error('Missing catalogue item id.');
  }
  const nextState = (formData.get('next_state') as string | null) === 'activate';

  const { error } = await donationsClient.from('catalog_items').update({ is_active: nextState }).eq('id', id);
  if (error) throw error;

  await logAuditEvent(supabase, {
    actorProfileId,
    action: 'donation_catalog_status_changed',
    entityType: 'donation_catalog_item',
    entityId: id,
    meta: { is_active: nextState },
  });

  await revalidatePath('/admin/donations');
}

export async function importInventoryItem(formData: FormData) {
  const { supabase, donationsClient, actorProfileId } = await requirePortalAdmin();
  const inventoryItemId = (formData.get('inventory_item_id') as string | null)?.trim();
  if (!inventoryItemId) {
    throw new Error('Select an inventory item to import.');
  }

  // prevent duplicates
  const { data: existing, error: existingError } = await donationsClient
    .from('catalog_items')
    .select('id')
    .eq('inventory_item_id', inventoryItemId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    throw new Error('This inventory item is already in the donation catalogue.');
  }

  const { data: inventoryRow, error: inventoryError } = await supabase
    .schema('inventory')
    .from('v_items_with_balances')
    .select('id, name, category, cost_per_unit, minimum_threshold')
    .eq('id', inventoryItemId)
    .maybeSingle();
  if (inventoryError) throw inventoryError;
  if (!inventoryRow) {
    throw new Error('Inventory item not found.');
  }

  const unitCost = Number.parseFloat(String(inventoryRow.cost_per_unit ?? '0'));
  const unitCostCents = Number.isFinite(unitCost) ? Math.max(0, Math.round(unitCost * 100)) : null;
  const targetBuffer =
    inventoryRow.minimum_threshold === null || inventoryRow.minimum_threshold === undefined
      ? null
      : Number.parseInt(String(inventoryRow.minimum_threshold), 10) || null;

  const title = String(inventoryRow.name ?? 'Donation item');
  const slug = normalizeSlug(title);
  const category = typeof inventoryRow.category === 'string' ? inventoryRow.category : null;

  const { data: inserted, error: insertError } = await donationsClient
    .from('catalog_items')
    .insert({
      inventory_item_id: inventoryItemId,
      title,
      slug,
      category,
      unit_cost_cents: unitCostCents,
      target_buffer: targetBuffer,
      default_quantity: 1,
      priority: 100,
      currency: 'CAD',
      is_active: true,
    })
    .select('id')
    .maybeSingle();
  if (insertError) throw insertError;

  await logAuditEvent(supabase, {
    actorProfileId,
    action: 'donation_catalog_imported',
    entityType: 'donation_catalog_item',
    entityId: inserted?.id ?? null,
    meta: { inventory_item_id: inventoryItemId, title },
  });

  await revalidatePath('/admin/donations');
}
