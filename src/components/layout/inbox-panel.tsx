'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Icon } from '@/components/ui/icon';
import { AlertCircle, Bell, CheckCircle2, Clock3, X } from 'lucide-react';
import type { InboxItem } from '@/lib/inbox';

type InboxPanelProps = {
  items: InboxItem[];
};

export function InboxPanel({ items }: InboxPanelProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);

  const visibleItems = useMemo(
    () => items.filter((item) => !dismissed.has(item.id)),
    [items, dismissed],
  );

  if (!items.length) return null;

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
        <div className="flex h-full flex-col gap-space-sm rounded-3xl border border-outline/10 bg-surface/92 p-space-md shadow-level-2 backdrop-blur-md">
          <div className="flex items-center justify-between gap-space-sm">
            <p className="flex items-center gap-space-2xs text-title-sm font-semibold text-on-surface">
              <Icon icon={Bell} size="sm" /> Inbox
            </p>
            <Badge variant="outline" className="rounded-full bg-primary/12 text-label-sm font-semibold text-primary">
              Live
            </Badge>
          </div>
          <p className="text-body-sm text-muted-foreground">
            Time-sensitive approvals, notifications, and expiring documents.
          </p>
          <ScrollArea className="flex-1 pr-space-2xs">
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
            className="fixed bottom-4 right-4 z-40 gap-space-2xs rounded-full border border-outline/20 shadow-level-3 backdrop-blur-md lg:hidden"
          >
            <Icon icon={Bell} size="sm" />
            Inbox
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full max-w-[420px]">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-space-xs">
              <Icon icon={Bell} size="sm" /> Inbox
            </SheetTitle>
            <p className="text-body-sm text-muted-foreground">
              Time-sensitive approvals, notifications, and expiring documents.
            </p>
          </SheetHeader>
          <div className="mt-space-sm max-h-[70vh] overflow-y-auto">
            <InboxList items={visibleItems} onDismiss={handleDismiss} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function InboxList({ items, onDismiss }: { items: InboxItem[]; onDismiss: (id: string) => void }) {
  return (
    <ul className="space-y-space-sm">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-2xl border border-outline/12 bg-surface-container-low/90 p-space-md shadow-level-1 transition state-layer-color-primary hover:border-primary/40 hover:shadow-level-2"
        >
          <div className="flex items-start justify-between gap-space-sm">
            <div className="space-y-space-2xs">
              <p className="text-body-md font-medium text-on-surface">
                <a href={item.href} className="underline-offset-4 hover:underline">
                  {item.title}
                </a>
              </p>
              {item.description ? (
                <p className="text-body-sm text-muted-foreground">{item.description}</p>
              ) : null}
              {item.meta ? (
                <p className="text-label-sm text-muted-foreground">
                  {Object.entries(item.meta)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(' · ')}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col items-end gap-space-2xs">
              {item.badge ? <Badge variant="outline">{item.badge}</Badge> : null}
              <button
                type="button"
                className="text-muted-foreground transition hover:text-on-surface"
                onClick={() => onDismiss(item.id)}
                aria-label="Dismiss item"
              >
                <Icon icon={X} size="sm" />
              </button>
            </div>
          </div>
          <TonePill tone={item.tone} />
        </li>
      ))}
    </ul>
  );
}

function TonePill({ tone }: { tone?: InboxItem['tone'] }) {
  if (!tone) return null;
  const icon = tone === 'success' ? CheckCircle2 : tone === 'warning' ? Clock3 : tone === 'critical' ? AlertCircle : Bell;
  const toneClass =
    tone === 'success'
      ? 'bg-secondary-container text-on-secondary-container'
      : tone === 'warning'
        ? 'bg-primary-container text-on-primary-container'
        : tone === 'critical'
          ? 'bg-error-container text-on-error-container'
          : 'bg-primary/10 text-primary';
  return (
    <div className={`mt-space-xs inline-flex items-center gap-space-2xs rounded-full px-space-2xs py-px text-label-xs font-semibold ${toneClass}`}>
      <Icon icon={icon} size="sm" />
      {tone === 'success' ? 'On track' : tone === 'warning' ? 'Action soon' : tone === 'critical' ? 'Needs attention' : 'Update'}
    </div>
  );
}
