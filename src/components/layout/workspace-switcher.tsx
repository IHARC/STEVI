'use client';

import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Icon } from '@/components/ui/icon';
import type { WorkspaceId, WorkspaceOption } from '@/lib/workspaces';
import { cn } from '@/lib/utils';

type WorkspaceSwitcherProps = {
  options: WorkspaceOption[];
  activeWorkspace: WorkspaceId;
  isPreview?: boolean;
  className?: string;
};

export function WorkspaceSwitcher({
  options,
  activeWorkspace,
  isPreview = false,
  className,
}: WorkspaceSwitcherProps) {
  const router = useRouter();
  const activeOption = options.find((option) => option.id === activeWorkspace);

  function handleChange(value: string) {
    if (!value || value === activeWorkspace) return;
    const target = options.find((option) => option.id === value);
    if (!target) return;
    router.push(target.href);
  }

  return (
    <div className={cn('flex w-full items-center gap-space-xs', className)}>
      <div className="hidden w-full min-w-[320px] lg:flex">
        <ToggleGroup
          type="single"
          value={activeWorkspace}
          onValueChange={handleChange}
          size="sm"
          variant="default"
          className="flex w-full items-center gap-space-2xs rounded-[var(--md-sys-shape-corner-small)] bg-surface-container-low px-space-2xs py-space-2xs shadow-level-1"
          aria-label="Workspace selector"
        >
          {options.map((option) => (
            <ToggleGroupItem
              key={option.id}
              value={option.id}
              className={cn(
                'flex min-w-0 flex-1 items-center justify-between gap-space-xs rounded-[var(--md-sys-shape-corner-extra-small)] px-space-sm py-space-2xs text-label-md font-semibold text-on-surface-variant transition-colors data-[state=on]:bg-secondary-container data-[state=on]:text-on-secondary-container',
                isPreview && option.id === 'client' ? 'data-[state=on]:ring-1 data-[state=on]:ring-primary/60' : null,
              )}
              aria-label={option.label}
            >
              <span className="truncate">{option.label}</span>
              <span className="hidden truncate text-label-sm font-medium text-on-surface-variant/80 xl:inline">
                {option.roleLabel ?? option.statusLabel}
              </span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="flex w-full lg:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-10 min-w-[128px] justify-between rounded-[var(--md-sys-shape-corner-small)] px-space-sm"
              aria-label="Choose workspace"
            >
              <span className="truncate text-label-md font-semibold">
                {activeOption?.label ?? 'Workspace'}
              </span>
              <Icon icon={ChevronDown} size="sm" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[240px] rounded-[var(--md-sys-shape-corner-medium)]">
            <DropdownMenuLabel className="text-label-sm text-on-surface-variant">
              Switch workspace
            </DropdownMenuLabel>
            {options.map((option) => (
              <DropdownMenuItem
                key={option.id}
                onSelect={(event) => {
                  event.preventDefault();
                  handleChange(option.id);
                }}
                className="flex items-start gap-space-sm rounded-[var(--md-sys-shape-corner-small)] px-space-sm py-space-xs"
              >
                <div className="flex-1">
                  <p className="text-body-md font-medium text-on-surface">{option.label}</p>
                  <p className="text-label-sm text-on-surface-variant">
                    {option.roleLabel ?? option.statusLabel ?? 'Workspace'}
                  </p>
                </div>
                {activeWorkspace === option.id ? (
                  <span className="text-label-sm font-semibold text-primary">Active</span>
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isPreview && activeWorkspace === 'client' ? (
        <span className="hidden rounded-[var(--md-sys-shape-corner-extra-small)] bg-primary/12 px-space-sm py-space-3xs text-label-sm font-semibold text-primary lg:inline-flex">
          Preview
        </span>
      ) : null}
    </div>
  );
}
