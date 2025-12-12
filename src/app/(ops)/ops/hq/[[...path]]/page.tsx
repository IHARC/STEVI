import { redirect } from 'next/navigation';

type PageProps = {
  params: Promise<{ path?: string[] }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = 'force-dynamic';

export default async function LegacyHqRedirectPage({ params, searchParams }: PageProps) {
  const { path } = await params;
  const resolved = searchParams ? await searchParams : undefined;
  const qs = resolved ? new URLSearchParams(Object.entries(resolved).flatMap(([key, value]) => {
    if (value === undefined) return [];
    if (Array.isArray(value)) return value.map((v) => [key, v]);
    return [[key, value]];
  })).toString() : '';

  const suffix = path && path.length > 0 ? `/${path.join('/')}` : '';
  const redirectPath = `/ops/admin${suffix}${qs ? `?${qs}` : ''}`;

  redirect(redirectPath);
}

