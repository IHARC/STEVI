'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { NavPill } from '@/components/ui/nav-pill';
import { Icon } from '@/components/ui/icon';

export type TopNavDropdownItem = {
  href: string;
  label: string;
  description?: string;
};

type TopNavDropdownProps = {
  label: string;
  items: TopNavDropdownItem[];
};

export function TopNavDropdown({ label, items }: TopNavDropdownProps) {
  const pathname = usePathname();
  const activeItem = items.find((item) => pathname.startsWith(item.href));
  const isActive = Boolean(activeItem);
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <NavPill
          type="button"
          tone="brand"
          size="lg"
          active={isActive || open}
          className="group gap-1.5"
          aria-label={`${label} menu`}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span>{label}</span>
          <Icon
            icon={ChevronDown}
            size="sm"
            className={cn('transition-transform motion-duration-short motion-ease-standard', open ? 'rotate-180' : undefined)}
            aria-hidden
          />
        </NavPill>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-80 rounded-3xl border border-outline/15 bg-surface-container-highest p-2 text-on-surface shadow-lg"
      >
        <nav aria-label={label} className="flex flex-col gap-1">
          {items.map((item) => {
            const itemActive = pathname.startsWith(item.href);

            return (
              <DropdownMenuItem key={item.href} asChild className="p-0">
                <NavPill
                  asChild
                  tone="brand"
                  size="lg"
                  active={itemActive}
                  className="w-full flex-col items-start gap-0 rounded-2xl px-3 py-2.5 text-left"
                >
                  <Link href={item.href} aria-current={itemActive ? 'page' : undefined} className="flex flex-col">
                    <span className="text-body-md font-semibold">{item.label}</span>
                    {item.description ? (
                      <span className="text-label-sm text-on-surface/70">{item.description}</span>
                    ) : null}
                  </Link>
                </NavPill>
              </DropdownMenuItem>
            );
          })}
        </nav>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
