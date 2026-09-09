import dotenv from 'dotenv';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';
const pendingVars: string[] = [];

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '' || value.startsWith('MY_')) {
    // Em produção, falha na hora. Durante o setup local (ex.: rodar as migrations
    // antes de ter a chave da IA), apenas avisa e segue.
    if (isProd) {
      throw new Error(
        `Variável de ambiente obrigatória ausente: ${name}. Configure os secrets no Render (ou no .env).`,
      );
    }
    pendingVars.push(name);
    return `__pendente_${name}__`;
  }
  return value.trim();
}

function optional(name: string, fallback = ''): string {
  return (process.env[name] || fallback).trim();
}

/**
 * Configuração central. Tudo que o servidor precisa vem daqui — nunca leia
 * process.env espalhado pelo código.
 */
export const env = {
  isProd,
  port: Number(process.env.PORT || 3000),

  /** Chave única da Gemini API (tier pago). Configurada pelo administrador. */
  geminiApiKey: required('GEMINI_API_KEY'),
  geminiModel: optional('GEMINI_MODEL', 'gemini-3.8-flash'),
  geminiEmbeddingModel: optional('GEMINI_EMBEDDING_MODEL', 'text-embedding-004'),

  /** OAuth do Google — o mesmo Client ID é usado no front (VITE_GOOGLE_CLIENT_ID). */
  googleClientId: required('GOOGLE_CLIENT_ID'),

  /** Segredo para assinar o cookie de sessão (JWT). Gere com: openssl rand -hex 32 */
  sessionSecret: required('SESSION_SECRET'),
  sessionDays: Number(optional('SESSION_DAYS', '7')),

  /**
   * Conexão com o Postgres.
   * - Local / Neon / proxy: use DATABASE_URL (postgres://user:pass@host:5432/db).
   * - Cloud Run + Cloud SQL: informe INSTANCE_CONNECTION_NAME + DB_USER/DB_PASS/DB_NAME
   *   e a conexão usa o socket unix /cloudsql/<instance>.
   */
  databaseUrl: optional('DATABASE_URL'),
  cloudSql: {
    instance: optional('INSTANCE_CONNECTION_NAME'),
    user: optional('DB_USER', 'postgres'),
    password: optional('DB_PASSWORD'),
    name: optional('DB_NAME', 'sei_gemap'),
  },

  /**
   * E-mail que vira admin automaticamente no primeiro login (bootstrap).
   * Depois disso, admins gerenciam a lista pela tela de administração.
   */
  bootstrapAdminEmail: optional('BOOTSTRAP_ADMIN_EMAIL').toLowerCase(),
} as const;

if (pendingVars.length > 0) {
  console.warn(
    `[env] variáveis ainda não configuradas (ok durante o setup): ${pendingVars.join(', ')}`,
  );
}

export function resolvePgConfig() {
  if (env.cloudSql.instance) {
    return {
      host: `/cloudsql/${env.cloudSql.instance}`,
      user: env.cloudSql.user,
      password: env.cloudSql.password,
      database: env.cloudSql.name,
    };
  }
  if (env.databaseUrl) {
    return {
      connectionString: env.databaseUrl,
      ssl: env.databaseUrl.includes('localhost') ? undefined : { rejectUnauthorized: false },
    };
  }
  throw new Error(
    'Nenhuma configuração de banco encontrada. Defina DATABASE_URL ou INSTANCE_CONNECTION_NAME.',
  );
}
