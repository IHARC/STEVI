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
import { Badge } from '@shared/ui/badge';

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
            <Badge variant="outline" className="mt-1 border-primary/40 text-primary">
              Awaiting verification
            </Badge>
          ) : null}
          {affiliationRevoked ? (
            <Badge variant="destructive" className="mt-1">
              Verification declined
            </Badge>
          ) : null}
        </div>
        <DropdownMenuSeparator />
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
