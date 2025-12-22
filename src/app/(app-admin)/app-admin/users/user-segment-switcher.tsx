'use client';

import { useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@shared/ui/tabs';

type SegmentId = 'all' | 'clients' | 'partners' | 'staff';

export function UserSegmentSwitcher({
  segment,
  queryString,
}: {
  segment: SegmentId;
  queryString: string;
}) {
  const router = useRouter();
  const suffix = queryString ? `?${queryString}` : '';

  const hrefFor = (next: SegmentId) => `/app-admin/users/${next}${suffix}`;

  return (
    <Tabs
      value={segment}
      onValueChange={(next) => {
        if (next === segment) return;
        router.push(hrefFor(next as SegmentId));
      }}
    >
      <TabsList className="bg-muted/60">
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="clients">Clients</TabsTrigger>
        <TabsTrigger value="partners">Partners</TabsTrigger>
        <TabsTrigger value="staff">Staff</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

