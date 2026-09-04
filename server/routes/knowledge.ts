import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '../db/client.js';
import { requireAuth } from '../lib/auth.js';

export const knowledgeRouter = Router();
knowledgeRouter.use(requireAuth);

const now = () => new Date();

/* ------------------------------- RULES (acervo) ------------------------------ */

const ruleInput = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  category: z.string().min(1),
  theme: z.string().optional(),
  description: z.string().default(''),
  content: z.string().default(''),
  citationOrArticle: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  documentSource: z.string().optional(),
  subfolderPath: z.string().optional(),
});

function toRuleRow(input: z.infer<typeof ruleInput>, email: string) {
  return {
    id: input.id || `rule-${randomUUID()}`,
    title: input.title,
    category: input.category,
    theme: input.theme ?? null,
    description: input.description ?? '',
    content: input.content ?? '',
    citationOrArticle: input.citationOrArticle ?? null,
    tags: input.tags ?? [],
    isActive: input.isActive ?? true,
    documentSource: input.documentSource ?? null,
    subfolderPath: input.subfolderPath ?? null,
    createdByEmail: email,
    createdAt: now(),
    updatedAt: now(),
  };
}

knowledgeRouter.get('/rules', async (_req, res) => {
  res.json(await db.select().from(schema.rules).orderBy(desc(schema.rules.createdAt)));
});

knowledgeRouter.post('/rules', async (req, res) => {
  const many = z.object({ rules: z.array(ruleInput).min(1) }).safeParse(req.body);
  const one = ruleInput.safeParse(req.body);
  const email = req.user!.email;

  if (many.success) {
    const rows = many.data.rules.map((r) => toRuleRow(r, email));
    await db.insert(schema.rules).values(rows).onConflictDoNothing();
    return res.json({ created: rows.length, rules: rows });
  }
  if (one.success) {
    const row = toRuleRow(one.data, email);
    await db.insert(schema.rules).values(row).onConflictDoNothing();
    return res.json(row);
  }
  res.status(400).json({ error: 'Dados de regra inválidos.' });
});

knowledgeRouter.patch('/rules/:id', async (req, res) => {
  const patch = ruleInput.partial().safeParse(req.body);
  if (!patch.success) return res.status(400).json({ error: 'Alteração inválida.' });
  const [row] = await db
    .update(schema.rules)
    .set({ ...patch.data, updatedAt: now() })
    .where(eq(schema.rules.id, req.params.id))
    .returning();
  if (!row) return res.status(404).json({ error: 'Regra não encontrada.' });
  res.json(row);
});

knowledgeRouter.delete('/rules/:id', async (req, res) => {
  await db.delete(schema.rules).where(eq(schema.rules.id, req.params.id));
  res.json({ ok: true });
});

/* ---------------------------- PRECEDENTS (banco) ---------------------------- */

const precedentInput = z.object({
  id: z.string().optional(),
  processNumber: z.string().default('S/N'),
  subject: z.string().default(''),
  theme: z.string().default('Geral'),
  factualSummary: z.string().default(''),
  finalDecision: z.string().default(''),
  deliberationsOrDespacho: z.string().default(''),
  unit: z.string().default('GEMAP'),
  date: z.string().default(''),
  tags: z.array(z.string()).default([]),
  precedentSummary: z.string().default(''),
  outcomeType: z.string().optional(),
  sourceFileName: z.string().optional(),
});

knowledgeRouter.get('/precedents', async (_req, res) => {
  res.json(await db.select().from(schema.precedents).orderBy(desc(schema.precedents.createdAt)));
});

knowledgeRouter.post('/precedents', async (req, res) => {
  const parsed = precedentInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Precedente inválido.' });
  const row = {
    ...parsed.data,
    id: parsed.data.id || `prec-${randomUUID()}`,
    outcomeType: parsed.data.outcomeType ?? null,
    sourceFileName: parsed.data.sourceFileName ?? null,
    createdByEmail: req.user!.email,
    createdAt: now(),
  };
  await db
    .insert(schema.precedents)
    .values(row)
    .onConflictDoUpdate({ target: schema.precedents.id, set: row });
  res.json(row);
});

knowledgeRouter.delete('/precedents/:id', async (req, res) => {
  await db.delete(schema.precedents).where(eq(schema.precedents.id, req.params.id));
  res.json({ ok: true });
});

/* --------------------------------- THEMES ---------------------------------- */

knowledgeRouter.get('/themes', async (_req, res) => {
  const rows = await db.select().from(schema.themes).orderBy(schema.themes.sortOrder);
  res.json(rows.map((r) => r.name));
});

knowledgeRouter.post('/themes', async (req, res) => {
  const parsed = z.object({ name: z.string().min(2) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Tema inválido.' });
  await db
    .insert(schema.themes)
    .values({ name: parsed.data.name, sortOrder: Date.now() % 100000 })
    .onConflictDoNothing();
  const rows = await db.select().from(schema.themes).orderBy(schema.themes.sortOrder);
  res.json(rows.map((r) => r.name));
});

/* -------------------------------- PROFILE --------------------------------- */

const profileInput = z.object({
  role: z.string().default('Analista / Gestor de Processos SEI'),
  jurisdictionOrOrgan: z.string().default('GEMAP'),
  decisionTone: z.enum(['formal_tradicional', 'objetivo_direto', 'pedagogico_didatico']).default('objetivo_direto'),
  customInstructions: z.string().default(''),
  accumulatedLearnings: z
    .array(
      z.object({
        id: z.string(),
        date: z.string(),
        summary: z.string(),
        contextProcess: z.string().optional(),
        appliedCount: z.number().default(0),
      }),
    )
    .default([]),
});

knowledgeRouter.get('/profile', async (req, res) => {
  const [row] = await db
    .select()
    .from(schema.workProfiles)
    .where(eq(schema.workProfiles.ownerEmail, req.user!.email));
  res.json(row ?? null);
});

knowledgeRouter.put('/profile', async (req, res) => {
  const parsed = profileInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Perfil inválido.' });
  const email = req.user!.email;
  const values = { ownerEmail: email, ...parsed.data, updatedAt: now() };
  await db
    .insert(schema.workProfiles)
    .values(values)
    .onConflictDoUpdate({ target: schema.workProfiles.ownerEmail, set: values });
  res.json(values);
});

/* -------------------------------- HISTORY --------------------------------- */

knowledgeRouter.get('/history', async (req, res) => {
  const rows = await db
    .select()
    .from(schema.analyses)
    .where(eq(schema.analyses.ownerEmail, req.user!.email))
    .orderBy(desc(schema.analyses.createdAt))
    .limit(80);
  res.json(rows.map((r) => ({ ...(r.result as object), id: r.id, createdAt: r.createdAt })));
});

knowledgeRouter.post('/history', async (req, res) => {
  const parsed = z.object({ analysis: z.record(z.any()) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Análise inválida.' });
  const a = parsed.data.analysis as Record<string, any>;
  const row = {
    id: a.id || `proc-${randomUUID()}`,
    ownerEmail: req.user!.email,
    fileName: a.fileName ?? null,
    processNumber: a.processNumber ?? null,
    subject: a.subject ?? null,
    theme: a.theme ?? null,
    result: a,
    userFeedbackDecision: a.userFeedbackDecision ?? null,
    userNotes: a.userNotes ?? null,
    isSavedToPrecedents: Boolean(a.isSavedToPrecedents),
    createdAt: now(),
  };
  await db
    .insert(schema.analyses)
    .values(row)
    .onConflictDoUpdate({
      target: schema.analyses.id,
      set: { result: row.result, userFeedbackDecision: row.userFeedbackDecision, userNotes: row.userNotes, isSavedToPrecedents: row.isSavedToPrecedents },
    });
  res.json({ ok: true, id: row.id });
});

knowledgeRouter.delete('/history/:id', async (req, res) => {
  await db
    .delete(schema.analyses)
    .where(and(eq(schema.analyses.id, req.params.id), eq(schema.analyses.ownerEmail, req.user!.email)));
  res.json({ ok: true });
});

/* ---------------------------- EXPORT / IMPORT ----------------------------- */

knowledgeRouter.get('/knowledge/export', async (_req, res) => {
  const [rules, precedents, themes] = await Promise.all([
    db.select().from(schema.rules),
    db.select().from(schema.precedents),
    db.select().from(schema.themes).orderBy(schema.themes.sortOrder),
  ]);
  res.json({
    exportedAt: new Date().toISOString(),
    version: '4.0',
    rules,
    precedents,
    themes: themes.map((t) => t.name),
  });
});
