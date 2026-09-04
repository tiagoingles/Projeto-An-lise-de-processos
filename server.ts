import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import { env } from './server/env.js';
import { authRouter } from './server/routes/auth.js';
import { adminRouter } from './server/routes/admin.js';
import { knowledgeRouter } from './server/routes/knowledge.js';
import { aiRouter } from './server/routes/ai.js';

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// O client precisa do Client ID do Google para renderizar o botão de login.
app.get('/api/config', (_req, res) => {
  res.json({ googleClientId: env.googleClientId });
});

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api', knowledgeRouter);
app.use('/api', aiRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[server] erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno no servidor.' });
});

async function start() {
  if (!env.isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(env.port, '0.0.0.0', () => {
    console.log(`SEI GEMAP · servidor em http://localhost:${env.port}`);
  });
}

start().catch((err) => {
  console.error('[server] falha ao iniciar:', err);
  process.exit(1);
});
