'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@shared/ui/dropdown-menu';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/ui/table';
import { cn } from '@/lib/utils';
import { formatEnumLabel, PERSON_CATEGORY_VALUES, PERSON_STATUS_VALUES, PERSON_TYPE_VALUES, requiresPrivacySearch } from '@/lib/clients/directory';
import type { PersonCategory, PersonStatus, PersonType } from '@/lib/clients/directory';
import type { OnboardingStatus } from '@/lib/onboarding/status';
import { ListPaginationControls, type ListPageSize } from '@shared/list/pagination-controls';
import { SortableTableHead, type ListSortOrder } from '@shared/list/sortable-table-head';

type DirectoryItem = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  person_type: PersonType;
  person_category: PersonCategory;
  status: PersonStatus;
  last_service_date: string | null;
  created_at: string;
  updated_at: string;
  onboarding?: OnboardingStatus | null;
};

type Props = {
  items: DirectoryItem[];
  totalCount: number;
  query: {
    q: string;
    page: number;
    pageSize: ListPageSize;
    status: 'all' | PersonStatus;
    category: 'all' | PersonCategory;
    types: PersonType[];
    sortBy: 'created_at' | 'first_name' | 'last_name' | 'person_type' | 'last_service_date' | 'updated_at';
    sortOrder: ListSortOrder;
  };
  loadError?: string | null;
  onboardingError?: string | null;
};

function buildUrl(pathname: string, base: URLSearchParams, next: Record<string, string | number | null | undefined>) {
  const params = new URLSearchParams(base.toString());
  for (const [key, value] of Object.entries(next)) {
    if (value === null || value === undefined) {
      params.delete(key);
      continue;
    }
    const stringValue = String(value);
    if (!stringValue) {
      params.delete(key);
      continue;
    }
    params.set(key, stringValue);
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function formatTimestamp(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

function resolveOnboardingVariant(status?: OnboardingStatus | null) {
  if (!status) return 'secondary';
  if (status.status === 'COMPLETED') return 'default';
  if (status.status === 'NEEDS_CONSENTS') return 'secondary';
  return 'outline';
}

function describeOnboarding(status?: OnboardingStatus | null) {
  if (!status) return 'Status unavailable';
  if (status.status === 'COMPLETED') return 'Completed';
  if (status.status === 'NEEDS_CONSENTS') return 'Needs consents';
  return 'Not started';
}

function resolveConsentVariant(status?: OnboardingStatus | null) {
  if (!status) return 'secondary';
  if (status.hasDataSharingPreference) return 'outline';
  if (status.hasPerson) return 'secondary';
  return 'secondary';
}

function describeConsent(status?: OnboardingStatus | null) {
  if (!status) return 'Consent unknown';
  if (status.hasDataSharingPreference) return 'Consent active';
  if (status.hasPerson && status.hasServiceAgreementConsent && status.hasPrivacyAcknowledgement) return 'Consent needed';
  return 'Not started';
}

export function ClientsDirectoryTable({ items, totalCount, query, loadError, onboardingError }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const baseParams = useMemo(() => new URLSearchParams(searchParams?.toString()), [searchParams]);

  const [q, setQ] = useState(query.q);
  const [status, setStatus] = useState<Props['query']['status']>(query.status);
  const [category, setCategory] = useState<Props['query']['category']>(query.category);
  const [types, setTypes] = useState<PersonType[]>(query.types);
  const [sortBy, setSortBy] = useState<Props['query']['sortBy']>(query.sortBy);
  const [sortOrder, setSortOrder] = useState<Props['query']['sortOrder']>(query.sortOrder);
  const [pageSize, setPageSize] = useState<ListPageSize>(query.pageSize);

  const page = query.page;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const showingStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingEnd = totalCount === 0 ? 0 : Math.min(totalCount, page * pageSize);

  const privacySearchRequired = requiresPrivacySearch(types);
  const privacyError = privacySearchRequired && q.trim().length < 2
    ? 'Search term of at least 2 characters is required when including client or potential client records (privacy protection).'
    : null;

  const apply = (next: Partial<Props['query']> & { page?: number }) => {
    const merged = {
      q: next.q ?? q,
      status: next.status ?? status,
      category: next.category ?? category,
      types: next.types ?? types,
      sortBy: next.sortBy ?? sortBy,
      sortOrder: next.sortOrder ?? sortOrder,
      page: next.page ?? 1,
      pageSize: next.pageSize ?? pageSize,
    };

    router.replace(
      buildUrl(pathname, baseParams, {
        q: merged.q || null,
        status: merged.status === 'all' ? null : merged.status,
        category: merged.category === 'all' ? null : merged.category,
        types: merged.types.length ? merged.types.join(',') : null,
        sortBy: merged.sortBy,
        sortOrder: merged.sortOrder,
        page: merged.page,
        pageSize: merged.pageSize,
      }),
    );
  };

  const toggleType = (personType: PersonType) => {
    const next = types.includes(personType)
      ? types.filter((entry) => entry !== personType)
      : [...types, personType];
    setTypes(next);
    apply({ types: next, page: 1 });
  };

  const clearFilters = () => {
    setQ('');
    setStatus('all');
    setCategory('all');
    setTypes([]);
    setSortBy('created_at');
    setSortOrder('DESC');
    setPageSize(25);
    apply({
      q: '',
      status: 'all',
      category: 'all',
      types: [],
      sortBy: 'created_at',
      sortOrder: 'DESC',
      pageSize: 25,
      page: 1,
    });
  };

  const applySort = (nextSortBy: Props['query']['sortBy'], defaultOrder: Props['query']['sortOrder']) => {
    const nextOrder = sortBy === nextSortBy ? (sortOrder === 'ASC' ? 'DESC' : 'ASC') : defaultOrder;
    setSortBy(nextSortBy);
    setSortOrder(nextOrder);
    apply({ sortBy: nextSortBy, sortOrder: nextOrder, page: 1 });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 rounded-2xl border border-border/15 bg-background p-3 shadow-sm">
        {(loadError || onboardingError || privacyError) ? (
          <div className="space-y-2">
            {privacyError ? (
              <Alert variant="destructive">
                <AlertTitle>Search required</AlertTitle>
                <AlertDescription>{privacyError}</AlertDescription>
              </Alert>
            ) : null}
            {loadError ? (
              <Alert variant="destructive">
                <AlertTitle>Unable to load directory</AlertTitle>
                <AlertDescription>{loadError}</AlertDescription>
              </Alert>
            ) : null}
            {onboardingError ? (
              <Alert>
                <AlertTitle>Onboarding status unavailable</AlertTitle>
                <AlertDescription>{onboardingError}</AlertDescription>
              </Alert>
            ) : null}
          </div>
        ) : null}

	        <div className="flex flex-wrap items-center gap-2">
	          <div className="flex min-w-[260px] flex-1 items-center gap-2">
            <Label htmlFor="clients-directory-search" className="sr-only">Search</Label>
            <Input
              id="clients-directory-search"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') apply({ q, page: 1 });
              }}
              placeholder="Search name, email, phone, organization"
              className="h-8"
            />
            <Button
              variant="secondary"
              size="sm"
              className="h-8"
              onClick={() => apply({ q, page: 1 })}
              disabled={Boolean(privacyError)}
            >
              Apply
            </Button>
          </div>

	          <div className="min-w-[140px]">
            <Label htmlFor="clients-directory-status" className="sr-only">Status</Label>
            <Select
              value={status}
              onValueChange={(value) => {
                const next = value as Props['query']['status'];
                setStatus(next);
                apply({ status: next, page: 1 });
              }}
            >
              <SelectTrigger id="clients-directory-status" className="h-8 px-2 py-1 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {PERSON_STATUS_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {formatEnumLabel(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

	          <div className="min-w-[160px]">
            <Label htmlFor="clients-directory-category" className="sr-only">Category</Label>
            <Select
              value={category}
              onValueChange={(value) => {
                const next = value as Props['query']['category'];
                setCategory(next);
                apply({ category: next, page: 1 });
              }}
            >
              <SelectTrigger id="clients-directory-category" className="h-8 px-2 py-1 text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {PERSON_CATEGORY_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {formatEnumLabel(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

	          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 justify-between">
                <span className={cn('truncate text-left', types.length ? 'text-foreground' : 'text-muted-foreground')}>
                  {types.length ? `Types · ${types.length}` : 'Types · All'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              <DropdownMenuLabel>Person types</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={types.length === 0}
                onCheckedChange={() => {
                  setTypes([]);
                  apply({ types: [], page: 1 });
                }}
                onSelect={(event) => event.preventDefault()}
              >
                All types
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              {PERSON_TYPE_VALUES.map((personType) => (
                <DropdownMenuCheckboxItem
                  key={personType}
                  checked={types.includes(personType)}
                  onCheckedChange={() => toggleType(personType)}
                  onSelect={(event) => event.preventDefault()}
                >
                  {formatEnumLabel(personType)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8">
                Clear
              </Button>
            </div>

	        </div>

	        {privacySearchRequired ? (
	          <p className="text-xs text-muted-foreground">
            Privacy protection: client/potential client records require a search term.
	          </p>
	        ) : null}

        <div className="mt-1 border-t border-border/10 pt-2">
          <ListPaginationControls
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            pageSizeId="clients-directory-page-size-top"
            totalCount={totalCount}
            showingStart={showingStart}
            showingEnd={showingEnd}
            onPageSizeChange={(size) => {
              setPageSize(size);
              apply({ pageSize: size, page: 1 });
            }}
            onPrev={() => apply({ page: Math.max(1, page - 1) })}
            onNext={() => apply({ page: Math.min(totalPages, page + 1) })}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border/15 bg-background shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead
                label="First"
                active={sortBy === 'first_name'}
                order={sortBy === 'first_name' ? sortOrder : undefined}
                onClick={() => applySort('first_name', 'ASC')}
                className="min-w-[160px]"
              />
              <SortableTableHead
                label="Last"
                active={sortBy === 'last_name'}
                order={sortBy === 'last_name' ? sortOrder : undefined}
                onClick={() => applySort('last_name', 'ASC')}
                className="min-w-[200px]"
              />
              <SortableTableHead
                label="Type"
                active={sortBy === 'person_type'}
                order={sortBy === 'person_type' ? sortOrder : undefined}
                onClick={() => applySort('person_type', 'ASC')}
                className="hidden lg:table-cell"
              />
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="hidden xl:table-cell">Onboarding</TableHead>
              <TableHead className="hidden lg:table-cell">Consent</TableHead>
              <SortableTableHead
                label="Last service"
                active={sortBy === 'last_service_date'}
                order={sortBy === 'last_service_date' ? sortOrder : undefined}
                onClick={() => applySort('last_service_date', 'DESC')}
                className="hidden lg:table-cell"
              />
              <SortableTableHead
                label="Updated"
                active={sortBy === 'updated_at'}
                order={sortBy === 'updated_at' ? sortOrder : undefined}
                onClick={() => applySort('updated_at', 'DESC')}
                className="hidden md:table-cell"
              />
              <TableHead className="text-right">Open</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="min-w-[160px] font-medium text-foreground">
                  {item.first_name?.trim() || '—'}
                </TableCell>
                <TableCell className="min-w-[200px]">
                  <div className="font-medium text-foreground">{item.last_name?.trim() || '—'}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    ID {item.id.toLocaleString()}
                    {item.email ? ` · ${item.email}` : ''}
                    {item.phone ? ` · ${item.phone}` : ''}
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell">{formatEnumLabel(item.person_type)}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant={item.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                    {formatEnumLabel(item.status)}
                  </Badge>
                </TableCell>
                <TableCell className="hidden xl:table-cell">
                  <Badge variant={resolveOnboardingVariant(item.onboarding)}>{describeOnboarding(item.onboarding)}</Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Badge variant={resolveConsentVariant(item.onboarding)}>{describeConsent(item.onboarding)}</Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell">{item.last_service_date ?? '—'}</TableCell>
                <TableCell className="hidden md:table-cell">{formatTimestamp(item.updated_at)}</TableCell>
                <TableCell className="text-right">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/ops/clients/${item.id}?view=directory`}>Open</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  No clients match your search and filters.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
	        </Table>
	      </div>

      <div className="rounded-2xl border border-border/15 bg-background p-3 shadow-sm">
        <ListPaginationControls
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          pageSizeId="clients-directory-page-size-bottom"
          totalCount={totalCount}
          showingStart={showingStart}
          showingEnd={showingEnd}
          onPageSizeChange={(size) => {
            setPageSize(size);
            apply({ pageSize: size, page: 1 });
          }}
          onPrev={() => apply({ page: Math.max(1, page - 1) })}
          onNext={() => apply({ page: Math.min(totalPages, page + 1) })}
        />
      </div>
	    </div>
	  );
}
