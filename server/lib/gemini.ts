import { randomUUID } from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { env } from '../env.js';
import { db, schema } from '../db/client.js';

export { Type } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: env.geminiApiKey,
  httpOptions: { headers: { 'User-Agent': 'sei-gemap-app' } },
});

const TIMEOUT_MS = 90_000;
const MAX_RETRIES = 2;

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

interface CallOptions {
  action: string;
  userEmail: string;
  processNumber?: string;
  systemInstruction?: string;
  parts: Part[] | string;
  responseSchema?: unknown;
  temperature?: number;
  model?: string;
}

function isRetryable(err: unknown): boolean {
  const msg = String((err as Error)?.message || err);
  return /\b(429|500|502|503|504|deadline|unavailable|overloaded|rate)\b/i.test(msg);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Tempo limite excedido (${ms / 1000}s)`)), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

async function recordUsage(row: {
  userEmail: string;
  action: string;
  model: string;
  processNumber?: string;
  usage?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
  latencyMs: number;
  status: 'ok' | 'error';
  error?: string;
}) {
  try {
    await db.insert(schema.usageEvents).values({
      id: randomUUID(),
      userEmail: row.userEmail,
      action: row.action,
      model: row.model,
      processNumber: row.processNumber,
      inputTokens: row.usage?.promptTokenCount ?? 0,
      outputTokens: row.usage?.candidatesTokenCount ?? 0,
      totalTokens: row.usage?.totalTokenCount ?? 0,
      latencyMs: Math.round(row.latencyMs),
      status: row.status,
      error: row.error?.slice(0, 500),
    });
  } catch (err) {
    console.error('[gemini] falha ao gravar usage_event:', (err as Error).message);
  }
}

/** Tenta consertar um JSON quase-válido devolvido pelo modelo. */
function repairJson(text: string): string {
  let t = text.trim();
  t = t.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const first = Math.min(
    ...[t.indexOf('{'), t.indexOf('[')].filter((i) => i >= 0),
  );
  const lastObj = t.lastIndexOf('}');
  const lastArr = t.lastIndexOf(']');
  const last = Math.max(lastObj, lastArr);
  if (Number.isFinite(first) && last > first) t = t.slice(first, last + 1);
  return t;
}

/**
 * Chamada estruturada (JSON) com timeout, retry, parse resiliente e auditoria.
 * Toda chamada à Gemini no app passa por aqui.
 */
export async function generateStructured<T>(opts: CallOptions): Promise<T> {
  const model = opts.model || env.geminiModel;
  const started = Date.now();
  let lastErr: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model,
          contents: typeof opts.parts === 'string' ? opts.parts : { parts: opts.parts },
          config: {
            ...(opts.systemInstruction ? { systemInstruction: opts.systemInstruction } : {}),
            temperature: opts.temperature ?? 0.2,
            responseMimeType: 'application/json',
            ...(opts.responseSchema ? { responseSchema: opts.responseSchema } : {}),
          },
        }),
        TIMEOUT_MS,
      );

      const raw = response.text || '';
      let parsed: T;
      try {
        parsed = JSON.parse(raw) as T;
      } catch {
        parsed = JSON.parse(repairJson(raw)) as T;
      }

      await recordUsage({
        userEmail: opts.userEmail,
        action: opts.action,
        model,
        processNumber: opts.processNumber,
        usage: response.usageMetadata,
        latencyMs: Date.now() - started,
        status: 'ok',
      });
      return parsed;
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES && isRetryable(err)) {
        await sleep(800 * (attempt + 1));
        continue;
      }
      break;
    }
  }

  await recordUsage({
    userEmail: opts.userEmail,
    action: opts.action,
    model,
    processNumber: opts.processNumber,
    latencyMs: Date.now() - started,
    status: 'error',
    error: String((lastErr as Error)?.message || lastErr),
  });
  throw lastErr;
}

/** Conversa livre (texto), usada pelo chat do processo. */
export async function generateChat(opts: {
  action: string;
  userEmail: string;
  processNumber?: string;
  systemInstruction: string;
  message: string;
  temperature?: number;
}): Promise<string> {
  const model = env.geminiModel;
  const started = Date.now();
  try {
    const response = await withTimeout(
      ai.models.generateContent({
        model,
        contents: opts.message,
        config: { systemInstruction: opts.systemInstruction, temperature: opts.temperature ?? 0.3 },
      }),
      TIMEOUT_MS,
    );
    await recordUsage({
      userEmail: opts.userEmail,
      action: opts.action,
      model,
      processNumber: opts.processNumber,
      usage: response.usageMetadata,
      latencyMs: Date.now() - started,
      status: 'ok',
    });
    return response.text || '';
  } catch (err) {
    await recordUsage({
      userEmail: opts.userEmail,
      action: opts.action,
      model,
      processNumber: opts.processNumber,
      latencyMs: Date.now() - started,
      status: 'error',
      error: String((err as Error)?.message || err),
    });
    throw err;
  }
}
