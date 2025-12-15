'use client';

import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Panel } from '@shared/ui/panel';
import { ScrollArea } from '@shared/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@shared/ui/sheet';
import { AlertCircle, Bell, CheckCircle2, Clock3, X } from 'lucide-react';
import type { InboxItem } from '@/lib/inbox';
import { cn } from '@/lib/utils';
import { cleanPathname, shouldShowOpsInbox } from '@/lib/ops-inbox';

type InboxPanelProps = {
  items: InboxItem[];
};

export function InboxPanel({ items }: InboxPanelProps) {
  const pathname = usePathname() ?? '';
  const cleanedPath = cleanPathname(pathname);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);

  const visibleItems = useMemo(
    () => items.filter((item) => !dismissed.has(item.id)),
    [items, dismissed],
  );

  if (!shouldShowOpsInbox(cleanedPath, items.length)) return null;

  function handleDismiss(id: string) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  if (visibleItems.length === 0) return null;

  return (
    <>
      <aside className="sticky top-28 hidden h-[calc(100vh-9rem)] w-full max-w-[24rem] flex-shrink-0 lg:block">
        <div className="flex h-full flex-col gap-3 rounded-3xl border border-border/20 bg-background/92 p-4 shadow-md backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-1 text-base font-semibold text-foreground">
              <Bell className="h-4 w-4" aria-hidden /> Inbox
            </p>
            <Badge variant="outline" className="rounded-full bg-primary/12 text-xs font-semibold text-primary">
              Live
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Time-sensitive approvals, notifications, and expiring documents.
          </p>
          <ScrollArea className="flex-1 pr-1">
            <InboxList items={visibleItems} onDismiss={handleDismiss} />
          </ScrollArea>
        </div>
      </aside>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="fixed bottom-4 right-4 z-40 gap-2 rounded-full border border-border/40 shadow-lg backdrop-blur lg:hidden"
          >
            <Bell className="h-4 w-4" aria-hidden />
            Inbox
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full max-w-[420px]">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4" aria-hidden /> Inbox
            </SheetTitle>
            <p className="text-sm text-muted-foreground">
              Time-sensitive approvals, notifications, and expiring documents.
            </p>
          </SheetHeader>
          <div className="mt-3 max-h-[70vh] overflow-y-auto">
            <InboxList items={visibleItems} onDismiss={handleDismiss} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function InboxList({ items, onDismiss }: { items: InboxItem[]; onDismiss: (id: string) => void }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <Panel key={item.id} asChild interactive>
          <li>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  <a href={item.href} className="underline-offset-4 hover:underline">
                    {item.title}
                  </a>
                </p>
                {item.description ? (
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                ) : null}
                {item.meta ? (
                  <p className="text-xs text-muted-foreground">
                    {Object.entries(item.meta)
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(' · ')}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col items-end gap-1">
                {item.badge ? <Badge variant="outline">{item.badge}</Badge> : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => onDismiss(item.id)}
                  aria-label="Dismiss item"
                >
                  <X className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </div>
            <TonePill tone={item.tone} />
          </li>
        </Panel>
      ))}
    </ul>
  );
}

function TonePill({ tone }: { tone?: InboxItem['tone'] }) {
  if (!tone) return null;
  const IconComponent = tone === 'success' ? CheckCircle2 : tone === 'warning' ? Clock3 : tone === 'critical' ? AlertCircle : Bell;
  const toneClass =
    tone === 'success'
      ? 'bg-success/10 text-success'
      : tone === 'warning'
        ? 'bg-warning/10 text-warning'
        : tone === 'critical'
          ? 'bg-destructive/10 text-destructive'
          : 'bg-info/10 text-info';
  return (
      <div
        className={cn(
        'mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-2xs font-semibold',
        toneClass,
      )}
      >
      <IconComponent className="h-3.5 w-3.5" aria-hidden />
      {tone === 'success'
        ? 'On track'
        : tone === 'warning'
          ? 'Action soon'
          : tone === 'critical'
            ? 'Needs attention'
            : 'Update'}
    </div>
  );
}
