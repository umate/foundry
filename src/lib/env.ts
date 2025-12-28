import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  AI_GATEWAY_API_KEY: z.string().min(1, 'AI_GATEWAY_API_KEY is required'),
  AI_DEFAULT_MODEL: z.string().default('anthropic/claude-sonnet-4.5'),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
