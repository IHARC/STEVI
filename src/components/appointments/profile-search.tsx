'use client';

import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

  useEffect(() => {
    const controller = new AbortController();
    if (query.length < 2) {
      setItems([]);
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

  return (
    <div className={cn('space-y-space-2xs', className)}>
      <label className="text-label-sm font-semibold text-on-surface" htmlFor={`${name}-search`}>
        {label}
      </label>
      <div className="flex gap-space-xs">
        <Input
          id={`${name}-search`}
          placeholder={placeholder ?? 'Search by name'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setQuery('');
            setItems([]);
          }}
        >
          Clear
        </Button>
      </div>
      {helperText ? <p className="text-body-xs text-muted-foreground">{helperText}</p> : null}
      <input type="hidden" name={name} value={selectedId} required={required} />

      <Card className="border-outline/30">
        <CardContent className="space-y-space-2xs py-space-sm">
          {loading ? <p className="text-body-sm text-muted-foreground">Searching…</p> : null}
          {!loading && items.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">No matches.</p>
          ) : (
            items.map((item) => (
              <button
                type="button"
                key={item.id}
                className="flex w-full items-center justify-between rounded-md px-space-sm py-space-2xs text-left text-body-sm transition state-layer-color-primary hover:bg-surface-container-low"
                onClick={() => setSelectedId(item.id)}
              >
                <span className="text-on-surface">{item.label}</span>
                <span className="text-label-sm text-on-surface/60">{item.id.slice(0, 8)}</span>
              </button>
            ))
          )}
          <p className="text-body-xs text-muted-foreground">Selected: {summary}</p>
        </CardContent>
      </Card>
    </div>
  );
}
