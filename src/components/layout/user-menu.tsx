'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

type MenuItem = {
  href: string;
  label: string;
};

type UserMenuProps = {
  displayName: string;
  positionTitle?: string;
  awaitingVerification: boolean;
  affiliationRevoked: boolean;
  initials: string;
  menuItems: MenuItem[];
  signOutAction: () => Promise<void>;
};

export function UserMenu({
  displayName,
  positionTitle,
  awaitingVerification,
  affiliationRevoked,
  initials,
  menuItems,
  signOutAction,
}: UserMenuProps) {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-outline/30 bg-surface px-2 py-1 text-body-md font-medium text-on-surface/90 transition hover:bg-brand-soft hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          aria-label="Account menu"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-brand-soft text-body-md font-semibold uppercase text-brand">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline">{displayName}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-body-md">
          <p className="font-semibold text-on-surface">{displayName}</p>
          {positionTitle ? (
            <p className="text-label-sm text-on-surface/70">{positionTitle}</p>
          ) : null}
          {awaitingVerification ? (
            <p className="mt-1 rounded-full px-2 py-0.5 text-label-sm font-semibold text-primary state-layer-color-primary state-layer-hover">
              Awaiting verification
            </p>
          ) : null}
          {affiliationRevoked ? (
            <p className="mt-1 rounded-full px-2 py-0.5 text-label-sm font-semibold text-inverse-on-surface state-layer-color-inverse-surface state-layer-hover">
              Verification declined
            </p>
          ) : null}
        </div>
        <DropdownMenuSeparator />
        {menuItems.map((item) => (
          <DropdownMenuItem key={item.href} asChild>
            <Link href={item.href} className="flex w-full items-center justify-between text-body-md">
              {item.label}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending}
          onSelect={(event) => {
            event.preventDefault();
            startTransition(() => signOutAction());
          }}
        >
          {pending ? 'Signing out…' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
