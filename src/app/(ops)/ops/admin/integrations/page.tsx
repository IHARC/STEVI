import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { PageHeader } from '@shared/layout/page-header';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { Textarea } from '@shared/ui/textarea';
import { upsertAiInsightsTtlMinutesAction, upsertAiModelAction, upsertAiSystemPromptAction, upsertOpenAiApiKeyAction } from './actions';

export const dynamic = 'force-dynamic';

type SettingRow = {
  setting_key: string;
  setting_value: string | null;
  updated_at: string | null;
};

async function fetchSystemSettings(
  supabase: Awaited<ReturnType<typeof createSupabaseRSCClient>>,
  keys: string[],
): Promise<Record<string, Pick<SettingRow, 'setting_value' | 'updated_at'> | null>> {
  const { data, error } = await supabase
    .schema('core')
    .from('system_settings')
    .select('setting_key, setting_value, updated_at')
    .in('setting_key', keys);

  if (error) throw error;

  const rows = (data ?? []) as SettingRow[];
  const byKey = new Map(rows.map((row) => [row.setting_key, { setting_value: row.setting_value, updated_at: row.updated_at }]));

  return Object.fromEntries(keys.map((key) => [key, byKey.get(key) ?? null]));
}

function formatWhen(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return date.toLocaleString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

export default async function OpsAdminIntegrationsPage() {
  const supabase = await createSupabaseRSCClient();

  const keys = ['openai_api_key', 'ai_model', 'ai_system_prompt', 'ai_insights_ttl_minutes'];
  const settings = await fetchSystemSettings(supabase, keys);

  const openAiConfigured = Boolean(settings.openai_api_key?.setting_value);
  const model = settings.ai_model?.setting_value ?? '';
  const prompt = settings.ai_system_prompt?.setting_value ?? '';
  const ttlMinutes = settings.ai_insights_ttl_minutes?.setting_value ?? '180';

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="STEVI Admin"
        title="Integrations & AI"
        description="Configure system-wide variables used by Supabase Edge Functions."
        meta={[{ label: 'IHARC only', tone: 'warning' }]}
      />

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="border-border/60 lg:col-span-12">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">Donations (Stripe)</CardTitle>
            <CardDescription>Stripe mode + secrets, email sender, webhook health, and reconciliation inbox.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Moved out of Website → Donations catalogue to keep settings and third-party integrations together.
            </p>
            <Button asChild variant="secondary" size="sm">
              <Link href="/ops/admin/integrations/donations">Open donations integrations</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/60 lg:col-span-4">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">OpenAI API key</CardTitle>
            <CardDescription>Stored in `core.system_settings` (no env fallbacks).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Status</div>
              <Badge variant={openAiConfigured ? 'secondary' : 'destructive'}>{openAiConfigured ? 'Configured' : 'Missing'}</Badge>
            </div>

            <form action={upsertOpenAiApiKeyAction} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="openai-api-key">API key</Label>
                <Input id="openai-api-key" name="openai_api_key" type="password" autoComplete="off" placeholder="sk-…" required />
              </div>
              <Button type="submit" className="w-full">
                Save API key
              </Button>
            </form>

            <p className="text-xs text-muted-foreground">Last updated: {formatWhen(settings.openai_api_key?.updated_at ?? null)}</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 lg:col-span-8">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">AI defaults</CardTitle>
            <CardDescription>Shared variables consumed by AI edge functions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form action={upsertAiModelAction} className="grid gap-3 rounded-2xl border border-border/40 bg-background p-4 lg:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <Label htmlFor="ai-model">Model</Label>
                <Input id="ai-model" name="ai_model" defaultValue={model} placeholder="gpt-5" required />
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full lg:w-auto">
                  Save model
                </Button>
              </div>
              <p className="text-xs text-muted-foreground lg:col-span-2">Last updated: {formatWhen(settings.ai_model?.updated_at ?? null)}</p>
            </form>

            <form
              action={upsertAiInsightsTtlMinutesAction}
              className="grid gap-3 rounded-2xl border border-border/40 bg-background p-4 lg:grid-cols-[1fr_auto]"
            >
              <div className="space-y-2">
                <Label htmlFor="ai-insights-ttl">Insights cache TTL (minutes)</Label>
                <Input
                  id="ai-insights-ttl"
                  name="ai_insights_ttl_minutes"
                  type="number"
                  min={1}
                  max={10_080}
                  step={1}
                  defaultValue={ttlMinutes}
                  required
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full lg:w-auto" variant="secondary">
                  Save TTL
                </Button>
              </div>
              <p className="text-xs text-muted-foreground lg:col-span-2">
                Last updated: {formatWhen(settings.ai_insights_ttl_minutes?.updated_at ?? null)}
              </p>
            </form>

            <form action={upsertAiSystemPromptAction} className="space-y-3 rounded-2xl border border-border/40 bg-background p-4">
              <div className="space-y-2">
                <Label htmlFor="ai-system-prompt">System prompt</Label>
                <Textarea
                  id="ai-system-prompt"
                  name="ai_system_prompt"
                  defaultValue={prompt}
                  rows={12}
                  placeholder="Add the system prompt used by AI text enhancement…"
                  required
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">Last updated: {formatWhen(settings.ai_system_prompt?.updated_at ?? null)}</p>
                <Button type="submit">Save prompt</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
