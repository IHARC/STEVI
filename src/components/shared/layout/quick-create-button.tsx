'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@shared/ui/dropdown-menu';
import { Button } from '@shared/ui/button';
import { usePortalAccess } from '@shared/providers/portal-access-provider';
import { useOptionalPortalLayout } from '@shared/providers/portal-layout-provider';
import { resolveQuickActions, type QuickAction } from '@/lib/portal-navigation';
import { CalendarClock, FileText, MessageCircle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const QUICK_ACTION_ICONS: Record<string, typeof CalendarClock> = {
  calendar: CalendarClock,
  chat: MessageCircle,
  file: FileText,
};

function actionIcon(action: QuickAction) {
  if (!action.icon) return null;
  const IconComponent = QUICK_ACTION_ICONS[action.icon];
  if (!IconComponent) return null;
  return <IconComponent className="h-4 w-4" aria-hidden />;
}

export function QuickCreateButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const portalAccess = usePortalAccess();
  const layout = useOptionalPortalLayout();

  const actions = useMemo(() => {
    if (!layout) return [] as QuickAction[];
    return resolveQuickActions(portalAccess, layout.activeArea, { isPreview: layout.isClientPreview });
  }, [portalAccess, layout]);

  const availableActions = actions.filter((action) => !action.disabled);

  if (!layout || actions.length === 0) {
    return null;
  }

  function handleSelect(action: QuickAction) {
    if (action.disabled) return;
    setOpen(false);
    router.push(action.href);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          className="gap-2"
          disabled={availableActions.length === 0}
        >
          <Plus className="h-4 w-4" aria-hidden />
          <span className="text-sm font-semibold">New</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[280px]">
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.id}
            onSelect={(event) => {
              event.preventDefault();
              handleSelect(action);
            }}
            disabled={action.disabled}
            className="flex items-start gap-3 px-3 py-3"
          >
            <span className={cn('mt-[2px] text-muted-foreground', action.disabled && 'opacity-60')}>
              {actionIcon(action)}
            </span>
            <span className="space-y-0.5">
              <span className="block text-sm font-medium text-foreground">{action.label}</span>
              {action.description ? (
                <span className="block text-sm text-muted-foreground">{action.description}</span>
              ) : null}
              {action.disabled ? (
                <span className="text-xs text-primary">
                  {action.disabledReason ?? 'Action unavailable in this mode'}
                </span>
              ) : null}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
