import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import {
  clearSession,
  issueSession,
  requireAuth,
  resolveRole,
  verifyGoogleCredential,
} from '../lib/auth.js';

export const authRouter = Router();

const loginSchema = z.object({ credential: z.string().min(10) });

authRouter.post('/google', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Credencial do Google ausente.' });
  }

  let profile;
  try {
    profile = await verifyGoogleCredential(parsed.data.credential);
  } catch {
    return res.status(401).json({ error: 'Não foi possível validar sua conta Google.' });
  }

  const role = await resolveRole(profile.email);
  if (!role) {
    return res.status(403).json({
      error: `O e-mail ${profile.email} não está autorizado a usar o sistema. Solicite acesso ao administrador da GEMAP.`,
    });
  }

  await db
    .insert(schema.users)
    .values({
      id: profile.id,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
      lastLoginAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.users.id,
      set: { email: profile.email, name: profile.name, picture: profile.picture, lastLoginAt: new Date() },
    });

  // Garante um perfil de trabalho inicial.
  await db
    .insert(schema.workProfiles)
    .values({ ownerEmail: profile.email })
    .onConflictDoNothing();

  const user = { ...profile, role };
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
