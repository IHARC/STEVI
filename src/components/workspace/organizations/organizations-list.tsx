'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@shared/ui/button';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@shared/ui/table';
import { ListPaginationControls, type ListPageSize } from '@shared/list/pagination-controls';
import { SortableTableHead, type ListSortOrder } from '@shared/list/sortable-table-head';
import { EmptyState } from '@shared/ui/empty-state';
import { cn } from '@/lib/utils';
import type { Database } from '@/types/supabase';

type OrganizationRow = Pick<
  Database['core']['Tables']['organizations']['Row'],
  | 'id'
  | 'name'
  | 'website'
  | 'organization_type'
  | 'partnership_type'
  | 'status'
  | 'is_active'
  | 'services_tags'
  | 'updated_at'
>;

type SortKey = 'name' | 'organization_type' | 'partnership_type' | 'updated_at' | 'status';
type StatusFilter = 'all' | 'active' | 'inactive' | 'pending' | 'under_review';

type Query = {
  q: string;
  status: StatusFilter;
  page: number;
  pageSize: ListPageSize;
  sortBy: SortKey;
  sortOrder: ListSortOrder;
};

function buildUrl(pathname: string, base: URLSearchParams, next: Record<string, string | number | null | undefined>) {
  const params = new URLSearchParams(base.toString());
  for (const [key, value] of Object.entries(next)) {
    if (value === null || value === undefined) {
      params.delete(key);
      continue;
    }
    const asString = String(value);
    if (!asString) {
      params.delete(key);
      continue;
    }
    params.set(key, asString);
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

const dateFormatter = new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short' });

function formatDate(value: string | null) {
  if (!value) return 'Never';
  try {
    return dateFormatter.format(new Date(value));
  } catch {
    return value;
  }
}

function ServiceTags({ services }: { services: unknown }) {
  const list = Array.isArray(services) ? services : [];
  if (!list.length) return <span className="text-muted-foreground">—</span>;

  return (
    <div className="flex flex-wrap gap-2">
      {list.map((item, idx) => (
        <span key={`${item}-${idx}`} className="text-xs capitalize">
          {String(item).replaceAll('_', ' ')}
        </span>
      ))}
    </div>
  );
}

export function OrganizationsList({
  organizations,
  totalCount,
  query,
  canOpenOrganizations,
  createAction,
}: {
  organizations: OrganizationRow[];
  totalCount: number;
  query: Query;
  canOpenOrganizations: boolean;
  createAction?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const baseParams = useMemo(() => new URLSearchParams(searchParams?.toString()), [searchParams]);

  const [q, setQ] = useState(query.q);
  const [status, setStatus] = useState<StatusFilter>(query.status);

  const page = query.page;
  const pageSize = query.pageSize;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const showingStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingEnd = totalCount === 0 ? 0 : Math.min(totalCount, page * pageSize);

  const apply = (next: Partial<Query>) => {
    const merged: Query = {
      q: next.q ?? q,
      status: next.status ?? status,
      page: next.page ?? 1,
      pageSize: next.pageSize ?? pageSize,
      sortBy: next.sortBy ?? query.sortBy,
      sortOrder: next.sortOrder ?? query.sortOrder,
    };

    router.replace(
      buildUrl(pathname, baseParams, {
        q: merged.q || null,
        status: merged.status === 'all' ? null : merged.status,
        page: merged.page,
        pageSize: merged.pageSize,
        sortBy: merged.sortBy,
        sortOrder: merged.sortOrder,
      }),
    );
  };

  const clearFilters = () => {
    setQ('');
    setStatus('all');
    apply({ q: '', status: 'all', page: 1 });
  };

  const applySort = (nextSortBy: SortKey, defaultOrder: ListSortOrder) => {
    const nextOrder = query.sortBy === nextSortBy ? (query.sortOrder === 'ASC' ? 'DESC' : 'ASC') : defaultOrder;
    apply({ sortBy: nextSortBy, sortOrder: nextOrder, page: 1 });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 rounded-2xl border border-border/15 bg-background p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-[260px] flex-1 items-center gap-2">
            <Label htmlFor="organizations-search" className="sr-only">Search organizations</Label>
            <Input
              id="organizations-search"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') apply({ q, page: 1 });
              }}
              placeholder="Search organizations"
              className="h-8"
            />
            <Button variant="secondary" size="sm" className="h-8" onClick={() => apply({ q, page: 1 })}>
              Apply
            </Button>
          </div>

          <div className="min-w-[180px]">
            <Label htmlFor="organizations-status" className="sr-only">Status</Label>
            <Select
              value={status}
              onValueChange={(value) => {
                const next = (value as StatusFilter) ?? 'all';
                setStatus(next);
                apply({ status: next, page: 1 });
              }}
            >
              <SelectTrigger id="organizations-status" className="h-8 px-2 py-1 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="under_review">Under review</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {createAction ? <div className="hidden sm:block">{createAction}</div> : null}
            <Button variant="ghost" size="sm" className="h-8" onClick={clearFilters}>
              Clear
            </Button>
          </div>
        </div>

        <div className="border-t border-border/10 pt-2">
          <ListPaginationControls
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            pageSizeId="organizations-page-size-top"
            totalCount={totalCount}
            showingStart={showingStart}
            showingEnd={showingEnd}
            onPageSizeChange={(size) => apply({ pageSize: size, page: 1 })}
            onPrev={() => apply({ page: Math.max(1, page - 1) })}
            onNext={() => apply({ page: Math.min(totalPages, page + 1) })}
          />
        </div>
      </div>

      {organizations.length === 0 ? (
        <EmptyState
          title="No organizations found"
          description="Try adjusting your search, filters, or page size."
          action={createAction ? <div className="sm:hidden">{createAction}</div> : undefined}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border/15 bg-background shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead
                  label="Organization"
                  active={query.sortBy === 'name'}
                  order={query.sortBy === 'name' ? query.sortOrder : undefined}
                  onClick={() => applySort('name', 'ASC')}
                />
                <SortableTableHead
                  label="Type"
                  active={query.sortBy === 'organization_type'}
                  order={query.sortBy === 'organization_type' ? query.sortOrder : undefined}
                  onClick={() => applySort('organization_type', 'ASC')}
                  className="hidden lg:table-cell"
                />
                <SortableTableHead
                  label="Partnership"
                  active={query.sortBy === 'partnership_type'}
                  order={query.sortBy === 'partnership_type' ? query.sortOrder : undefined}
                  onClick={() => applySort('partnership_type', 'ASC')}
                  className="hidden xl:table-cell"
                />
                <TableHead className="hidden xl:table-cell">Services</TableHead>
                <SortableTableHead
                  label="Updated"
                  active={query.sortBy === 'updated_at'}
                  order={query.sortBy === 'updated_at' ? query.sortOrder : undefined}
                  onClick={() => applySort('updated_at', 'DESC')}
                  className="hidden md:table-cell"
                />
                <TableHead className="hidden lg:table-cell">Website</TableHead>
                <SortableTableHead
                  label="Status"
                  active={query.sortBy === 'status'}
                  order={query.sortBy === 'status' ? query.sortOrder : undefined}
                  onClick={() => applySort('status', 'ASC')}
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((org) => (
                <TableRow key={org.id} className={cn(org.is_active === false && 'opacity-60')}>
                  <TableCell className="min-w-[240px] font-medium">
                    {canOpenOrganizations ? (
                      <Link href={`/ops/organizations/${org.id}`} className="text-foreground underline-offset-4 hover:underline">
                        {org.name}
                      </Link>
                    ) : (
                      org.name
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell capitalize text-muted-foreground">
                    {org.organization_type?.replaceAll('_', ' ') ?? 'Not set'}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell capitalize text-muted-foreground">
                    {org.partnership_type?.replaceAll('_', ' ') ?? 'Not set'}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <ServiceTags services={org.services_tags} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{formatDate(org.updated_at ?? null)}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {org.website ? (
                      <a href={org.website} target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">
                        {org.website}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="capitalize">
                      {org.status ?? (org.is_active === false ? 'inactive' : 'active')}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="rounded-2xl border border-border/15 bg-background p-3 shadow-sm">
        <ListPaginationControls
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          pageSizeId="organizations-page-size-bottom"
          totalCount={totalCount}
          showingStart={showingStart}
          showingEnd={showingEnd}
          onPageSizeChange={(size) => apply({ pageSize: size, page: 1 })}
          onPrev={() => apply({ page: Math.max(1, page - 1) })}
          onNext={() => apply({ page: Math.min(totalPages, page + 1) })}
        />
      </div>
    </div>
  );
}
