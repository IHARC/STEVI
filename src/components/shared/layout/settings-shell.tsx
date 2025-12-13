import type { ReactNode } from 'react';
import { SettingsNav, SettingsNavSelect, type SettingsNavGroup } from '@shared/layout/settings-nav';

export function SettingsShell({ nav, children }: { nav: SettingsNavGroup[]; children: ReactNode }) {
  return (
    <div className="mx-0 grid w-full max-w-none gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <div className="rounded-2xl border border-border/60 bg-muted/10 p-3">
          <SettingsNav nav={nav} />
        </div>
      </aside>
      <div className="min-w-0 space-y-6">
        <div className="lg:hidden">
          <SettingsNavSelect nav={nav} />
        </div>
        {children}
      </div>
    </div>
  );
}
