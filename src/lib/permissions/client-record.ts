import type { PortalAccess } from '@/lib/portal-access';

export function canEditClientRecord(access: PortalAccess | null): boolean {
  if (!access) return false;
  return access.canAccessOpsFrontline || access.canAccessOpsAdmin;
}

export function assertCanEditClientRecord(
  access: PortalAccess | null,
  message = 'You do not have permission to edit client records.',
): asserts access is PortalAccess {
  if (!canEditClientRecord(access)) {
    throw new Error(message);
  }
}
