'use client';

import { useMemo, useState, useActionState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@shared/ui/button';
import { Form } from '@shared/ui/form';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import { Skeleton } from '@shared/ui/skeleton';
import type { ClientDocument } from '@/lib/documents';
import type { ActionState } from '@/lib/server-actions/validate';

type DocumentsListProps = {
  documents: ClientDocument[];
  onRequestLink: (prevState: DocumentActionState, formData: FormData) => Promise<DocumentActionState>;
  onExtendAccess: (prevState: DocumentActionState, formData: FormData) => Promise<DocumentActionState>;
};

type DocumentActionData = { message: string };
type DocumentActionState = ActionState<DocumentActionData>;

const emptyState: DocumentActionState = { status: 'idle' };

export function DocumentsList({ documents, onRequestLink, onExtendAccess }: DocumentsListProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [requestState, requestAction] = useActionState(onRequestLink, emptyState);
  const [extendState, extendAction] = useActionState(onExtendAccess, emptyState);
  const requestError = 'ok' in requestState && !requestState.ok ? requestState.error : null;
  const extendError = 'ok' in extendState && !extendState.ok ? extendState.error : null;

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
                  {doc.category ? <span>{doc.category}</span> : null}
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

                <DocumentActionForm
                  action={requestAction}
                  path={doc.path}
                  reason="Client requested new link"
                  label="Request new link"
                  variant="outline"
                />

                <DocumentActionForm
                  action={extendAction}
                  path={doc.path}
                  reason="Client requested longer access"
                  label="Extend access"
                  variant="ghost"
                />
              </div>

              {requestError ? <p className="mt-1 text-xs text-destructive">{requestError}</p> : null}
              {extendError ? <p className="mt-1 text-xs text-destructive">{extendError}</p> : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

type DocumentActionFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  path: string;
  reason: string;
  label: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive' | 'link' | null;
};

function DocumentActionForm({ action, path, reason, label, variant = 'outline' }: DocumentActionFormProps) {
  const form = useForm<{ path: string; reason: string }>({
    defaultValues: {
      path,
      reason,
    },
  });

  return (
    <Form {...form}>
      <form action={action} className="flex-1 min-w-[140px]">
        <input type="hidden" {...form.register('path')} value={path} />
        <input type="hidden" {...form.register('reason')} value={reason} />
        <Button type="submit" variant={variant ?? 'outline'} size="sm" className="w-full">
          {label}
        </Button>
      </form>
    </Form>
  );
}
