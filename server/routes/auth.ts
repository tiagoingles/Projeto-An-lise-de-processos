import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import { env } from '../env.js';
import {
  clearSession,
  hashPassword,
  issueSession,
  requireAuth,
  verifyPassword,
} from '../lib/auth.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Freio simples contra tentativa de força bruta (por processo).
const attempts = new Map<string, { count: number; until: number }>();
function throttled(key: string): boolean {
  const rec = attempts.get(key);
  return !!rec && rec.count >= 8 && Date.now() < rec.until;
}
function registerFail(key: string) {
  const rec = attempts.get(key) || { count: 0, until: 0 };
  rec.count += 1;
  rec.until = Date.now() + 10 * 60 * 1000;
  attempts.set(key, rec);
}

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Informe e-mail e senha.' });
  }
  const email = parsed.data.email.toLowerCase();
  const { password } = parsed.data;

  if (throttled(email)) {
    return res
      .status(429)
      .json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' });
  }

  const [row] = await db
    .select()
    .from(schema.allowedUsers)
    .where(eq(schema.allowedUsers.email, email));

  if (!row) {
    registerFail(email);
    return res.status(403).json({
      error: 'E-mail não autorizado. Peça para o administrador cadastrar o seu acesso.',
    });
  }

  // Primeiro acesso do admin de bootstrap: define a senha a partir do ambiente.
  if (!row.passwordHash) {
    if (
      email === env.bootstrapAdminEmail &&
      env.bootstrapAdminPassword &&
      password === env.bootstrapAdminPassword
    ) {
      const hash = await hashPassword(password);
      await db
        .update(schema.allowedUsers)
        .set({ passwordHash: hash, role: 'admin', lastLoginAt: new Date() })
        .where(eq(schema.allowedUsers.email, email));
      await db
        .insert(schema.workProfiles)
        .values({ ownerEmail: email })
        .onConflictDoNothing();
      const user = { id: email, email, name: row.name || email, role: 'admin' as const };
      await issueSession(res, user);
      return res.json({ user });
    }
    registerFail(email);
    return res.status(401).json({
      error: 'Senha ainda não definida para esta conta. Fale com o administrador.',
    });
  }

  const ok = await verifyPassword(password, row.passwordHash);
  if (!ok) {
    registerFail(email);
    return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
  }

  attempts.delete(email);
  await db
    .update(schema.allowedUsers)
    .set({ lastLoginAt: new Date() })
    .where(eq(schema.allowedUsers.email, email));
  await db.insert(schema.workProfiles).values({ ownerEmail: email }).onConflictDoNothing();

  const user = { id: email, email, name: row.name || email, role: row.role };
  await issueSession(res, user);
  res.json({ user });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

authRouter.post('/logout', (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});
