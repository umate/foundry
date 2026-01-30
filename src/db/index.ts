import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data', 'foundry.db');

// Ensure data directory exists
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.exec('PRAGMA journal_mode = WAL;');
sqlite.exec('PRAGMA foreign_keys = ON;');

export const db = drizzle(sqlite, { schema });

// Type exports
export type DB = typeof db;
export { schema };
