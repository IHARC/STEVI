'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { usePortalAccess } from '@/components/providers/portal-access-provider';
import { useOptionalWorkspaceContext } from '@/components/providers/workspace-provider';
import { resolveWorkspaceQuickActions, type WorkspaceQuickAction } from '@/lib/workspaces';
import { CalendarClock, FileText, MessageCircle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const QUICK_ACTION_ICONS: Record<string, typeof CalendarClock> = {
  calendar: CalendarClock,
  chat: MessageCircle,
  file: FileText,
};

function actionIcon(action: WorkspaceQuickAction) {
  if (!action.icon) return null;
  const IconComponent = QUICK_ACTION_ICONS[action.icon];
  if (!IconComponent) return null;
  return <IconComponent className="h-4 w-4" aria-hidden />;
}

export function QuickCreateButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const portalAccess = usePortalAccess();
  const workspace = useOptionalWorkspaceContext();

  const actions = useMemo(() => {
    if (!workspace) return [] as WorkspaceQuickAction[];
    return resolveWorkspaceQuickActions(portalAccess, workspace.activeWorkspace, {
      isPreview: workspace.isClientPreview,
    });
  }, [portalAccess, workspace]);

  const availableActions = actions.filter((action) => !action.disabled);

  if (!workspace || actions.length === 0) {
    return null;
  }

  function handleSelect(action: WorkspaceQuickAction) {
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
          className="gap-space-2xs rounded-full"
          disabled={availableActions.length === 0}
        >
          <Icon icon={Plus} size="sm" />
          <span className="text-label-md font-semibold">New</span>
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
            className="flex items-start gap-space-sm px-space-sm py-space-sm"
          >
            <span className={cn('mt-[2px] text-muted-foreground', action.disabled && 'opacity-60')}>
              {actionIcon(action)}
            </span>
            <span className="space-y-space-3xs">
              <span className="block text-body-md font-medium text-on-surface">{action.label}</span>
              {action.description ? (
                <span className="block text-body-sm text-muted-foreground">{action.description}</span>
              ) : null}
              {action.disabled ? (
                <span className="text-label-sm text-primary">Exit preview to use this action</span>
              ) : null}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
