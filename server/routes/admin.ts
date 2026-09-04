import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '../db/client.js';
import { requireAdmin } from '../lib/auth.js';

export const adminRouter = Router();
adminRouter.use(requireAdmin);

/* ---------------------------- Usuários autorizados --------------------------- */

adminRouter.get('/allowed-users', async (_req, res) => {
  res.json(await db.select().from(schema.allowedUsers).orderBy(desc(schema.allowedUsers.createdAt)));
});

const allowInput = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member']).default('member'),
  note: z.string().optional(),
});

adminRouter.post('/allowed-users', async (req, res) => {
  const parsed = allowInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'E-mail inválido.' });
  const email = parsed.data.email.toLowerCase();
  await db
    .insert(schema.allowedUsers)
    .values({ email, role: parsed.data.role, note: parsed.data.note, addedByEmail: req.user!.email })
    .onConflictDoUpdate({
      target: schema.allowedUsers.email,
      set: { role: parsed.data.role, note: parsed.data.note },
    });
  res.json(await db.select().from(schema.allowedUsers).orderBy(desc(schema.allowedUsers.createdAt)));
});

adminRouter.delete('/allowed-users/:email', async (req, res) => {
  const email = req.params.email.toLowerCase();
  if (email === req.user!.email) {
    return res.status(400).json({ error: 'Você não pode remover o seu próprio acesso.' });
  }
  await db.delete(schema.allowedUsers).where(eq(schema.allowedUsers.email, email));
  res.json({ ok: true });
});

/* --------------------------------- Uso / auditoria -------------------------- */

adminRouter.get('/usage', async (req, res) => {
  const days = Math.min(Number(req.query.days) || 30, 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const byUser = await db
    .select({
      userEmail: schema.usageEvents.userEmail,
      calls: sql<number>`count(*)::int`,
      tokens: sql<number>`coalesce(sum(${schema.usageEvents.totalTokens}), 0)::int`,
      errors: sql<number>`count(*) filter (where ${schema.usageEvents.status} = 'error')::int`,
    })
    .from(schema.usageEvents)
    .where(sql`${schema.usageEvents.createdAt} >= ${since}`)
    .groupBy(schema.usageEvents.userEmail);

  const byAction = await db
    .select({
      action: schema.usageEvents.action,
      calls: sql<number>`count(*)::int`,
      tokens: sql<number>`coalesce(sum(${schema.usageEvents.totalTokens}), 0)::int`,
    })
    .from(schema.usageEvents)
    .where(sql`${schema.usageEvents.createdAt} >= ${since}`)
    .groupBy(schema.usageEvents.action);

  const recent = await db
    .select()
    .from(schema.usageEvents)
    .orderBy(desc(schema.usageEvents.createdAt))
    .limit(50);

  res.json({ days, byUser, byAction, recent });
});

/* ------------------------- Importação do backup antigo --------------------- */

/**
 * Migração one-shot: recebe o JSON exportado pela versão localStorage do app
 * (campos: rules[], precedents[], themes[], profile{}) e popula o banco.
 */
adminRouter.post('/import-backup', async (req, res) => {
  const data = req.body || {};
  const summary = { rules: 0, precedents: 0, themes: 0, profile: false };

  if (Array.isArray(data.rules) && data.rules.length) {
    const rows = data.rules.map((r: any) => ({
      id: r.id || `rule-${randomUUID()}`,
      title: r.title || 'Sem título',
      category: r.category || 'norma',
      theme: r.theme ?? null,
      description: r.description ?? '',
      content: r.content ?? '',
      citationOrArticle: r.citationOrArticle ?? null,
      tags: Array.isArray(r.tags) ? r.tags : [],
      isActive: r.isActive !== false,
      documentSource: r.documentSource ?? null,
      subfolderPath: r.subfolderPath ?? null,
      createdByEmail: req.user!.email,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    await db.insert(schema.rules).values(rows).onConflictDoNothing();
    summary.rules = rows.length;
  }

  if (Array.isArray(data.precedents) && data.precedents.length) {
    const rows = data.precedents.map((p: any) => ({
      id: p.id || `prec-${randomUUID()}`,
      processNumber: p.processNumber || 'S/N',
      subject: p.subject ?? '',
      theme: p.theme ?? 'Geral',
      factualSummary: p.factualSummary ?? '',
      finalDecision: p.finalDecision ?? '',
      deliberationsOrDespacho: p.deliberationsOrDespacho ?? '',
      unit: p.unit ?? 'GEMAP',
      date: p.date ?? '',
      tags: Array.isArray(p.tags) ? p.tags : [],
      precedentSummary: p.precedentSummary ?? '',
      outcomeType: p.outcomeType ?? null,
      sourceFileName: p.sourceFileName ?? null,
      createdByEmail: req.user!.email,
      createdAt: new Date(),
    }));
    await db.insert(schema.precedents).values(rows).onConflictDoNothing();
    summary.precedents = rows.length;
  }

  if (Array.isArray(data.themes) && data.themes.length) {
    const rows = data.themes.map((name: string, i: number) => ({ name, sortOrder: i }));
    await db.insert(schema.themes).values(rows).onConflictDoNothing();
    summary.themes = rows.length;
  }

  if (data.profile && typeof data.profile === 'object') {
    const p = data.profile;
    const values = {
      ownerEmail: req.user!.email,
      role: p.role || 'Analista / Gestor de Processos SEI',
      jurisdictionOrOrgan: p.jurisdictionOrOrgan || 'GEMAP',
      decisionTone: p.decisionTone || 'objetivo_direto',
      customInstructions: p.customInstructions || '',
      accumulatedLearnings: Array.isArray(p.accumulatedLearnings) ? p.accumulatedLearnings : [],
      updatedAt: new Date(),
    };
    await db
      .insert(schema.workProfiles)
      .values(values)
      .onConflictDoUpdate({ target: schema.workProfiles.ownerEmail, set: values });
    summary.profile = true;
  }

  res.json({ ok: true, imported: summary });
});
