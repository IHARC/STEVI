import type { NextRequest } from 'next/server';
import { refreshOAuthSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  return refreshOAuthSession(request);
}

export default proxy;

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|assets|static).*)',
  ],
};
