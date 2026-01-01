import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess, type PortalAccess } from '@/lib/portal-access';
import { buildUserMenuLinks } from '@/lib/portal-ui-access';
import { AuthLinks } from '@shared/layout/auth-links';
import { UserMenu } from '@shared/layout/user-menu';
import { clearOAuthSessionCookies } from '@/lib/supabase/oauth';

export type UserNavigation = {
  desktop: ReactNode;
  mobile: ReactNode;
};

export async function getUserNavigation(accessOverride?: PortalAccess | null): Promise<UserNavigation> {
  let access = accessOverride;

  if (!access) {
    const supabase = await createSupabaseRSCClient();
    access = await loadPortalAccess(supabase);
  }

  if (!access) {
    return {
      desktop: <AuthLinks />,
      mobile: <AuthLinks layout="stacked" />,
    };
  }

  const { profile } = access;
  const displayName = profile.display_name || 'Client';
  const positionTitle = profile.position_title;
  const awaitingVerification = profile.affiliation_status === 'pending';
  const affiliationRevoked = profile.affiliation_status === 'revoked';
  const actingOrgChoices = access.actingOrgChoices ?? [];

  const menuItems = buildUserMenuLinks(access);

  const menu = (
    <UserMenu
      displayName={displayName}
      positionTitle={positionTitle ?? undefined}
      awaitingVerification={awaitingVerification}
      affiliationRevoked={affiliationRevoked}
      menuItems={menuItems}
      actingOrgChoices={actingOrgChoices}
      currentOrganizationId={access.organizationId ?? null}
      initials={getInitials(displayName)}
      signOutAction={signOut}
    />
  );

  return {
    desktop: menu,
    mobile: menu,
  };
}

export async function UserNav() {
  const navigation = await getUserNavigation();
  return navigation.desktop;
}

async function signOut() {
  'use server';

  const cookieStore = await cookies();
  clearOAuthSessionCookies(cookieStore);
  redirect('/auth/start');
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) {
    return 'CM';
  }

  const first = parts[0]?.[0];
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1];
  const initials = `${first ?? ''}${second ?? ''}`.toUpperCase();

  return initials || 'CM';
}
