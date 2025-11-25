import { redirect } from 'next/navigation';
import type { PortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
import type { IharcRole } from '@/lib/ihar-auth';
import { INVENTORY_ALLOWED_ROLES } from '@/lib/inventory/constants';
import type { SupabaseAnyServerClient } from '@/lib/supabase/types';

export type InventoryActorContext = {
  profile: PortalProfile;
  roles: IharcRole[];
};

export class InventoryAccessError extends Error {
  constructor(message = 'You do not have permission to manage inventory.') {
    super(message);
    this.name = 'InventoryAccessError';
  }
}

function hasRequiredRole(roles: IharcRole[]): boolean {
  return roles.some((role) => INVENTORY_ALLOWED_ROLES.includes(role));
}

export function isInventoryAdmin(roles: IharcRole[]): boolean {
  return roles.includes('iharc_admin');
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
      redirect('/login?next=/admin/inventory');
    }
    throw new InventoryAccessError('Sign in to continue.');
  }

  const access = await loadPortalAccess(supabase);
  if (!access) {
    if (redirectOnFailure) {
      redirect('/login?next=/admin/inventory');
    }
    throw new InventoryAccessError('Sign in to continue.');
  }

  if (!access.canAccessInventoryWorkspace || !hasRequiredRole(access.iharcRoles)) {
    if (redirectOnFailure) {
      redirect('/admin');
    }
    throw new InventoryAccessError('IHARC inventory access is restricted to staff accounts.');
  }

  return { profile: access.profile, roles: access.iharcRoles };
}

export function requireInventoryAdmin(roles: IharcRole[]): void {
  if (!isInventoryAdmin(roles)) {
    throw new InventoryAccessError('Only IHARC admins can change inventory locations.');
  }
}
