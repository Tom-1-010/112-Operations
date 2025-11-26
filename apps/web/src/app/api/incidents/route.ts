import { NextRequest, NextResponse } from 'next/server';
import { CreateIncidentReqSchema, ApiResponse } from '@meldkamerspel/shared';
import { log } from '@/lib/log';

export async function GET() {
  log.info('GET /api/incidents - returning empty list');
  
  return NextResponse.json({
    success: true,
    data: {
      items: [],
      total: 0,
    },
  } satisfies ApiResponse<{ items: any[]; total: number>);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = CreateIncidentReqSchema.parse(body);
    
    log.info('POST /api/incidents - validated request', validatedData);
    
    // TODO: Implement incident creation
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Incident creation not yet implemented',
        },
      } satisfies ApiResponse<never>,
      { status: 501 }
    );
  } catch (error) {
    log.error('POST /api/incidents - validation error', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error instanceof Error ? { message: error.message } : {},
        },
      } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }
}
