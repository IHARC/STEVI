'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@shared/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@shared/ui/avatar';
import { Button } from '@shared/ui/button';
import { ActingOrgSwitcher } from '@shared/layout/acting-org-switcher';

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
  actingOrgChoices?: Array<{ id: number; name: string | null }>;
  currentOrganizationId?: number | null;
  signOutAction: () => Promise<void>;
};

export function UserMenu({
  displayName,
  positionTitle,
  awaitingVerification,
  affiliationRevoked,
  initials,
  menuItems,
  actingOrgChoices = [],
  currentOrganizationId = null,
  signOutAction,
}: UserMenuProps) {
  const [pending, startTransition] = useTransition();
  const showOrgSwitcher = actingOrgChoices.length > 1;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="inline-flex items-center gap-2 rounded-full border-border/40 bg-card px-2 py-1 text-sm font-medium text-foreground shadow-sm hover:bg-muted"
          aria-label="Account menu"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-sm font-semibold uppercase text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline">{displayName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-sm">
          <p className="font-semibold text-foreground">{displayName}</p>
          {positionTitle ? (
            <p className="text-xs text-foreground/70">{positionTitle}</p>
          ) : null}
          {awaitingVerification ? (
            <span className="mt-1 border-primary/40 text-primary">
              Awaiting verification
            </span>
          ) : null}
          {affiliationRevoked ? (
            <span className="mt-1">
              Verification declined
            </span>
          ) : null}
        </div>
        <DropdownMenuSeparator />
        {showOrgSwitcher ? (
          <>
            <div className="px-2 py-2">
              <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Switch organizations</p>
              <ActingOrgSwitcher
                choices={actingOrgChoices}
                currentOrganizationId={currentOrganizationId}
                variant="compact"
                ariaLabel="Switch organizations"
                className="mt-2 w-full"
                triggerClassName="w-full"
              />
            </div>
            <DropdownMenuSeparator />
          </>
        ) : null}
        {menuItems.map((item) => (
          <DropdownMenuItem key={item.href} asChild>
            <Link href={item.href} className="flex w-full items-center justify-between text-sm">
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
