const IHARC_ROLE_PREFIX = 'iharc_';

export type IharcRole =
  | 'iharc_admin'
  | 'iharc_supervisor'
  | 'iharc_staff'
  | 'iharc_volunteer';

type MetadataWithRoles = {
  role?: string | null;
  roles?: string[] | null;
  claims?: {
    roles?: string[] | null;
  } | null;
};

type UserLike = {
  user_metadata?: unknown;
  app_metadata?: unknown;
} | null | undefined;

function extractRolesFromMetadata(metadata: MetadataWithRoles | null | undefined): string[] {
  if (!metadata) {
    return [];
  }

  const roles = new Set<string>();

  if (metadata.role) {
    roles.add(metadata.role);
  }

  if (Array.isArray(metadata.roles)) {
    metadata.roles.forEach((role) => {
      if (typeof role === 'string') {
        roles.add(role);
      }
    });
  }

  if (metadata.claims?.roles) {
    metadata.claims.roles.forEach((role) => {
      if (typeof role === 'string') {
        roles.add(role);
      }
    });
  }

  return Array.from(roles);
}

export function getIharcRoles(user: UserLike): IharcRole[] {
  if (!user) {
    return [];
  }

  // Only trust roles issued via app_metadata which Supabase signs server-side.
  const appMetadata = user.app_metadata as MetadataWithRoles | null | undefined;
  const roles = extractRolesFromMetadata(appMetadata);

  return roles.filter((role): role is IharcRole => role.startsWith(IHARC_ROLE_PREFIX));
}

export function hasIharcRole(user: UserLike, allowed: IharcRole | IharcRole[]): boolean {
  const roles = getIharcRoles(user);
  const allowedSet = Array.isArray(allowed) ? new Set(allowed) : new Set([allowed]);
  return roles.some((role) => allowedSet.has(role));
}
