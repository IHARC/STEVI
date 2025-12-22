import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { WebsiteSupportsPanel } from '../panels';

export const dynamic = 'force-dynamic';

export default async function AdminWebsiteSupportsPage() {
  const supabase = await createSupabaseRSCClient();
  return <WebsiteSupportsPanel supabase={supabase} />;
}

