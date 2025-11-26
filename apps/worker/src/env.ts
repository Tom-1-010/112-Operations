import { z } from 'zod';

const envSchema = z.object({
  APP_NAME: z.string().default('MeldkamerSpel Worker'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  WORKER_INTERVAL_MS: z.coerce.number().default(30000), // 30 seconds
});

export const env = envSchema.parse({
  APP_NAME: process.env.APP_NAME,
  NODE_ENV: process.env.NODE_ENV,
  WORKER_INTERVAL_MS: process.env.WORKER_INTERVAL_MS,
});

export type Env = z.infer<typeof envSchema>;
