import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { WebsiteHomePanel } from '../panels';

export const dynamic = 'force-dynamic';

export default async function AdminWebsiteHomePage() {
  const supabase = await createSupabaseRSCClient();
  return <WebsiteHomePanel supabase={supabase} />;
}

