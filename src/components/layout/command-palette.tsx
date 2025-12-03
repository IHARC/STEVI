'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { resolveAppIcon } from '@/lib/app-icons';
import type { CommandPaletteItem } from '@/lib/portal-access';
import { cn } from '@/lib/utils';
import { CornerDownLeft, Search } from 'lucide-react';

type CommandPaletteProps = {
  items: CommandPaletteItem[];
  compactTrigger?: boolean;
  className?: string;
};

export function CommandPalette({ items, compactTrigger = false, className }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      const isCmd = event.metaKey || event.ctrlKey;
      const activeElement = event.target as HTMLElement | null;
      const isTyping = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA' || activeElement?.isContentEditable;

      if (isCmd && key === 'k' && !isTyping) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;

    return items.filter((item) =>
      item.label.toLowerCase().includes(term) || item.group.toLowerCase().includes(term),
    );
  }, [items, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, CommandPaletteItem[]>();
    filtered.forEach((item) => {
      if (!map.has(item.group)) {
        map.set(item.group, []);
      }
      map.get(item.group)?.push(item);
    });

    return Array.from(map.entries());
  }, [filtered]);

  function navigateTo(item: CommandPaletteItem) {
    setOpen(false);
    setQuery('');
    router.push(item.href);
  }

  return (
    <>
      <Button
        type="button"
        variant={compactTrigger ? 'ghost' : 'outline'}
        size={compactTrigger ? 'icon' : 'sm'}
        className={cn('gap-space-xs', compactTrigger ? 'h-9 w-9' : 'hidden md:inline-flex', className)}
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
        disabled={items.length === 0}
      >
        <Icon icon={Search} size="sm" />
        {!compactTrigger ? (
          <>
            <span className="text-body-sm">Search</span>
            <span className="text-label-sm text-muted-foreground">⌘K</span>
          </>
        ) : null}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl gap-space-sm">
          <DialogHeader>
            <DialogTitle>Go anywhere</DialogTitle>
            <p className="text-body-sm text-muted-foreground">Type to jump to any page or tool.</p>
          </DialogHeader>

          <div className="flex items-center gap-space-xs">
            <Icon icon={Search} size="sm" className="text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search pages and tools…"
            />
          </div>

          <ScrollArea className="max-h-80 rounded-lg border border-outline/20">
            {grouped.length === 0 ? (
              <p className="px-space-md py-space-sm text-body-sm text-muted-foreground">No results.</p>
            ) : (
              <div className="divide-y divide-outline/10">
                {grouped.map(([group, items]) => (
                  <div key={group} className="py-space-xs">
                    <p className="px-space-md pb-space-2xs text-label-sm font-semibold uppercase text-muted-foreground">
                      {group}
                    </p>
                    <ul className="space-y-[2px] px-space-sm">
                      {items.map((item) => (
                        <li key={item.href}>
                          <button
                            type="button"
                            onClick={() => navigateTo(item)}
                            className="flex w-full items-center justify-between gap-space-sm rounded-lg px-space-sm py-space-2xs text-left text-body-md text-on-surface/90 transition state-layer-color-primary hover:state-layer-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                          >
                            <span className="flex items-center gap-space-sm">
                              {item.icon ? <Icon icon={resolveAppIcon(item.icon)} size="sm" /> : null}
                              {item.label}
                            </span>
                            <CornerDownLeft className="h-4 w-4 text-muted-foreground" aria-hidden />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
