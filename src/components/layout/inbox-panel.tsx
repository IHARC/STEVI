'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      <aside className="sticky top-24 hidden h-[calc(100vh-6rem)] w-80 flex-shrink-0 lg:block">
        <Card className="h-full border-outline/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-space-xs text-title-sm">
              <Icon icon={Bell} size="sm" /> Inbox
            </CardTitle>
          </CardHeader>
          <CardContent className="h-full p-0">
            <ScrollArea className="h-full px-space-sm pb-space-md">
              <InboxList items={visibleItems} onDismiss={handleDismiss} />
            </ScrollArea>
          </CardContent>
        </Card>
      </aside>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="fixed bottom-4 right-4 z-40 gap-space-2xs rounded-full shadow-level-3 lg:hidden"
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
        <li key={item.id} className="rounded-lg border border-outline/10 bg-surface-container-low p-space-sm">
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
