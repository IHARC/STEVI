'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type SavedSearch = {
  id: string;
  label: string;
  params: string;
};

const STORAGE_KEY = 'stevi-admin-user-saved-searches';

type Props = {
  segment: string;
  currentParams: string;
};

export function UserSavedSearches({ segment, currentParams }: Props) {
  const router = useRouter();
  const [saved, setSaved] = useState<SavedSearch[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as SavedSearch[]) : [];
    } catch {
      return [];
    }
  });

  const presets: SavedSearch[] = useMemo(
    () => [
      { id: 'pending', label: 'Pending approvals', params: buildParams({ status: 'pending' }) },
      { id: 'org-admins', label: 'Org admins', params: buildParams({ role: 'portal_org_admin' }) },
      { id: 'no-org', label: 'No org linked', params: buildParams({ org: 'none' }) },
      { id: 'revoked', label: 'Revoked', params: buildParams({ status: 'revoked' }) },
    ],
    [],
  );

  const navigateWithParams = (params: string) => {
    const qs = params ? `?${params}` : '';
    router.push(`/admin/users/${segment}${qs}`);
  };

  const handleSaveCurrent = () => {
    const label = prompt('Name this saved search');
    if (!label) return;
    const id = `${Date.now()}`;
    const next = [{ id, label, params: currentParams }, ...saved].slice(0, 8);
    setSaved(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const handleDelete = (id: string) => {
    const next = saved.filter((entry) => entry.id !== id);
    setSaved(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-border/15 bg-muted px-3 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="secondary">Saved searches</Badge>
        <Button type="button" size="sm" variant="outline" onClick={handleSaveCurrent}>
          Save current filters
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <Button
            key={preset.id}
            size="sm"
            variant="ghost"
            className="border border-border/40"
            onClick={() => navigateWithParams(preset.params)}
          >
            {preset.label}
          </Button>
        ))}
        {saved.map((entry) => (
          <Button
            key={entry.id}
            size="sm"
            variant="outline"
            className="flex items-center gap-1"
            onClick={() => navigateWithParams(entry.params)}
          >
            <span>{entry.label}</span>
            <Badge
              variant="secondary"
              className="cursor-pointer"
              onClick={(event) => {
                event.stopPropagation();
                handleDelete(entry.id);
              }}
            >
              Remove
            </Badge>
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Applies filters client-side; data still constrained by RLS.</p>
    </div>
  );
}

function buildParams(overrides: Record<string, string>) {
  const params = new URLSearchParams();
  Object.entries(overrides).forEach(([key, value]) => {
    if (value === 'none') {
      params.set(key, '');
    } else {
      params.set(key, value);
    }
  });
  return params.toString();
}
