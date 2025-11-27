'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Icon } from '@/components/ui/icon';
import { AlertCircle, Bell, CheckCircle2, Clock3 } from 'lucide-react';
import type { InboxItem } from '@/lib/inbox';

type InboxPanelProps = {
  items: InboxItem[];
};

export function InboxPanel({ items }: InboxPanelProps) {
  if (!items.length) return null;

  return (
    <aside className="sticky top-24 hidden h-[calc(100vh-6rem)] w-80 flex-shrink-0 lg:block">
      <Card className="h-full border-outline/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-space-xs text-title-sm">
            <Icon icon={Bell} size="sm" /> Inbox
          </CardTitle>
        </CardHeader>
        <CardContent className="h-full p-0">
          <ScrollArea className="h-full px-space-sm pb-space-md">
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
                    {item.badge ? <Badge variant="outline">{item.badge}</Badge> : null}
                  </div>
                  <TonePill tone={item.tone} />
                </li>
              ))}
            </ul>
          </ScrollArea>
        </CardContent>
      </Card>
    </aside>
  );
}

function TonePill({ tone }: { tone?: InboxItem['tone'] }) {
  if (!tone) return null;
  const icon = tone === 'success' ? CheckCircle2 : tone === 'warning' ? Clock3 : tone === 'critical' ? AlertCircle : Bell;
  const toneClass =
    tone === 'success'
      ? 'bg-emerald-50 text-emerald-800'
      : tone === 'warning'
        ? 'bg-amber-50 text-amber-800'
        : tone === 'critical'
          ? 'bg-rose-50 text-rose-800'
          : 'bg-primary/10 text-primary';
  return (
    <div className={`mt-space-xs inline-flex items-center gap-space-2xs rounded-full px-space-2xs py-px text-label-xs font-semibold ${toneClass}`}>
      <Icon icon={icon} size="sm" />
      {tone === 'success' ? 'On track' : tone === 'warning' ? 'Action soon' : tone === 'critical' ? 'Needs attention' : 'Update'}
    </div>
  );
}
