import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { PageHeader } from '@shared/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/ui/tabs';
import { Textarea } from '@shared/ui/textarea';
import { upsertAiInsightsTtlMinutesAction, upsertAiModelAction, upsertAiSystemPromptAction, upsertOpenAiApiKeyAction } from './actions';
import { DonationsStripeSettingsCard } from '@/components/workspace/admin/integrations/donations-stripe-settings-card';
import { DonationsEmailSettingsCard } from '@/components/workspace/admin/integrations/donations-email-settings-card';
import { DonationsWebhookEventsCard } from '@/components/workspace/admin/integrations/donations-webhook-events-card';
import { fetchStripeWebhookEventsAdmin } from '@/lib/donations/service';

export const dynamic = 'force-dynamic';

type SettingRow = {
  setting_key: string;
  setting_value: string | null;
  updated_at: string | null;
};

type PublicSettingRow = {
  setting_key: string;
  setting_value: string | null;
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

async function fetchPublicSettings(
  supabase: Awaited<ReturnType<typeof createSupabaseRSCClient>>,
  keys: string[],
): Promise<Record<string, string | null>> {
  const { data, error } = await supabase
    .schema('portal')
    .from('public_settings')
    .select('setting_key, setting_value')
    .in('setting_key', keys);

  if (error) throw error;

  const rows = (data ?? []) as PublicSettingRow[];
  const byKey = new Map(rows.map((row) => [row.setting_key, row.setting_value]));
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

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type IntegrationsTab = 'fundraising_stripe' | 'fundraising_email' | 'fundraising_webhooks' | 'ai';

function getString(params: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = params?.[key];
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0] ?? null;
  return null;
}

function parseIntegrationsTab(value: string | null): IntegrationsTab {
  if (value === 'fundraising_stripe' || value === 'fundraising_email' || value === 'fundraising_webhooks' || value === 'ai') return value;
  return 'fundraising_stripe';
}

function buildHref(params: URLSearchParams) {
  const query = params.toString();
  return query ? `/ops/admin/integrations?${query}` : '/ops/admin/integrations';
}

export default async function OpsAdminIntegrationsPage({ searchParams }: PageProps) {
  const supabase = await createSupabaseRSCClient();

  const resolvedParams = searchParams ? await searchParams : undefined;
  const urlParams = new URLSearchParams();
  for (const [key, value] of Object.entries(resolvedParams ?? {})) {
    if (!value) continue;
    const first = Array.isArray(value) ? value[0] : value;
    if (typeof first === 'string') urlParams.set(key, first);
  }

  const activeTab = parseIntegrationsTab(getString(resolvedParams, 'tab'));

  const keys = ['openai_api_key', 'ai_model', 'ai_system_prompt', 'ai_insights_ttl_minutes'];
  const settings = await fetchSystemSettings(supabase, keys);

  const stripeSettingKeys = [
    'stripe_donations_mode',
    'stripe_donations_test_secret_key_id',
    'stripe_donations_test_webhook_secret_id',
    'stripe_donations_live_secret_key_id',
    'stripe_donations_live_webhook_secret_id',
  ];

  const emailSettingKeys = [
    'donations_email_from',
    'donations_email_provider',
    'donations_sendgrid_api_key_secret_id',
  ];

  const [stripeSettings, emailSettings, webhookEvents] = await Promise.all([
    fetchPublicSettings(supabase, stripeSettingKeys),
    fetchPublicSettings(supabase, emailSettingKeys),
    fetchStripeWebhookEventsAdmin(supabase, { limit: 50 }),
  ]);

  const openAiConfigured = Boolean(settings.openai_api_key?.setting_value);
  const model = settings.ai_model?.setting_value ?? '';
  const prompt = settings.ai_system_prompt?.setting_value ?? '';
  const ttlMinutes = settings.ai_insights_ttl_minutes?.setting_value ?? '180';

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="STEVI Admin"
        title="Integrations"
        description="Configure third-party services and system-wide variables."
        meta={[{ label: 'IHARC only', tone: 'warning' }]}
      />

      <Tabs value={activeTab} className="space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl bg-muted p-2 sm:grid-cols-4">
          <TabsTrigger value="fundraising_stripe" asChild className="w-full rounded-xl px-3 text-xs font-semibold">
            <Link
              href={(() => {
                const next = new URLSearchParams(urlParams);
                next.set('tab', 'fundraising_stripe');
                next.delete('fundraising');
                return buildHref(next);
              })()}
            >
              Stripe
            </Link>
          </TabsTrigger>
          <TabsTrigger value="fundraising_email" asChild className="w-full rounded-xl px-3 text-xs font-semibold">
            <Link
              href={(() => {
                const next = new URLSearchParams(urlParams);
                next.set('tab', 'fundraising_email');
                next.delete('fundraising');
                return buildHref(next);
              })()}
            >
              Email
            </Link>
          </TabsTrigger>
          <TabsTrigger value="fundraising_webhooks" asChild className="w-full rounded-xl px-3 text-xs font-semibold">
            <Link
              href={(() => {
                const next = new URLSearchParams(urlParams);
                next.set('tab', 'fundraising_webhooks');
                next.delete('fundraising');
                return buildHref(next);
              })()}
            >
              Webhooks
            </Link>
          </TabsTrigger>
          <TabsTrigger value="ai" asChild className="w-full rounded-xl px-3 text-xs font-semibold">
            <Link
              href={(() => {
                const next = new URLSearchParams(urlParams);
                next.set('tab', 'ai');
                next.delete('fundraising');
                return buildHref(next);
              })()}
            >
              AI
            </Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fundraising_stripe">
          <DonationsStripeSettingsCard stripeSettings={stripeSettings} />
        </TabsContent>

        <TabsContent value="fundraising_email">
          <DonationsEmailSettingsCard emailSettings={emailSettings} />
        </TabsContent>

        <TabsContent value="fundraising_webhooks">
          <DonationsWebhookEventsCard events={webhookEvents} />
        </TabsContent>

        <TabsContent value="ai">
          <div className="grid gap-4 lg:grid-cols-12">
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
                <form
                  action={upsertAiModelAction}
                  className="grid gap-3 rounded-2xl border border-border/40 bg-background p-4 lg:grid-cols-[1fr_auto]"
                >
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
