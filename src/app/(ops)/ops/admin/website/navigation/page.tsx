import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { WebsiteNavigationPanel } from '../panels';

export const dynamic = 'force-dynamic';

export default async function AdminWebsiteNavigationPage() {
  const supabase = await createSupabaseRSCClient();
  return <WebsiteNavigationPanel supabase={supabase} />;
}

