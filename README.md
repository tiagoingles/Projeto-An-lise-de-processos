# Análise de Processos SEI · GEMAP

Ferramenta interna da equipe da GEMAP para instrução de processos administrativos no SEI:
lê os autos (PDF ou texto), resume os fatos, cruza com o acervo de leis/pareceres e com o
banco de precedentes da unidade, e entrega a minuta de Despacho SEI pronta.

- **Front:** React 19 + Vite + TypeScript + Tailwind
- **Back:** Express (Node 22) — API + servidor da SPA
- **Banco:** PostgreSQL (Neon) via Drizzle ORM + pgvector
- **IA:** Gemini API (`@google/genai`) — uma única chave, configurada pelo administrador
- **Login:** e-mail + senha, contas geridas dentro do app (hash bcrypt, sessão em cookie httpOnly)
- **Hospedagem:** Render (o `render.yaml` já configura o serviço)

---

## Configuração (uma vez)

### 1. Banco — Neon

Crie um projeto grátis em [neon.tech](https://neon.tech) e copie a *connection string*
(`postgresql://…?sslmode=require`). Ela vira `DATABASE_URL`.

### 2. Chave da IA — Gemini

[aistudio.google.com](https://aistudio.google.com) → *Get API key*. O nível gratuito já
funciona para o piloto; para produção com dado público, use um projeto com faturamento
(tier pago — os prompts não são usados para treino).

### 3. Variáveis de ambiente

```bash
cp .env.example .env
```

Preencha: `DATABASE_URL`, `GEMINI_API_KEY`, `SESSION_SECRET` (`openssl rand -hex 32`),
`BOOTSTRAP_ADMIN_EMAIL` e `BOOTSTRAP_ADMIN_PASSWORD` (e-mail e senha da administradora).

### 4. Criar as tabelas

```bash
npm install
npm run db:migrate
```

Cria o schema, ativa a extensão `vector`, semeia os 9 temas padrão e autoriza o e-mail
do `BOOTSTRAP_ADMIN_EMAIL` como administrador.

### 5. Deploy no Render

[render.com](https://render.com) → *New +* → *Blueprint* → conecte este repositório
(branch `main`). O Render lê o `render.yaml` e pede os valores marcados como segredo:
`DATABASE_URL`, `GEMINI_API_KEY`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`
(o `SESSION_SECRET` é gerado automaticamente).

Quando ficar **Live**, abra a URL, faça login com o e-mail/senha de bootstrap, e cadastre
o resto da equipe em **Administração → Usuários** (nome, e-mail, senha inicial).

### 6. Migrar o acervo antigo

Em **Administração** (você já é admin), use o botão de importar backup (ícone de upload no
topo) apontando para o `sei_gemap_backup_*.json` da versão anterior. Depois, em
**Administração → Índice de busca**, clique em **Reindexar tudo**.

---

## Desenvolvimento

```bash
npm install
npm run dev       # http://localhost:3000  (front + API no mesmo processo)
npm run lint      # typecheck front + back
npm run build     # gera dist/
```

Precisa de um `.env` preenchido (o `DATABASE_URL` pode apontar direto para o Neon).

## Estrutura

```
server/
  env.ts              config central (única fonte de process.env)
  db/                 schema Drizzle, cliente pg, migrations, script de migração
  lib/                auth (senha + sessão JWT), cliente Gemini (retry/timeout/auditoria),
                      rag (pgvector), repos
  prompts/            instruções de sistema e schemas de resposta, versionáveis
  routes/             auth · admin · knowledge (CRUD) · ai (endpoints Gemini)
src/
  lib/                apiClient, auth (contexto React), data (camada de dados), toast, sample
  components/         UI — LoginScreen, AccountBar, AdminPage, ...
```

## Histórico

**Sprint 1 — fundação.** Login + lista de autorizados + sessão httpOnly. Acervo,
precedentes, temas e histórico saíram do `localStorage` para o Postgres compartilhado.
Trilha de auditoria (`usage_events`). `server.ts` monolítico quebrado em módulos; validação
Zod; cliente Gemini com retry e reparo de JSON. Tela de Administração. Importador de backup.

**Sprint 2 — inteligência.** RAG com pgvector (`rule_chunks`, `precedent_embeddings`): a
análise faz uma triagem barata do processo e recupera só os trechos relevantes, em vez de
mandar o acervo inteiro no prompt (fallback para "acervo completo" enquanto não há índice).
Files API para PDFs grandes. Streaming no chat e no progresso da análise.

**Sprint 3 — design e uso.** Sistema de design (Public Sans / IBM Plex Mono / Lora, paleta
institucional, cores semânticas de decisão). Progresso real na análise. Toasts no lugar de
`alert()`. Telas revisadas; minuta em serif.

**Pós-sprints.** Migração Cloud SQL/Cloud Run → Neon/Render (sem faturamento Google Cloud).
Login Google → e-mail + senha geridos no app (bcrypt).
