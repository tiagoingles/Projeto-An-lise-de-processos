import { randomUUID } from 'node:crypto';
import { and, cosineDistance, desc, eq, notInArray, sql } from 'drizzle-orm';
import { env } from '../env.js';
import { db, schema } from '../db/client.js';
import { ai } from './gemini.js';
import type { PrecedentRow, RuleRow } from '../prompts/shared.js';

const EMBED_BATCH = 96;

/** Gera embeddings para uma lista de textos (em lotes). */
export async function embed(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const batch = texts.slice(i, i + EMBED_BATCH).map((t) => t.slice(0, 8000) || ' ');
    const res: any = await ai.models.embedContent({
      model: env.geminiEmbeddingModel,
      contents: batch,
    });
    const embeddings = res.embeddings || res.embedding || [];
    for (const e of embeddings) out.push(e.values || e.value || e);
  }
  return out;
}

async function embedOne(text: string): Promise<number[]> {
  const [v] = await embed([text]);
  return v;
}

/* -------------------------------- Chunking -------------------------------- */

function chunkText(input: string, size = 1800, overlap = 220): string[] {
  const clean = input.replace(/\s+\n/g, '\n').trim();
  if (clean.length <= size) return [clean];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + size, clean.length);
    if (end < clean.length) {
      const brk = clean.lastIndexOf('\n', end);
      if (brk > start + size * 0.5) end = brk;
    }
    chunks.push(clean.slice(start, end).trim());
    start = end - overlap;
  }
  return chunks.filter(Boolean);
}

function ruleText(r: RuleRow): string {
  return [
    `[${(r.category || 'norma').toUpperCase()}] ${r.title}`,
    r.citationOrArticle ? `Citação: ${r.citationOrArticle}` : '',
    r.theme ? `Tema: ${r.theme}` : '',
    r.description,
    r.content,
  ]
    .filter(Boolean)
    .join('\n');
}

function precedentText(p: PrecedentRow): string {
  return [
    `Processo SEI ${p.processNumber} — ${p.subject} (${p.theme})`,
    `Decisão: ${p.finalDecision}`,
    `Tese/Balizador: ${p.precedentSummary}`,
    p.factualSummary,
  ]
    .filter(Boolean)
    .join('\n');
}

/* ------------------------------- Indexação ------------------------------- */

export async function indexRule(ruleId: string): Promise<number> {
  const [rule] = await db.select().from(schema.rules).where(eq(schema.rules.id, ruleId));
  if (!rule) return 0;
  const parts = chunkText(ruleText(rule));
  const vectors = await embed(parts);
  await db.delete(schema.ruleChunks).where(eq(schema.ruleChunks.ruleId, ruleId));
  await db.insert(schema.ruleChunks).values(
    parts.map((content, i) => ({
      id: `rc-${randomUUID()}`,
      ruleId,
      chunkIndex: i,
      content,
      embedding: vectors[i],
    })),
  );
  return parts.length;
}

export async function indexRulesBatch(ruleIds: string[]): Promise<void> {
  for (const id of ruleIds) {
    try {
      await indexRule(id);
    } catch (err) {
      console.error(`[rag] falha ao indexar regra ${id}:`, (err as Error).message);
    }
  }
}

export async function indexPrecedent(precedentId: string): Promise<void> {
  const [p] = await db.select().from(schema.precedents).where(eq(schema.precedents.id, precedentId));
  if (!p) return;
  const content = precedentText(p);
  const [embedding] = await embed([content]);
  await db
    .insert(schema.precedentEmbeddings)
    .values({ precedentId, content, embedding })
    .onConflictDoUpdate({
      target: schema.precedentEmbeddings.precedentId,
      set: { content, embedding, createdAt: new Date() },
    });
}

export async function reindexAll(): Promise<{ rules: number; precedents: number; chunks: number }> {
  const rules = await db.select({ id: schema.rules.id }).from(schema.rules);
  const precedents = await db.select({ id: schema.precedents.id }).from(schema.precedents);
  let chunks = 0;
  for (const r of rules) {
    try {
      chunks += await indexRule(r.id);
    } catch (err) {
      console.error(`[rag] reindex regra ${r.id}:`, (err as Error).message);
    }
  }
  for (const p of precedents) {
    try {
      await indexPrecedent(p.id);
    } catch (err) {
      console.error(`[rag] reindex precedente ${p.id}:`, (err as Error).message);
    }
  }
  return { rules: rules.length, precedents: precedents.length, chunks };
}

/* ------------------------------- Recuperação ----------------------------- */

export async function hasRuleIndex(): Promise<boolean> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.ruleChunks);
  return count > 0;
}

/**
 * Recupera as regras mais relevantes para `queryText`.
 * Complementa com regras ativas ainda não indexadas (adicionadas há pouco),
 * para nenhuma diretriz recém-cadastrada ficar invisível.
 */
export async function retrieveRules(queryText: string, k = 14): Promise<RuleRow[]> {
  const qv = await embedOne(queryText);
  const distance = cosineDistance(schema.ruleChunks.embedding, qv);

  const hits = await db
    .select({
      ruleId: schema.ruleChunks.ruleId,
      score: sql<number>`min(${distance})`,
    })
    .from(schema.ruleChunks)
    .groupBy(schema.ruleChunks.ruleId)
    .orderBy(sql`min(${distance})`)
    .limit(k);

  const hitIds = hits.map((h) => h.ruleId);

  const pending = await db
    .select()
    .from(schema.rules)
    .where(
      and(
        eq(schema.rules.isActive, true),
        hitIds.length ? notInArray(schema.rules.id, hitIds) : undefined,
        notInArray(
          schema.rules.id,
          db.select({ id: schema.ruleChunks.ruleId }).from(schema.ruleChunks),
        ),
      ),
    )
    .orderBy(desc(schema.rules.createdAt))
    .limit(6);

  const retrieved = hitIds.length
    ? await db.select().from(schema.rules).where(
        and(eq(schema.rules.isActive, true), sql`${schema.rules.id} = any(${hitIds})`),
      )
    : [];

  // preserva a ordem de relevância
  const order = new Map(hitIds.map((id, i) => [id, i]));
  retrieved.sort((a, b) => (order.get(a.id)! - order.get(b.id)!));

  return [...retrieved, ...pending];
}

export async function retrievePrecedents(queryText: string, k = 6): Promise<PrecedentRow[]> {
  const qv = await embedOne(queryText);
  const distance = cosineDistance(schema.precedentEmbeddings.embedding, qv);
  const hits = await db
    .select({ precedentId: schema.precedentEmbeddings.precedentId, score: distance })
    .from(schema.precedentEmbeddings)
    .orderBy(distance)
    .limit(k);

  if (!hits.length) return [];
  const ids = hits.map((h) => h.precedentId);
  const rows = await db
    .select()
    .from(schema.precedents)
    .where(sql`${schema.precedents.id} = any(${ids})`);
  const order = new Map(ids.map((id, i) => [id, i]));
  return rows.sort((a, b) => (order.get(a.id)! - order.get(b.id)!));
}

export async function hasPrecedentIndex(): Promise<boolean> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.precedentEmbeddings);
  return count > 0;
}

/** Varredura de embeddings faltantes (chamada no start do servidor). */
export async function backfillMissing(): Promise<void> {
  const missingRules = await db
    .select({ id: schema.rules.id })
    .from(schema.rules)
    .where(
      notInArray(
        schema.rules.id,
        db.select({ id: schema.ruleChunks.ruleId }).from(schema.ruleChunks),
      ),
    )
    .limit(500);
  if (missingRules.length) {
    console.log(`[rag] indexando ${missingRules.length} regra(s) sem embedding...`);
    await indexRulesBatch(missingRules.map((r) => r.id));
  }

  const missingPrec = await db
    .select({ id: schema.precedents.id })
    .from(schema.precedents)
    .where(
      notInArray(
        schema.precedents.id,
        db.select({ id: schema.precedentEmbeddings.precedentId }).from(schema.precedentEmbeddings),
      ),
    )
    .limit(500);
  for (const p of missingPrec) {
    try {
      await indexPrecedent(p.id);
    } catch (err) {
      console.error(`[rag] backfill precedente ${p.id}:`, (err as Error).message);
    }
  }
}

