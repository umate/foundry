import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/lib/env';
import * as schema from './schema';

// Singleton client - reused across requests
const client = postgres(env.DATABASE_URL, {
  max: env.NODE_ENV === 'production' ? 10 : 1,
  idle_timeout: 20,
  max_lifetime: 60 * 30, // 30 minutes
});

export const db = drizzle(client, { schema });

// Type exports
export type Database = typeof db;
export { schema };
