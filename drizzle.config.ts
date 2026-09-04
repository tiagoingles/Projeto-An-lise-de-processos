import { defineConfig } from 'drizzle-kit';

/**
 * `drizzle-kit generate` só precisa do schema (não conecta ao banco).
 * `drizzle-kit studio` / `push` usam DATABASE_URL.
 */
export default defineConfig({
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://localhost:5432/sei_gemap',
  },
  strict: true,
  verbose: true,
});
