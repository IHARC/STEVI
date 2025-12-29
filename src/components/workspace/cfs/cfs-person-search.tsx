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
import { formatEnumLabel, type PersonType } from '@/lib/clients/directory';

export type PersonOption = {
  id: number;
  label: string;
  personType?: PersonType | null;
  personCategory?: string | null;
};

export type PersonSearchProps = {
  name: string;
  label: string;
  placeholder?: string;
  className?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  types?: PersonType[];
};

export function CfsPersonSearch({
  name,
  label,
  placeholder,
  className,
  helperText,
  required,
  disabled,
  types,
}: PersonSearchProps) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<PersonOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!disabled) return;
    setQuery('');
    setItems([]);
    setSelectedId('');
    setFetched(false);
  }, [disabled]);

  useEffect(() => {
    if (disabled) return;
    const controller = new AbortController();
    if (query.length < 2) {
      setItems([]);
      setFetched(false);
      return () => controller.abort();
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const typesParam = types?.length ? `&types=${encodeURIComponent(types.join(','))}` : '';
        const res = await fetch(`/api/people/search?q=${encodeURIComponent(query)}${typesParam}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const json = (await res.json()) as { items: PersonOption[] };
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
  }, [disabled, query, types]);

  const summary = useMemo(() => {
    const found = items.find((item) => String(item.id) === selectedId);
    if (found) return found.label;
    return selectedId ? `Person ${selectedId}` : 'Not selected';
  }, [items, selectedId]);

  const handleSelect = (item: PersonOption) => {
    setSelectedId(String(item.id));
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
            disabled={disabled}
          />
          <Button type="button" variant="ghost" size="sm" onClick={handleClear} disabled={disabled}>
            Clear
          </Button>
        </div>
        <CommandList className="max-h-56 overflow-auto">
          {loading ? <CommandItem disabled>Searching…</CommandItem> : null}
          {!loading && query.length < 2 ? <CommandItem disabled>Type at least 2 characters</CommandItem> : null}
          {!loading && query.length >= 2 ? <CommandEmpty>No matches.</CommandEmpty> : null}
          <CommandGroup heading="Results">
            {items.map((item) => (
              <CommandItem key={item.id} value={item.label} onSelect={() => handleSelect(item)}>
                <span className="flex-1 truncate text-foreground">{item.label}</span>
                {item.personType ? (
                  <span className="text-xs text-foreground/60">{formatEnumLabel(String(item.personType))}</span>
                ) : null}
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
