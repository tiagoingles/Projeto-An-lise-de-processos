# Análise de Processos SEI · GEMAP

Ferramenta interna da equipe da GEMAP para instrução de processos administrativos no SEI:
lê os autos (PDF ou texto), resume os fatos, cruza com o acervo de leis/pareceres e com o
banco de precedentes da unidade, e entrega a minuta de Despacho SEI pronta.

- **Front:** React 19 + Vite + TypeScript + Tailwind
- **Back:** Express (Node 22) — API + servидor da SPA
- **Banco:** PostgreSQL (Cloud SQL) via Drizzle ORM
- **IA:** Gemini API (`@google/genai`) — uma única chave, configurada pelo administrador
- **Login:** Google OAuth restrito a uma lista de e-mails autorizados
- **Hospedagem:** Cloud Run + Cloud SQL

---

## Checklist de configuração (uma vez)

Tudo abaixo é feito **por você (Tiago)** na conta Google da GEMAP. A equipe só faz login.

### 1. Banco — Cloud SQL

```bash
gcloud sql instances create sei-gemap-db \
  --database-version=POSTGRES_16 --tier=db-f1-micro --region=us-central1
gcloud sql databases create sei_gemap --instance=sei-gemap-db
gcloud sql users set-password postgres --instance=sei-gemap-db --password=UMA_SENHA_FORTE
```

Anote o **Instance connection name** (`projeto:us-central1:sei-gemap-db`).

### 2. Chave da Gemini

Em [aistudio.google.com](https://aistudio.google.com) → **Get API key** → criar chave num
projeto com **faturamento ativo** (tier pago — os prompts não são usados para treino).
Defina um **teto de gasto** no projeto do Google Cloud.

### 3. Credencial OAuth

[console.cloud.google.com](https://console.cloud.google.com) → **APIs e serviços → Credenciais**
→ *Criar credenciais → ID do cliente OAuth → Aplicativo da Web*.

- Origens JavaScript autorizadas: `http://localhost:3000` e a URL do Cloud Run
- Anote o **Client ID** (`xxxx.apps.googleusercontent.com`)

### 4. Variáveis de ambiente

```bash
cp .env.example .env
# preencha GEMINI_API_KEY, GOOGLE_CLIENT_ID, SESSION_SECRET (openssl rand -hex 32),
# BOOTSTRAP_ADMIN_EMAIL (e-mail da sua esposa) e a conexão do banco.
```

### 5. Criar as tabelas

```bash
npm install
npm run db:migrate
```

Isso cria o schema, os 9 temas padrão e marca `BOOTSTRAP_ADMIN_EMAIL` como administrador.

### 6. Migrar o acervo atual

Entre no app, vá em **Administração → Usuários** (você já é admin) e depois use o botão de
importar backup (ícone de upload no topo) apontando para o `sei_gemap_backup_*.json`
exportado da versão antiga. Regras, precedentes e temas entram na base compartilhada.

### 7. Deploy

```bash
gcloud run deploy sei-gemap \
  --source . --region us-central1 --allow-unauthenticated \
  --add-cloudsql-instances=projeto:us-central1:sei-gemap-db \
  --set-env-vars="INSTANCE_CONNECTION_NAME=projeto:us-central1:sei-gemap-db,DB_USER=postgres,DB_NAME=sei_gemap" \
  --set-secrets="GEMINI_API_KEY=gemini-key:latest,GOOGLE_CLIENT_ID=google-client-id:latest,SESSION_SECRET=session-secret:latest,DB_PASSWORD=db-password:latest"
```

(`--allow-unauthenticated` porque o controle de acesso é feito pelo login Google + lista de
e-mails, não pelo IAM do Cloud Run.)

---

## Desenvolvimento

```bash
npm install
npm run dev       # http://localhost:3000  (front + API no mesmo processo)
npm run lint      # typecheck front + back
npm run build     # gera dist/
```

Precisa de um Postgres local (ou o Cloud SQL Auth Proxy) e um `.env` preenchido.

## Estrutura

```
server/
  env.ts              config central (única fonte de process.env)
  db/                 schema Drizzle, cliente pg, migrations, script de migração
  lib/                auth (Google + sessão JWT), cliente Gemini (retry/timeout/auditoria), repos
  prompts/            instruções de sistema e schemas de resposta, versionáveis
  routes/             auth · admin · knowledge (CRUD) · ai (5 endpoints Gemini)
src/
  lib/                apiClient, auth (contexto React), data (camada de dados), sample
  components/         UI — inclui LoginScreen, AccountBar, AdminPage (novos)
```

## O que mudou nesta fase (Sprint 1)

- Login Google + lista de autorizados + sessão em cookie httpOnly
- Acervo, precedentes, temas e histórico saíram do `localStorage` para o Postgres compartilhado
- Trilha de auditoria: toda chamada à IA grava `usage_events` (quem, quando, tokens, status)
- `server.ts` de 950 linhas quebrado em módulos; validação Zod; cliente Gemini com retry e reparo de JSON
- Tela de Administração: gerenciar e-mails autorizados + painel de uso da equipe
- Importador do backup antigo
