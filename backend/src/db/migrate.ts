import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { config } from '../config.js';

const pool = new pg.Pool({ connectionString: config.databaseUrl });
await migrate(drizzle(pool), { migrationsFolder: './drizzle' });
await pool.end();
console.log('Migrations applied');
