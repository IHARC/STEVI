'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useFormState } from 'react-dom';
import type { ClientDocument } from '@/lib/documents';

type DocumentsListProps = {
  documents: ClientDocument[];
  onRequestLink: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  onExtendAccess: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
};

type ActionState = { success: boolean; message?: string; error?: string };

const emptyState: ActionState = { success: false };

export function DocumentsList({ documents, onRequestLink, onExtendAccess }: DocumentsListProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [requestState, requestAction] = useFormState(onRequestLink, emptyState);
  const [extendState, extendAction] = useFormState(onExtendAccess, emptyState);

  const categories = useMemo(() => {
    const set = new Set<string>();
    documents.forEach((doc) => {
      if (doc.category) set.add(doc.category);
    });
    return Array.from(set);
  }, [documents]);

  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      const matchesQuery = doc.name.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === 'all' || doc.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [documents, query, category]);

  return (
    <div className="space-y-space-md">
      <div className="grid gap-space-sm sm:grid-cols-[1fr,200px]">
        <Label className="sr-only" htmlFor="doc-search">Search documents</Label>
        <Input
          id="doc-search"
          placeholder="Search by title"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger aria-label="Filter by category">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {documents === null ? (
        <div className="space-y-space-sm">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-outline/30 bg-surface-container-low p-space-md text-body-sm text-muted-foreground">
          <p className="font-medium text-on-surface">No documents yet</p>
          <p className="mt-space-2xs">Ask your outreach worker to share files here. You can also request a link below.</p>
          <p className="mt-space-2xs text-label-sm">When you request a link we’ll refresh it within one business day and log it in your audit trail.</p>
        </div>
      ) : (
        <div className="grid gap-space-md md:grid-cols-2">
          {filtered.map((doc) => (
            <article key={doc.path} className="flex h-full flex-col justify-between rounded-xl border border-outline/20 bg-surface-container-low p-space-md shadow-level-1">
              <div className="space-y-space-xs">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-title-md font-medium text-on-surface">{doc.name}</h2>
                  {doc.category ? <Badge variant="secondary">{doc.category}</Badge> : null}
                </div>
                <p className="text-body-sm text-muted-foreground">
                  {doc.lastModified ? `Updated ${new Date(doc.lastModified).toLocaleDateString()}` : 'Updated recently'}
                </p>
                {doc.expiresAt ? (
                  <p className="text-label-sm text-amber-700">Expires {new Date(doc.expiresAt).toLocaleDateString()}</p>
                ) : (
                  <p className="text-label-sm text-muted-foreground">Link expires after 30 minutes once opened.</p>
                )}
                <p className="text-label-sm text-muted-foreground">
                  Shared by {doc.sharedBy ?? 'team'}
                  {doc.lastViewedAt ? ` • Viewed ${new Date(doc.lastViewedAt).toLocaleDateString()}` : ''}
                </p>
              </div>

              <div className="mt-space-md flex flex-wrap gap-space-sm">
                {doc.signedUrl ? (
                  <Button asChild className="flex-1 min-w-[140px]">
                    <a href={doc.signedUrl}>Download</a>
                  </Button>
                ) : (
                  <Button variant="outline" disabled className="flex-1 min-w-[140px]">
                    Download unavailable
                  </Button>
                )}

                <form action={requestAction} className="flex-1 min-w-[140px]">
                  <input type="hidden" name="path" value={doc.path} />
                  <input type="hidden" name="reason" value="Client requested new link" />
                  <Button type="submit" variant="outline" size="sm" className="w-full">
                    Request new link
                  </Button>
                </form>

                <form action={extendAction} className="flex min-w-[140px] flex-1">
                  <input type="hidden" name="path" value={doc.path} />
                  <input type="hidden" name="reason" value="Client requested longer access" />
                  <Button type="submit" variant="ghost" size="sm" className="w-full">
                    Extend access
                  </Button>
                </form>
              </div>

              {requestState?.error ? (
                <p className="mt-space-2xs text-label-sm text-destructive">{requestState.error}</p>
              ) : null}
              {extendState?.error ? (
                <p className="mt-space-2xs text-label-sm text-destructive">{extendState.error}</p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
