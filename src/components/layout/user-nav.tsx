import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensurePortalProfile } from '@/lib/profile';
import { AuthLinks } from '@/components/layout/auth-links';
import { UserMenu } from '@/components/layout/user-menu';

type UserNavigation = {
  desktop: ReactNode;
  mobile: ReactNode;
};

export async function getUserNavigation(): Promise<UserNavigation> {
  const supabase = await createSupabaseRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      desktop: <AuthLinks />,
      mobile: <AuthLinks layout="stacked" />,
    };
  }

  const profile = await ensurePortalProfile(supabase, user.id);
  const role = profile.role;
  const displayName = profile.display_name || 'Community member';
  const positionTitle = profile.position_title;
  const awaitingVerification = profile.affiliation_status === 'pending';
  const affiliationRevoked = profile.affiliation_status === 'revoked';
  const showAdminTools = role === 'moderator' || role === 'admin';

  const menuItems: Array<{ href: string; label: string }> = [
    { href: '/home', label: 'Home' },
    { href: '/appointments', label: 'Appointments' },
    { href: '/documents', label: 'Documents' },
    { href: '/profile', label: 'Profile' },
    { href: '/support', label: 'Support' },
    ...(showAdminTools ? [{ href: '/admin', label: 'Admin tools' }] : []),
  ];

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
