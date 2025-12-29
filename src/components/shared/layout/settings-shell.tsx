'use client';

import { useState, type ReactNode } from 'react';
import { SettingsNav, type SettingsNavGroup } from '@shared/layout/settings-nav';
import { Button } from '@shared/ui/button';
import { ScrollArea } from '@shared/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@shared/ui/sheet';
import { Menu } from 'lucide-react';

type SettingsShellProps = {
  nav?: SettingsNavGroup[];
  showNav?: boolean;
  children: ReactNode;
};

export function SettingsShell({ nav = [], showNav = true, children }: SettingsShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const hasNav = showNav && nav.length > 0;

  if (!hasNav) {
    return <div className="w-full space-y-6">{children}</div>;
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-end lg:hidden">
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="gap-2">
              <Menu className="h-4 w-4" aria-hidden />
              <span className="text-sm font-semibold">Sections</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(340px,88vw)] px-0 py-0">
            <SheetHeader className="px-5 pt-5 pb-2 text-left">
              <SheetTitle className="text-base font-semibold">Sections</SheetTitle>
              <p className="text-sm text-muted-foreground">Browse settings and tools.</p>
            </SheetHeader>
            <ScrollArea scrollbar={false} className="h-full">
              <div className="px-4 pb-6">
                <div className="rounded-2xl border border-border/50 bg-card/70 p-3 shadow-sm">
                  <SettingsNav nav={nav} onNavigate={() => setMobileNavOpen(false)} />
                </div>
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid w-full gap-6 lg:grid-cols-[14rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-20 rounded-2xl border border-border/60 bg-muted/10 p-3">
            <SettingsNav nav={nav} />
          </div>
        </aside>
        <div className="min-w-0 w-full space-y-6">{children}</div>
      </div>
    </div>
  );
}
