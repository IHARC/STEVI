'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@shared/ui/command';
import { Button } from '@shared/ui/button';
import { resolveAppIcon } from '@/lib/app-icons';
import type { CommandPaletteItem } from '@/lib/portal-ui-access';
import { cn } from '@/lib/utils';
import { CornerDownLeft, Search } from 'lucide-react';

type CommandPaletteProps = {
  items: CommandPaletteItem[];
  compactTrigger?: boolean;
  className?: string;
};

export function CommandPalette({ items, compactTrigger = false, className }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      const isCmd = event.metaKey || event.ctrlKey;
      const activeElement = event.target as HTMLElement | null;
      const isTyping =
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.isContentEditable;

      if (isCmd && key === 'k' && !isTyping) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, CommandPaletteItem[]>();
    items.forEach((item) => {
      if (!map.has(item.group)) {
        map.set(item.group, []);
      }
      map.get(item.group)?.push(item);
    });

    return Array.from(map.entries());
  }, [items]);

  function navigateTo(item: CommandPaletteItem) {
    setOpen(false);
    router.push(item.href);
  }

  return (
    <>
      <Button
        type="button"
        variant={compactTrigger ? 'ghost' : 'outline'}
        size={compactTrigger ? 'icon' : 'sm'}
        className={cn('gap-2', compactTrigger ? 'h-9 w-9' : 'hidden md:inline-flex', className)}
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
        disabled={items.length === 0}
      >
        <Search className="h-4 w-4" aria-hidden />
        {!compactTrigger ? (
          <>
            <span className="text-sm">Search</span>
            <span className="text-xs text-muted-foreground">⌘K</span>
          </>
        ) : null}
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search pages and tools..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {grouped.map(([group, entries], index) => (
            <CommandGroup key={group} heading={group}>
              {entries.map((item) => {
                const ItemIcon = item.icon ? resolveAppIcon(item.icon) : null;
                return (
                  <CommandItem
                    key={item.href}
                    value={`${item.label} ${group}`}
                    onSelect={() => navigateTo(item)}
                  >
                    {ItemIcon ? <ItemIcon className="mr-2 h-4 w-4" aria-hidden /> : null}
                    <span className="flex-1 truncate">{item.label}</span>
                    <CornerDownLeft className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </CommandItem>
                );
              })}
              {index < grouped.length - 1 ? <CommandSeparator /> : null}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
