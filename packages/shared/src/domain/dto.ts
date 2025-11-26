import { z } from 'zod';
import { UnitRole, UnitStatus, IncidentType, IncidentState } from './types';

// Request DTOs
export const CreateIncidentReqSchema = z.object({
  type: z.nativeEnum(IncidentType),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  dwellSeconds: z.number().min(0),
  reward: z.number().min(0),
});

export const CreateUnitReqSchema = z.object({
  name: z.string().min(1).max(100),
  role: z.nativeEnum(UnitRole),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
});

export const DispatchReqSchema = z.object({
  incidentId: z.string().uuid(),
  unitIds: z.array(z.string().uuid()).min(1),
});

// Response DTOs
export const ApiOkSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  });

export const ApiErrSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional(),
  }),
});

// Inferred types
export type CreateIncidentReq = z.infer<typeof CreateIncidentReqSchema>;
export type CreateUnitReq = z.infer<typeof CreateUnitReqSchema>;
export type DispatchReq = z.infer<typeof DispatchReqSchema>;

export type ApiOk<T> = {
  success: true;
  data: T;
};

export type ApiErr = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
};

export type ApiResponse<T> = ApiOk<T> | ApiErr;
