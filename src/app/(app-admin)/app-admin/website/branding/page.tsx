import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { WebsiteBrandingPanel } from '../panels';

export const dynamic = 'force-dynamic';

export default async function AdminWebsiteBrandingPage() {
  const supabase = await createSupabaseRSCClient();
  return <WebsiteBrandingPanel supabase={supabase} />;
}

