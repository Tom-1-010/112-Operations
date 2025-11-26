import { z } from 'zod';

const envSchema = z.object({
  APP_NAME: z.string().default('MeldkamerSpel'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  GIT_COMMIT: z.string().optional(),
});

export const env = envSchema.parse({
  APP_NAME: process.env.APP_NAME,
  NODE_ENV: process.env.NODE_ENV,
  GIT_COMMIT: process.env.GIT_COMMIT,
});

export type Env = z.infer<typeof envSchema>;
