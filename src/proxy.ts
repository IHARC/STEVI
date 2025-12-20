import type { NextRequest } from 'next/server';
import { refreshSupabaseSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  return refreshSupabaseSession(request);
}

export default proxy;

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|assets|static).*)',
  ],
};
