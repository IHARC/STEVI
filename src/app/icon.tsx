import { getBrandingAssets } from '@/lib/marketing/branding';

export const dynamic = 'force-dynamic';

export default async function Icon() {
  const branding = await getBrandingAssets();
  const response = await fetch(branding.faviconUrl, {
    next: { revalidate: 3600 },
  });

  if (!response.ok || !response.body) {
    return new Response(null, { status: 204 });
  }

  const contentType = response.headers.get('content-type') ?? 'image/png';

  return new Response(response.body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
