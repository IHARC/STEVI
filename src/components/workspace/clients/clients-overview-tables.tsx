'use client';

import type { KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/ui/table';
import type { StaffCase } from '@/lib/staff/fetchers';
import type { ClientCaseDetail } from '@/lib/cases/types';
import { cn } from '@/lib/utils';

type CaseloadTableProps = {
  caseload: StaffCase[];
};

type ActivityTableProps = {
  cases: ClientCaseDetail[];
};

function useRowNavigation() {
  const router = useRouter();

  const open = (href: string | null) => {
    if (!href) return;
    router.push(href);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, href: string | null) => {
    if (!href) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      open(href);
    }
  };

  return { open, handleKeyDown };
}

export function ClientsCaseloadTable({ caseload }: CaseloadTableProps) {
  const { open, handleKeyDown } = useRowNavigation();

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-2xl border border-border/15 bg-background shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="hidden lg:table-cell">Next step</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {caseload.map((item) => {
              const href = `/ops/clients/${item.id}?tab=overview`;
              return (
                <TableRow
                  key={item.id}
                  role="link"
                  tabIndex={0}
                  aria-label={`Open ${item.clientName ?? 'client'} record`}
                  onClick={() => open(href)}
                  onKeyDown={(event) => handleKeyDown(event, href)}
                  className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <TableCell className="font-medium">{item.clientName}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="capitalize">
                      {item.status}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {item.nextStep ?? '—'}
                  </TableCell>
                </TableRow>
              );
            })}
            {caseload.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                  No assigned caseload yet. Assign clients to yourself from an encounter to build your caseload.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function ClientsActivityTable({ cases }: ActivityTableProps) {
  const { open, handleKeyDown } = useRowNavigation();

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-2xl border border-border/15 bg-background shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Case</TableHead>
              <TableHead className="hidden md:table-cell">Person</TableHead>
              <TableHead className="hidden lg:table-cell">Manager</TableHead>
              <TableHead className="hidden lg:table-cell">Priority</TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cases.map((item) => {
              const href = item.personId
                ? `/ops/clients/${item.personId}?case=${item.id}&tab=overview`
                : null;
              return (
                <TableRow
                  key={item.id}
                  role={href ? 'link' : undefined}
                  tabIndex={href ? 0 : -1}
                  aria-disabled={href ? undefined : true}
                  aria-label={
                    href
                      ? `Open case ${item.caseNumber ?? item.id} record`
                      : 'Case record unavailable'
                  }
                  onClick={() => open(href)}
                  onKeyDown={(event) => handleKeyDown(event, href)}
                  className={cn(
                    href
                      ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                      : 'cursor-default',
                  )}
                >
                  <TableCell className="min-w-[220px]">
                    <div className="font-medium text-foreground">{item.caseType ?? 'Support case'}</div>
                    <div className="mt-1 text-xs text-muted-foreground">Case #{item.id.toLocaleString()}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">#{item.personId?.toLocaleString() ?? '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell">{item.caseManagerName}</TableCell>
                  <TableCell className="hidden lg:table-cell">{item.priority ?? '—'}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="capitalize">
                      {item.status ?? 'active'}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
            {cases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  No recent activity. Log outreach, tasks, or encounters to populate the feed.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
