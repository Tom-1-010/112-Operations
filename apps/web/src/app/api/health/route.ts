import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'web',
    app: env.APP_NAME,
    timestamp: new Date().toISOString(),
  });
}
