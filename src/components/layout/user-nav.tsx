import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { buildUserMenuLinks, loadPortalAccess, type PortalAccess } from '@/lib/portal-access';
import { AuthLinks } from '@/components/layout/auth-links';
import { UserMenu } from '@/components/layout/user-menu';

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
  const displayName = profile.display_name || 'Community member';
  const positionTitle = profile.position_title;
  const awaitingVerification = profile.affiliation_status === 'pending';
  const affiliationRevoked = profile.affiliation_status === 'revoked';

  const menuItems = buildUserMenuLinks(access);

  const menu = (
    <UserMenu
      displayName={displayName}
      positionTitle={positionTitle ?? undefined}
      awaitingVerification={awaitingVerification}
      affiliationRevoked={affiliationRevoked}
      menuItems={menuItems}
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

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/');
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
