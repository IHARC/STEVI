import { redirect } from 'next/navigation';
import type { PortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
import type { SupabaseAnyServerClient } from '@/lib/supabase/types';

export type InventoryActorContext = {
  profile: PortalProfile;
  canManageLocations: boolean;
  isGlobalAdmin: boolean;
};

export class InventoryAccessError extends Error {
  constructor(message = 'You do not have permission to manage inventory.') {
    super(message);
    this.name = 'InventoryAccessError';
  }
}

export function isInventoryAdmin(canManageLocations: boolean): boolean {
  return canManageLocations;
}

export async function ensureInventoryActor(
  supabase: SupabaseAnyServerClient,
  redirectOnFailure = false,
): Promise<InventoryActorContext> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    if (redirectOnFailure) {
      redirect(`/auth/start?next=${encodeURIComponent('/ops/inventory?view=dashboard')}`);
    }
    throw new InventoryAccessError('Sign in to continue.');
  }

  const access = await loadPortalAccess(supabase);
  if (!access) {
    if (redirectOnFailure) {
      redirect(`/auth/start?next=${encodeURIComponent('/ops/inventory?view=dashboard')}`);
    }
    throw new InventoryAccessError('Sign in to continue.');
  }

  if (!access.canAccessInventoryOps) {
    if (redirectOnFailure) {
      redirect('/ops/today');
    }
    throw new InventoryAccessError('IHARC inventory access is restricted to staff accounts.');
  }

  return { profile: access.profile, canManageLocations: access.canManageInventoryLocations, isGlobalAdmin: access.isGlobalAdmin };
}

export function requireInventoryAdmin(canManageLocations: boolean): void {
  if (!isInventoryAdmin(canManageLocations)) {
    throw new InventoryAccessError('Only IHARC admins can change inventory locations.');
  }
}
