'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@shared/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@shared/ui/command';
import { cn } from '@/lib/utils';

export type ProfileOption = {
  id: string;
  label: string;
  organizationId: number | null;
};

export type ProfileSearchProps = {
  name: string;
  label: string;
  placeholder?: string;
  scope: 'client' | 'staff';
  defaultValue?: string;
  className?: string;
  helperText?: string;
  required?: boolean;
};

export function ProfileSearch({
  name,
  label,
  placeholder,
  scope,
  defaultValue,
  className,
  helperText,
  required,
}: ProfileSearchProps) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<ProfileOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(defaultValue ?? '');
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    setSelectedId(defaultValue ?? '');
  }, [defaultValue]);

  useEffect(() => {
    const controller = new AbortController();
    if (query.length < 2) {
      setItems([]);
      setFetched(false);
      return () => controller.abort();
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/appointments/search-profiles?q=${encodeURIComponent(query)}&scope=${scope}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const json = (await res.json()) as { items: ProfileOption[] };
        setItems(json.items ?? []);
        setFetched(true);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchData, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, scope]);

  const summary = useMemo(() => {
    const found = items.find((item) => item.id === selectedId);
    return found ? found.label : selectedId || 'Not selected';
  }, [items, selectedId]);

  const handleSelect = (item: ProfileOption) => {
    setSelectedId(item.id);
    setQuery(item.label);
  };

  const handleClear = () => {
    setQuery('');
    setItems([]);
    setSelectedId('');
    setFetched(false);
  };

  return (
    <div className={cn('space-y-1', className)}>
      <label className="text-xs font-semibold text-foreground" htmlFor={`${name}-search`}>
        {label}
      </label>
      <input type="hidden" name={name} value={selectedId} required={required} />
      <Command className="rounded-2xl border border-border/30">
        <div className="flex items-center gap-2 border-b border-border/20 px-3 py-2">
          <CommandInput
            id={`${name}-search`}
            placeholder={placeholder ?? 'Search by name'}
            value={query}
            onValueChange={setQuery}
            autoComplete="off"
            aria-label={label}
          />
          <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
            Clear
          </Button>
        </div>
        <CommandList className="max-h-56 overflow-auto">
          {loading ? <CommandItem disabled>Searching…</CommandItem> : null}
          {!loading && query.length < 2 ? (
            <CommandItem disabled>Type at least 2 characters</CommandItem>
          ) : null}
          {!loading && query.length >= 2 ? <CommandEmpty>No matches.</CommandEmpty> : null}
          <CommandGroup heading="Results">
            {items.map((item) => (
              <CommandItem key={item.id} value={item.label} onSelect={() => handleSelect(item)}>
                <span className="flex-1 truncate text-foreground">{item.label}</span>
                <span className="text-xs text-foreground/60">{item.id.slice(0, 8)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          {!loading && fetched && items.length === 0 && query.length >= 2 ? (
            <CommandItem disabled>No people found.</CommandItem>
          ) : null}
        </CommandList>
      </Command>
      {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
      <p className="text-xs text-muted-foreground">Selected: {summary}</p>
    </div>
  );
}
