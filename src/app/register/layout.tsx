import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

export const dynamic = 'force-dynamic';

export default async function RegisterLayout({ children }: { children: ReactNode }) {
  const headerList = await headers();
  const url = headerList.get('next-url') ?? '/register';
  const next = (() => {
    try {
      return new URL(url, 'http://localhost').searchParams.get('next');
    } catch {
      return null;
    }
  })();

  const target = next ? `/onboarding?next=${encodeURIComponent(next)}` : '/onboarding';
  redirect(target);
  return children;
}
