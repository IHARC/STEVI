import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';

const ERROR_COPY: Record<string, { title: string; description: string }> = {
  oauth_authorize_error: {
    title: 'Authorization failed',
    description: 'We could not complete the sign-in request. Please try again.',
  },
  oauth_state_mismatch: {
    title: 'Session expired',
    description: 'Your sign-in session expired. Please start again.',
  },
  oauth_token_error: {
    title: 'Sign-in failed',
    description: 'We could not finish signing you in. Please try again.',
  },
};

export const dynamic = 'force-dynamic';

type AuthErrorPageProps = {
  searchParams?: Promise<{ code?: string | string[] }>;
};

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rawCode = resolvedSearchParams?.code;
  const code = Array.isArray(rawCode) ? rawCode[0] : rawCode;
  const fallback = ERROR_COPY.oauth_authorize_error;
  const lookup = code ? ERROR_COPY[code] : undefined;
  const copy = lookup ?? fallback;

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-semibold">{copy.title}</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">{copy.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/auth/start"
            className="inline-flex items-center text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            Try sign in again
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
