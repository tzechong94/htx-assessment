import { drizzle } from 'drizzle-orm/node-postgres';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import pg from 'pg';
import * as schema from './schema.js';

// Driver-agnostic handle: production uses node-postgres, tests use in-memory PGlite.
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export function createDb(connectionString: string) {
  const pool = new pg.Pool({ connectionString });
  return { db: drizzle(pool, { schema }) as Db, pool };
}
