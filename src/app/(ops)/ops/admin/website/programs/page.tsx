import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { WebsiteProgramsPanel } from '../panels';

export const dynamic = 'force-dynamic';

export default async function AdminWebsiteProgramsPage() {
  const supabase = await createSupabaseRSCClient();
  return <WebsiteProgramsPanel supabase={supabase} />;
}

