export const runtime = 'nodejs';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function getFunctionsBaseUrl() {
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const host = new URL(supabaseUrl).host;
  const projectRef = host.split('.')[0];
  return `https://${projectRef}.functions.supabase.co`;
}

export async function POST(req: Request) {
  const publishableKey = requireEnv('SUPABASE_PUBLISHABLE_KEY');

  const stripeSignature = req.headers.get('stripe-signature') ?? '';
  const contentType = req.headers.get('content-type') ?? 'application/json';

  const body = await req.arrayBuffer();

  const url = `${getFunctionsBaseUrl()}/donations_stripe_webhook`;

  const forwarded = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${publishableKey}`,
      apikey: publishableKey,
      'content-type': contentType,
      ...(stripeSignature ? { 'stripe-signature': stripeSignature } : {}),
    },
    body,
  });

  return new Response(await forwarded.arrayBuffer(), {
    status: forwarded.status,
    headers: {
      'Content-Type': forwarded.headers.get('content-type') ?? 'application/json',
    },
  });
}
