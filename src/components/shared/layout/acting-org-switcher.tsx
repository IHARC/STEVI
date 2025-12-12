'use client';

import { useTransition } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import { setActingOrganization } from '@/lib/acting-org/actions';
import { cn } from '@/lib/utils';

type ActingOrgSwitcherProps = {
  choices: Array<{ id: number; name: string | null }>;
  currentOrganizationId: number | null;
  className?: string;
};

export function ActingOrgSwitcher({ choices, currentOrganizationId, className }: ActingOrgSwitcherProps) {
  const [pending, startTransition] = useTransition();
  const pathname = usePathname() ?? '/ops/today';
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const returnTo = `${pathname}${query ? `?${query}` : ''}`;
  const currentValue = currentOrganizationId ? String(currentOrganizationId) : 'none';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Acting org</span>
      <Select
        value={currentValue}
        onValueChange={(value) => {
          const nextId = value === 'none' ? null : Number(value);
          startTransition(() => setActingOrganization(nextId, returnTo));
        }}
        disabled={pending}
      >
        <SelectTrigger className="h-8 w-[190px] rounded-full border-border/60 bg-card px-3 text-xs font-semibold">
          <SelectValue placeholder="Select organization" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Not set</SelectItem>
          {choices.map((choice) => (
            <SelectItem key={choice.id} value={String(choice.id)}>
              {choice.name ?? `Organization ${choice.id}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

