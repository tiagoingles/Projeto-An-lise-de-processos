import type { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { eq } from 'drizzle-orm';
import { env } from '../env.js';
import { db, schema } from '../db/client.js';

const COOKIE_NAME = 'sei_session';
const sessionKey = new TextEncoder().encode(env.sessionSecret);

export interface SessionUser {
  id: string; // = e-mail
  email: string;
  name: string;
  role: 'admin' | 'member';
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 11);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Consulta a lista de autorizados. Retorna o papel ou null se não autorizado. */
export async function resolveRole(email: string): Promise<'admin' | 'member' | null> {
  const [row] = await db
    .select()
    .from(schema.allowedUsers)
    .where(eq(schema.allowedUsers.email, email.toLowerCase()));
  return row ? row.role : null;
}

export async function issueSession(res: Response, user: SessionUser) {
  const token = await new SignJWT({ email: user.email, name: user.name, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${env.sessionDays}d`)
    .sign(sessionKey);

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'lax',
    maxAge: env.sessionDays * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearSession(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

async function readSession(req: Request): Promise<SessionUser | null> {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionKey);
    return {
      id: String(payload.sub),
      email: String(payload.email),
      name: String(payload.name || ''),
      role: (payload.role as 'admin' | 'member') || 'member',
    };
  } catch {
    return null;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = await readSession(req);
  if (!user) {
    res.status(401).json({ error: 'Sessão expirada ou ausente. Faça login novamente.' });
    return;
  }
  // Revalida contra a lista — remoção de acesso tem efeito imediato.
  const role = await resolveRole(user.email);
  if (!role) {
    clearSession(res);
    res.status(403).json({ error: 'Seu acesso foi revogado. Fale com o administrador.' });
    return;
  }
  req.user = { ...user, role };
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  await requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Ação restrita a administradores.' });
      return;
    }
    next();
  });
}
