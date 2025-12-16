const SECRET_HEADER = 'x-revalidate-secret';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
}

export async function revalidateMarketingDonationCatalog(): Promise<void> {
  const url = requireEnv('MARKETING_REVALIDATE_DONATION_CATALOG_URL');
  const secret = requireEnv('MARKETING_REVALIDATE_SECRET');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      [SECRET_HEADER]: secret,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason: 'stevi' }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    const details = text ? ` ${text.slice(0, 200)}` : '';
    throw new Error(`Marketing donation catalog revalidation failed (${response.status}).${details}`);
  }
}

