'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { trackEvent } from '@/lib/analytics';
import type { WorkspaceId, WorkspaceOption } from '@/lib/workspaces';
import { Check, ChevronDown, Eye, SwitchCamera } from 'lucide-react';

type WorkspaceSwitcherProps = {
  activeWorkspace: WorkspaceId;
  options: WorkspaceOption[];
  defaultPath: string;
  previewExitPath: string;
  isClientPreview: boolean;
};

export function WorkspaceSwitcher({
  activeWorkspace,
  options,
  defaultPath,
  previewExitPath,
  isClientPreview,
}: WorkspaceSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const current = useMemo(
    () => options.find((option) => option.id === activeWorkspace) ?? options[0],
    [activeWorkspace, options],
  );

  const hasMultiple = options.length > 1;

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      const isModifier = event.metaKey || event.ctrlKey;
      if (!hasMultiple) return;

      if (isModifier && event.shiftKey && key === 'w') {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [hasMultiple]);

  function navigateTo(option: WorkspaceOption) {
    if (option.href === current?.href) {
      setOpen(false);
      return;
    }

    trackEvent('workspace_switch', {
      from: activeWorkspace,
      to: option.id,
      source: 'switcher',
    });

    setOpen(false);
    router.push(option.href);
  }

  function exitPreview() {
    trackEvent('workspace_switch_exit_preview', {
      from: 'client',
      to: activeWorkspace,
      source: 'banner',
    });
    setOpen(false);
    router.push(previewExitPath || defaultPath);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={!current}
          className="inline-flex items-center gap-space-xs rounded-full bg-surface-container-high text-body-sm font-medium text-on-surface state-layer-color-primary"
        >
          <span className="rounded-full bg-primary/10 px-space-xs py-[2px] text-label-sm text-primary">
            {current?.label ?? 'Workspace'}
          </span>
          {isClientPreview ? (
            <span className="flex items-center gap-1 text-label-sm text-amber-600">
              <Icon icon={Eye} size="sm" />
              Preview
            </span>
          ) : null}
          <Icon icon={ChevronDown} size="sm" className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[280px]">
        <DropdownMenuLabel className="text-label-sm uppercase text-muted-foreground">
          Workspaces
          <span className="ml-space-xs text-label-sm text-muted-foreground/80">⇧ + ⌘/Ctrl + W</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {options.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onSelect={(event) => {
              event.preventDefault();
              navigateTo(option);
            }}
            className="flex items-start justify-between gap-space-sm px-space-sm py-space-sm text-body-sm"
          >
            <span className="space-y-space-3xs">
              <span className="block text-body-md font-medium text-on-surface">{option.label}</span>
              {option.description ? (
                <span className="block text-body-sm text-muted-foreground">{option.description}</span>
              ) : null}
            </span>
            {option.id === current?.id ? <Icon icon={Check} size="sm" className="text-primary" /> : null}
          </DropdownMenuItem>
        ))}

        {isClientPreview ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                exitPreview();
              }}
              className="flex items-center gap-space-sm px-space-sm py-space-sm text-body-sm font-medium text-primary"
            >
              <Icon icon={SwitchCamera} size="sm" />
              Exit client preview
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
