import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    if (process.env.NODE_ENV !== 'production') {
      console.info('Telemetry event', payload?.event ?? 'unknown', payload?.payload ?? {});
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('Telemetry payload parsing skipped', error);
    }
  }

  return NextResponse.json({ received: true }, { status: 202 });
}
