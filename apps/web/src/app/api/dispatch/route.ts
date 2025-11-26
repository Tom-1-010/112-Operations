import { NextRequest, NextResponse } from 'next/server';
import { DispatchReqSchema, ApiResponse } from '@meldkamerspel/shared';
import { log } from '@/lib/log';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = DispatchReqSchema.parse(body);
    
    log.info('POST /api/dispatch - validated request', validatedData);
    
    // TODO: Implement dispatch logic
    // - Validate incident exists
    // - Validate units are available
    // - Create dispatch record
    // - Update unit statuses
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Dispatch functionality not yet implemented',
        },
      } satisfies ApiResponse<never>,
      { status: 501 }
    );
  } catch (error) {
    log.error('POST /api/dispatch - validation error', error);
    
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
