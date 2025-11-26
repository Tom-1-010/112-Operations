import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

export async function GET() {
  const packageJson = require('../../../../package.json');
  
  return NextResponse.json({
    name: packageJson.name,
    version: packageJson.version,
    commit: env.GIT_COMMIT,
    timestamp: new Date().toISOString(),
  });
}
