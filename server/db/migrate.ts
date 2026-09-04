import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool, schema } from './client.js';
import { env } from '../env.js';

/**
 * Aplica as migrations pendentes e garante o admin de bootstrap.
 * Rode com:  npm run db:migrate
 */
async function main() {
  console.log('[migrate] aplicando migrations...');
  await migrate(db, { migrationsFolder: 'server/db/migrations' });
  console.log('[migrate] schema atualizado.');

  const DEFAULT_THEMES = [
    'Contratações Públicas e Terceirização',
    'Reajuste, Repactuação e Equilíbrio Econômico',
    'Gestão de Pessoas e Benefícios',
    'Diárias, Passagens e Deslocamentos',
    'Fiscalização Contratual e Penalidades',
    'Dispensa e Inexigibilidade de Licitação',
    'Patrimônio e Suprimento de Fundos',
    'Processo Administrativo Disciplinar / Sindicância',
    'Convênios e Termos de Execução Descentralizada',
  ];
  await db
    .insert(schema.themes)
    .values(DEFAULT_THEMES.map((name, i) => ({ name, sortOrder: i })))
    .onConflictDoNothing();
  console.log(`[migrate] ${DEFAULT_THEMES.length} temas padrão garantidos.`);

  if (env.bootstrapAdminEmail) {
    await db
      .insert(schema.allowedUsers)
      .values({
        email: env.bootstrapAdminEmail,
        role: 'admin',
        note: 'Admin de bootstrap (BOOTSTRAP_ADMIN_EMAIL)',
      })
      .onConflictDoUpdate({
        target: schema.allowedUsers.email,
        set: { role: 'admin' },
      });
    console.log(`[migrate] admin garantido: ${env.bootstrapAdminEmail}`);
  } else {
    console.warn('[migrate] BOOTSTRAP_ADMIN_EMAIL não definido — nenhum admin criado.');
  }

  await pool.end();
  console.log('[migrate] concluído.');
}

main().catch((err) => {
  console.error('[migrate] falhou:', err);
  process.exit(1);
});
