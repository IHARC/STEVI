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
        <button
          type="button"
          className={cn(
            'group inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-body-md font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
            isActive || open
              ? 'bg-brand-soft text-brand'
              : 'text-on-surface/80 hover:bg-brand-soft hover:text-brand'
          )}
          aria-label={`${label} menu`}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span>{label}</span>
          <ChevronDown
            className={cn('h-4 w-4 transition-transform', open ? 'rotate-180' : undefined)}
            aria-hidden
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-80 rounded-3xl border border-outline/15 bg-surface-container-highest p-2 text-on-surface shadow-lg"
      >
        <nav aria-label={label} className="flex flex-col gap-1">
          {items.map((item) => {
            const itemActive = pathname.startsWith(item.href);

            return (
              <DropdownMenuItem
                key={item.href}
                asChild
                className={cn(
                  'group rounded-2xl px-3 py-2.5 outline-none transition focus:bg-primary/10 focus:text-on-surface',
                  itemActive ? 'bg-primary/15 text-primary' : 'hover:bg-surface-container-high'
                )}
              >
                <Link href={item.href} aria-current={itemActive ? 'page' : undefined} className="flex flex-col">
                  <span className="text-body-md font-semibold">{item.label}</span>
                  {item.description ? (
                    <span className="text-label-sm text-on-surface/70">{item.description}</span>
                  ) : null}
                </Link>
              </DropdownMenuItem>
            );
          })}
        </nav>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
