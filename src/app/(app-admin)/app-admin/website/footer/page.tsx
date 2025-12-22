import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { WebsiteFooterPanel } from '../panels';

export const dynamic = 'force-dynamic';

export default async function AdminWebsiteFooterPage() {
  const supabase = await createSupabaseRSCClient();
  return <WebsiteFooterPanel supabase={supabase} />;
}

