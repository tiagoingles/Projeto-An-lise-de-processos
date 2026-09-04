import { desc, eq } from 'drizzle-orm';
import { db, schema } from '../db/client.js';

/** Leituras de dados reutilizadas pelas rotas de IA. */

export async function getAllRules() {
  return db.select().from(schema.rules).orderBy(desc(schema.rules.createdAt));
}

export async function getActiveRules() {
  return db.select().from(schema.rules).where(eq(schema.rules.isActive, true));
}

export async function getAllPrecedents() {
  return db.select().from(schema.precedents).orderBy(desc(schema.precedents.createdAt));
}

export async function getProfile(ownerEmail: string) {
  const [row] = await db
    .select()
    .from(schema.workProfiles)
    .where(eq(schema.workProfiles.ownerEmail, ownerEmail));
  return row ?? null;
}
