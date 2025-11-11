'use client';

import * as React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const THEME_OPTIONS = [
  { key: 'light', label: 'Light', icon: Sun },
  { key: 'dark', label: 'Dark', icon: Moon },
  { key: 'system', label: 'System', icon: Monitor },
] as const;

export function ThemeToggle() {
  const { resolvedTheme, theme, setTheme } = useTheme();
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const selectedTheme = isMounted ? theme ?? 'system' : 'system';
  const visualTheme = isMounted
    ? selectedTheme === 'system'
      ? resolvedTheme ?? 'system'
      : selectedTheme
    : 'system';

  const ActiveIcon = React.useMemo(() => {
    switch (visualTheme) {
      case 'dark':
        return Moon;
      case 'light':
        return Sun;
      default:
        return Monitor;
    }
  }, [visualTheme]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-transparent text-on-surface hover:bg-surface-container focus-visible:ring-primary"
          aria-label="Toggle color theme"
        >
          <ActiveIcon className="h-5 w-5" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 rounded-[var(--md-sys-shape-corner-small)]">
        <DropdownMenuLabel className="text-label-sm uppercase tracking-[0.12em] text-on-surface-variant">
          Appearance
        </DropdownMenuLabel>
        {THEME_OPTIONS.map(({ key, label, icon: Icon }) => (
          <DropdownMenuItem
            key={key}
            onSelect={(event) => {
              event.preventDefault();
              setTheme(key);
            }}
            className="flex items-center gap-2 text-body-md"
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span className="flex-1 text-on-surface">{label}</span>
            {selectedTheme === key ? (
              <span className="text-label-sm font-semibold uppercase tracking-[0.12em] text-primary">On</span>
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
