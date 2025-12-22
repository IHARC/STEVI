import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { WebsiteContentInventoryPanel } from '../panels';

export const dynamic = 'force-dynamic';

export default async function AdminWebsiteInventoryPage() {
  const supabase = await createSupabaseRSCClient();
  return <WebsiteContentInventoryPanel supabase={supabase} />;
}

