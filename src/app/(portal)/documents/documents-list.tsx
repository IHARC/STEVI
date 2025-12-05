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
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr,200px]">
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
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/40 bg-card p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">No documents yet</p>
          <p className="mt-1">Ask your outreach worker to share files here. You can also request a link below.</p>
          <p className="mt-1 text-xs">When you request a link we’ll refresh it within one business day and log it in your audit trail.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((doc) => (
            <article key={doc.path} className="flex h-full flex-col justify-between rounded-2xl border border-border/30 bg-card p-4 shadow-sm">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-medium text-foreground">{doc.name}</h2>
                  {doc.category ? <Badge variant="secondary">{doc.category}</Badge> : null}
                </div>
                <p className="text-sm text-muted-foreground">
                  {doc.lastModified ? `Updated ${new Date(doc.lastModified).toLocaleDateString()}` : 'Updated recently'}
                </p>
                {doc.expiresAt ? (
                  <p className="text-xs text-primary">Expires {new Date(doc.expiresAt).toLocaleDateString()}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Link expires after 30 minutes once opened.</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Shared by {doc.sharedBy ?? 'team'}
                  {doc.lastViewedAt ? ` • Viewed ${new Date(doc.lastViewedAt).toLocaleDateString()}` : ''}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
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
                <p className="mt-1 text-xs text-destructive">{requestState.error}</p>
              ) : null}
              {extendState?.error ? (
                <p className="mt-1 text-xs text-destructive">{extendState.error}</p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
