'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import type { InboxItem } from '@/lib/inbox';
import { InboxPanel } from '@shared/layout/inbox-panel';
import { cn } from '@/lib/utils';
import { shouldShowOpsInbox } from '@/lib/ops-inbox';

export function OpsMainGrid({ children, inboxItems }: { children: ReactNode; inboxItems: InboxItem[] }) {
  const pathname = usePathname() ?? '';
  // Guardrail: only gate the inbox column using client pathname, never server header inference.
  const showInbox = shouldShowOpsInbox(pathname, inboxItems.length);

  return (
    <div
      className={cn(
        'grid w-full max-w-none gap-6',
        showInbox ? 'xl:grid-cols-[minmax(0,1fr)_22rem]' : 'grid-cols-1',
      )}
    >
      <section className="min-w-0 w-full">
        <div className="mx-0 w-full max-w-none space-y-6">{children}</div>
      </section>
      {showInbox ? <InboxPanel items={inboxItems} /> : null}
    </div>
  );
}
