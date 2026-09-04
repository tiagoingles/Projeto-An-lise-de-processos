import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { resolvePgConfig } from '../env.js';
import * as schema from './schema.js';

const pool = new pg.Pool({
  ...resolvePgConfig(),
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on('error', (err) => {
  console.error('[db] erro inesperado no pool do Postgres:', err.message);
});

export const db = drizzle(pool, { schema });
export { pool, schema };
