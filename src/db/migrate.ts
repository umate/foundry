import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data', 'foundry.db');

// Ensure data directory exists
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

console.log('Running migrations...');

const sqlite = new Database(dbPath);
sqlite.exec('PRAGMA journal_mode = WAL;');
sqlite.exec('PRAGMA foreign_keys = ON;');

const db = drizzle(sqlite);

migrate(db, { migrationsFolder: './drizzle/migrations' });

sqlite.close();

console.log('Migrations completed!');
