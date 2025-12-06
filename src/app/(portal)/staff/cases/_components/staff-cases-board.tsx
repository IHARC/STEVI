'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { QuickOutreachForm } from '../../_components/quick-outreach-form';
import type { ClientCaseDetail } from '@/lib/cases/types';
import type { StaffShift } from '@/lib/staff/fetchers';
import { cn } from '@/lib/utils';
import { CalendarClock, Clock4, Compass, Filter, Search, Sparkles, type LucideIcon } from 'lucide-react';

type CaseWithContext = ClientCaseDetail & {
  clientName?: string | null;
  nextStep?: string | null;
  nextAt?: string | null;
};

type CaseloadEntry = {
  personId: number;
  clientName: string;
  nextStep: string | null;
  nextAt: string | null;
  status: string;
};

type SavedViewId = 'all' | 'active' | 'next' | 'priority' | 'recent' | 'closed';

type SavedView = {
  id: SavedViewId;
  label: string;
  description: string;
  filter: (item: CaseWithContext) => boolean;
  sort?: (a: CaseWithContext, b: CaseWithContext) => number;
};

type StaffCasesBoardProps = {
  cases: CaseWithContext[];
  caseload: CaseloadEntry[];
  shifts: StaffShift[];
};

export function StaffCasesBoard({ cases, caseload, shifts }: StaffCasesBoardProps) {
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [viewId, setViewId] = useState<SavedViewId>('all');
  const [query, setQuery] = useState('');
  const [focusSignal, setFocusSignal] = useState<number>();

  const casesWithContext = useMemo(() => {
    const map = new Map<number, CaseloadEntry>();
    caseload.forEach((entry) => map.set(entry.personId, entry));

    return cases.map((item) => {
      const context = map.get(item.personId);
      return {
        ...item,
        status: item.status ?? 'active',
        clientName: context?.clientName ?? null,
        nextStep: context?.nextStep ?? null,
        nextAt: context?.nextAt ?? null,
      };
    });
  }, [cases, caseload]);

  const savedViews = useMemo<SavedView[]>(() => buildSavedViews(), []);
  const activeView = savedViews.find((option) => option.id === viewId) ?? savedViews[0];

  const filteredCases = useMemo(() => {
    const term = query.trim().toLowerCase();
    const viewFiltered = casesWithContext.filter((item) => activeView.filter(item));
    const searched = term
      ? viewFiltered.filter((item) => caseMatchesQuery(item, term))
      : viewFiltered;
    const sorter = activeView.sort ?? defaultCaseSorter;
    return [...searched].sort(sorter);
  }, [casesWithContext, activeView, query]);

  const [userSelectedCaseId, setUserSelectedCaseId] = useState<number | null>(null);

  const selectedCaseId = useMemo(() => {
    if (!filteredCases.length) return null;
    if (userSelectedCaseId && filteredCases.some((item) => item.id === userSelectedCaseId)) {
      return userSelectedCaseId;
    }
    return filteredCases[0].id;
  }, [filteredCases, userSelectedCaseId]);

  useEffect(() => {
    function handleShortcuts(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      const activeElement = document.activeElement as HTMLElement | null;
      const isTyping =
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.isContentEditable;

      if (key === '/' && !event.metaKey && !event.ctrlKey && !isTyping) {
        event.preventDefault();
        searchRef.current?.focus();
      }

      if (key === 'n' && !event.metaKey && !event.ctrlKey && !isTyping) {
        event.preventDefault();
        setFocusSignal(Date.now());
      }
    }

    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, []);

  const selectedCase = filteredCases.find((item) => item.id === selectedCaseId) ?? null;
  const todayHighlights = useMemo(() => buildTodayHighlights(casesWithContext, shifts), [casesWithContext, shifts]);

  return (
    <div className="space-y-6">
      <TodayStrip highlights={todayHighlights} />

      <Card className="border border-border/40 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl">Cases</CardTitle>
              <CardDescription>
                Saved views filter by status, priority, and schedule. Use / to search, N to log outreach, and the
                navigation sidebar to jump between tools.
              </CardDescription>
            </div>
            <div className="flex w-full flex-col gap-1 sm:max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search case type, manager, or # (/)"
                  className="pl-10"
                  aria-label="Search cases"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full bg-border/10 px-2 py-px">
                  <Filter className="h-3.5 w-3.5" aria-hidden />
                  {activeView.label}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-border/10 px-2 py-px">
                  <span className="font-medium">/</span>
                  Search
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-border/10 px-2 py-px">
                  <span className="font-medium">N</span>
                  Log outreach
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {savedViews.map((option) => (
              <Button
                key={option.id}
                type="button"
                size="sm"
                variant={option.id === activeView.id ? 'secondary' : 'outline'}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium',
                  option.id === activeView.id && 'border-primary/60 bg-primary/10 text-primary'
                )}
                onClick={() => setViewId(option.id)}
              >
                {option.label}
              </Button>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">{activeView.description}</p>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1.6fr,1fr]">
            <div className="space-y-3">
              {filteredCases.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/50 bg-muted p-6 text-center text-sm text-muted-foreground">
                  No cases match this view yet. Try another saved view or clear your search.
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-border/40 bg-muted">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-card">
                        <TableHead>Case</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Next step</TableHead>
                        <TableHead className="text-right">Opened</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCases.map((item) => {
                        const selected = item.id === selectedCaseId;
                        return (
                          <TableRow
                            key={item.id}
                            data-state={selected ? 'selected' : undefined}
                            className={cn(
                              'cursor-pointer',
                              selected && 'bg-card/70',
                            )}
                            onClick={() => setUserSelectedCaseId(item.id)}
                            tabIndex={0}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                setUserSelectedCaseId(item.id);
                              }
                            }}
                            aria-selected={selected}
                          >
                            <TableCell className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-foreground">
                                  {item.caseType ?? 'Support case'}
                                </span>
                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                  #{item.caseNumber ?? item.id}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {item.clientName ? item.clientName : `Person #${item.personId}`}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {item.caseManagerName}
                                {item.caseManagerContact ? ` · ${item.caseManagerContact}` : ''}
                              </p>
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusVariant(item.status)}>{formatStatus(item.status)}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={priorityVariant(item.priority)}>{formatPriority(item.priority)}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-0.5">
                                <p className="text-sm text-foreground/90">
                                  {item.nextStep ?? 'Next step not recorded'}
                                </p>
                                {item.nextAt ? (
                                  <p className="text-xs text-muted-foreground">{formatDateTime(item.nextAt)}</p>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {formatDate(item.startDate)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <CasePeekPanel selectedCase={selectedCase} focusSignal={focusSignal} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TodayStrip({ highlights }: { highlights: ReturnType<typeof buildTodayHighlights> }) {
  const { dueToday, newThisWeek, nextShift } = highlights;
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <StripCard
        title="Today"
        icon={CalendarClock}
        value={`${dueToday.length} due`}
        detail={dueToday[0]?.nextStep ?? 'No follow-ups scheduled today.'}
        meta={dueToday[0]?.nextAt ? formatDateTime(dueToday[0].nextAt) : undefined}
      />
      <StripCard
        title="Next shift"
        icon={Clock4}
        value={nextShift ? nextShift.title : 'Not scheduled'}
        detail={nextShift ? nextShift.location : 'No shift logged for today.'}
        meta={nextShift ? `${nextShift.startsAt} – ${nextShift.endsAt}` : undefined}
      />
      <StripCard
        title="New this week"
        icon={Sparkles}
        value={`${newThisWeek} opened`}
        detail={newThisWeek > 0 ? 'Keep momentum with early outreach.' : 'No new cases this week yet.'}
      />
    </div>
  );
}

function StripCard({
  title,
  value,
  detail,
  meta,
  icon: IconComponent,
}: {
  title: string;
  value: string;
  detail: string;
  meta?: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border/40 bg-card p-4 shadow-sm">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <IconComponent className="h-5 w-5" aria-hidden />
      </span>
      <div className="space-y-0.5">
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="text-lg text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{detail}</p>
        {meta ? <p className="text-xs text-muted-foreground">{meta}</p> : null}
      </div>
    </div>
  );
}

function CasePeekPanel({
  selectedCase,
  focusSignal,
}: {
  selectedCase: CaseWithContext | null;
  focusSignal?: number;
}) {
  if (!selectedCase) {
    return (
      <div className="rounded-2xl border border-dashed border-border/50 bg-muted p-6 text-center">
        <p className="text-sm text-muted-foreground">Select a case to preview details and log outreach.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border/40 bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Case #{selectedCase.caseNumber ?? selectedCase.id}</p>
          <p className="text-xl text-foreground">{selectedCase.caseType ?? 'Support case'}</p>
          <p className="text-sm text-muted-foreground">
            {selectedCase.clientName ? selectedCase.clientName : `Person #${selectedCase.personId}`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant={statusVariant(selectedCase.status)}>{formatStatus(selectedCase.status)}</Badge>
          <Badge variant={priorityVariant(selectedCase.priority)}>{formatPriority(selectedCase.priority)}</Badge>
        </div>
      </div>

      <Separator />

      <dl className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
        <div className="space-y-0.5">
          <dt>Case manager</dt>
          <dd className="text-sm text-foreground">{selectedCase.caseManagerName}</dd>
          {selectedCase.caseManagerContact ? (
            <dd className="text-xs text-muted-foreground">{selectedCase.caseManagerContact}</dd>
          ) : null}
        </div>
        <div className="space-y-0.5">
          <dt>Opened</dt>
          <dd className="text-sm text-foreground">{formatDate(selectedCase.startDate)}</dd>
          <dd className="text-xs text-muted-foreground">
            {selectedCase.endDate ? `Closed ${formatDate(selectedCase.endDate)}` : 'Open case'}
          </dd>
        </div>
      </dl>

      <div className="space-y-1 rounded-xl bg-muted p-3">
        <p className="text-xs text-muted-foreground">Next step</p>
        <p className="text-sm text-foreground/90">
          {selectedCase.nextStep ?? 'Next action not captured yet.'}
        </p>
        {selectedCase.nextAt ? (
          <p className="text-xs text-muted-foreground">{formatDateTime(selectedCase.nextAt)}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button asChild size="sm" variant="secondary">
          <Link href={`/staff/cases/${selectedCase.id}`}>Open full case</Link>
        </Button>
        <Badge variant="outline" className="inline-flex items-center gap-1">
          <Compass className="h-4 w-4" aria-hidden />
          Shift + ⌘/Ctrl + W to open navigation
        </Badge>
      </div>

      <QuickOutreachForm
        personId={selectedCase.personId}
        caseId={selectedCase.id}
        defaultTitle="Outreach follow-up"
        focusSignal={focusSignal}
        dense
      />
    </div>
  );
}

function buildSavedViews(): SavedView[] {
  return [
    {
      id: 'all',
      label: 'All cases',
      description: 'Everything you can access via RLS.',
      filter: () => true,
      sort: defaultCaseSorter,
    },
    {
      id: 'active',
      label: 'Active',
      description: 'Open cases in progress.',
      filter: (item) => isActiveStatus(item.status),
      sort: defaultCaseSorter,
    },
    {
      id: 'next',
      label: 'Next steps',
      description: 'Cases with a scheduled next action.',
      filter: (item) => Boolean(item.nextAt || item.nextStep),
      sort: nextActionSorter,
    },
    {
      id: 'priority',
      label: 'High priority',
      description: 'High, urgent, or critical cases.',
      filter: (item) => isHighPriority(item.priority),
      sort: defaultCaseSorter,
    },
    {
      id: 'recent',
      label: 'New this month',
      description: 'Started in the last 30 days.',
      filter: (item) => isRecent(item.startDate, 30),
      sort: defaultCaseSorter,
    },
    {
      id: 'closed',
      label: 'Closed',
      description: 'Completed, resolved, or closed cases.',
      filter: (item) => isClosedStatus(item.status),
      sort: defaultCaseSorter,
    },
  ];
}

function buildTodayHighlights(cases: CaseWithContext[], shifts: StaffShift[]) {
  const today = todayString();
  const dueToday = cases
    .filter((item) => (item.nextAt ?? '').slice(0, 10) === today)
    .sort(nextActionSorter);
  const newThisWeek = cases.filter((item) => isRecent(item.startDate, 7)).length;
  const nextShift =
    shifts
      .slice()
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0] ?? null;
  return { dueToday, newThisWeek, nextShift };
}

function caseMatchesQuery(item: CaseWithContext, term: string) {
  const haystack = [
    item.caseType,
    item.caseManagerName,
    item.caseManagerContact,
    item.caseNumber,
    item.clientName,
    item.priority,
    item.status,
    String(item.personId),
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  return haystack.some((value) => value.includes(term));
}

function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function defaultCaseSorter(a: CaseWithContext, b: CaseWithContext) {
  const aDate = a.startDate ? Date.parse(a.startDate) : 0;
  const bDate = b.startDate ? Date.parse(b.startDate) : 0;
  return bDate - aDate;
}

function nextActionSorter(a: CaseWithContext, b: CaseWithContext) {
  const aDate = a.nextAt ? Date.parse(a.nextAt) : Number.POSITIVE_INFINITY;
  const bDate = b.nextAt ? Date.parse(b.nextAt) : Number.POSITIVE_INFINITY;
  return aDate - bDate;
}

function isRecent(dateString: string | null, days: number) {
  if (!dateString) return false;
  const parsed = Date.parse(dateString);
  if (Number.isNaN(parsed)) return false;
  const diff = Date.now() - parsed;
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

function isActiveStatus(status: string | null | undefined) {
  const normalized = (status ?? '').toLowerCase();
  if (!normalized) return true;
  return ['active', 'open', 'ongoing', 'in_progress'].includes(normalized);
}

function isClosedStatus(status: string | null | undefined) {
  const normalized = (status ?? '').toLowerCase();
  return ['closed', 'completed', 'resolved', 'archived'].includes(normalized);
}

function isHighPriority(priority: string | null | undefined) {
  const normalized = (priority ?? '').toLowerCase();
  return ['high', 'urgent', 'critical', 'emergency'].includes(normalized);
}

function formatStatus(status: string | null | undefined) {
  if (!status) return 'Active';
  const normalized = status.toLowerCase();
  if (normalized === 'in_progress') return 'In progress';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatPriority(priority: string | null | undefined) {
  if (!priority) return 'Standard';
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function statusVariant(status: string | null | undefined): 'default' | 'secondary' | 'destructive' | 'outline' {
  const normalized = (status ?? '').toLowerCase();
  if (['closed', 'completed', 'resolved', 'archived'].includes(normalized)) return 'secondary';
  if (['escalated', 'overdue'].includes(normalized)) return 'destructive';
  return 'default';
}

function priorityVariant(priority: string | null | undefined): 'default' | 'secondary' | 'destructive' | 'outline' {
  const normalized = (priority ?? '').toLowerCase();
  if (['high', 'urgent', 'critical', 'emergency'].includes(normalized)) return 'destructive';
  if (['medium', 'standard'].includes(normalized)) return 'secondary';
  if (!priority) return 'outline';
  return 'outline';
}
