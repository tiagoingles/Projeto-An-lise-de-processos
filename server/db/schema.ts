import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

/**
 * Ferramenta interna de uma equipe só (GEMAP). Não há multi-organização:
 * o acervo, os precedentes e os temas são compartilhados por todos os usuários
 * autorizados. O histórico e o perfil de trabalho são por usuário.
 */

/** Lista de e-mails que podem entrar. Gerenciada pelos admins. */
export const allowedUsers = pgTable('allowed_users', {
  email: text('email').primaryKey(),
  role: text('role', { enum: ['admin', 'member'] })
    .notNull()
    .default('member'),
  note: text('note'),
  addedByEmail: text('added_by_email'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Preenchido no primeiro login bem-sucedido de cada pessoa. */
export const users = pgTable('users', {
  id: text('id').primaryKey(), // Google "sub"
  email: text('email').notNull().unique(),
  name: text('name'),
  picture: text('picture'),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Acervo normativo: leis, decretos, pareceres, orientações informais. */
export const rules = pgTable('rules', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  category: text('category').notNull(), // parecer | lei | decreto | orientacao_informal | norma | regra | estilo
  theme: text('theme'),
  description: text('description').notNull().default(''),
  content: text('content').notNull().default(''),
  citationOrArticle: text('citation_or_article'),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  isActive: boolean('is_active').notNull().default(true),
  documentSource: text('document_source'),
  subfolderPath: text('subfolder_path'),
  createdByEmail: text('created_by_email'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Banco de processos reais / jurisprudência interna da GEMAP. */
export const precedents = pgTable('precedents', {
  id: text('id').primaryKey(),
  processNumber: text('process_number').notNull().default('S/N'),
  subject: text('subject').notNull().default(''),
  theme: text('theme').notNull().default('Geral'),
  factualSummary: text('factual_summary').notNull().default(''),
  finalDecision: text('final_decision').notNull().default(''),
  deliberationsOrDespacho: text('deliberations_or_despacho').notNull().default(''),
  unit: text('unit').notNull().default('GEMAP'),
  date: text('date').notNull().default(''),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  precedentSummary: text('precedent_summary').notNull().default(''),
  outcomeType: text('outcome_type'),
  sourceFileName: text('source_file_name'),
  createdByEmail: text('created_by_email'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Temas de classificação, compartilhados. */
export const themes = pgTable('themes', {
  name: text('name').primaryKey(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Histórico de análises — o resultado completo fica em `result` (JSON). */
export const analyses = pgTable('analyses', {
  id: text('id').primaryKey(),
  ownerEmail: text('owner_email').notNull(),
  fileName: text('file_name'),
  processNumber: text('process_number'),
  subject: text('subject'),
  theme: text('theme'),
  result: jsonb('result').notNull(),
  userFeedbackDecision: text('user_feedback_decision'),
  userNotes: text('user_notes'),
  isSavedToPrecedents: boolean('is_saved_to_precedents').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Perfil de trabalho por usuário (tom decisório, instruções, aprendizados). */
export const workProfiles = pgTable('work_profiles', {
  ownerEmail: text('owner_email').primaryKey(),
  role: text('role').notNull().default('Analista / Gestor de Processos SEI'),
  jurisdictionOrOrgan: text('jurisdiction_or_organ').notNull().default('GEMAP'),
  decisionTone: text('decision_tone').notNull().default('objetivo_direto'),
  customInstructions: text('custom_instructions').notNull().default(''),
  accumulatedLearnings: jsonb('accumulated_learnings')
    .$type<{ id: string; date: string; summary: string; contextProcess?: string; appliedCount: number }[]>()
    .notNull()
    .default([]),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Trilha de auditoria: toda chamada à IA gera um registro. */
export const usageEvents = pgTable('usage_events', {
  id: text('id').primaryKey(),
  userEmail: text('user_email').notNull(),
  action: text('action').notNull(), // analyze-process | chat-process | analyze-topic | upload-rules | extract-real-process | embed
  model: text('model'),
  processNumber: text('process_number'),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  totalTokens: integer('total_tokens').notNull().default(0),
  latencyMs: integer('latency_ms').notNull().default(0),
  status: text('status').notNull().default('ok'), // ok | error
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
