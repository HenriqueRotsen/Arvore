# Árvore da família Rotsen

Site colaborativo da árvore genealógica: qualquer pessoa pode ver e cadastrar parentes. Avós, netos, irmãos, tios e primos são calculados automaticamente.

## Como rodar (local)

1. Instale o [Docker](https://docs.docker.com/get-docker/) e o Node.js 20+.
2. Copie o ambiente:

```bash
cp .env.example .env
```

3. Suba o PostgreSQL e o app:

```bash
npm install
npm run db:up
npx prisma migrate dev
npm run db:seed
npm run dev
```

4. Abra [http://localhost:3000](http://localhost:3000).

## Como cadastrar a família

1. Em **Pessoas**, crie quem faltar (nome, datas, foto opcional).
2. Na ficha, vincule **pai ou mãe → filho** e **casamentos**.
3. Na **Árvore**, clique em duas pessoas para ver o grau de parentesco.

## Deploy (Vercel + Supabase)

1. Crie um projeto Postgres no [Supabase](https://supabase.com).
2. Em **Project Settings → Database**, copie:
   - **Connection pooling (Transaction)** → `DATABASE_URL` (porta **6543**, com `?pgbouncer=true`)
   - **Direct / Session** → `DIRECT_URL` (porta **5432**)
3. Em **Project Settings → API**, copie `SUPABASE_URL` e `service_role` (`SUPABASE_SERVICE_ROLE_KEY`).
4. No SQL Editor, rode `supabase/storage.sql` para o bucket público `photos`.
5. No [Vercel](https://vercel.com), importe o repositório [HenriqueRotsen/Arvore](https://github.com/HenriqueRotsen/Arvore) e defina:

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | Pooler do Supabase (`6543`, `pgbouncer=true`) |
| `DIRECT_URL` | Conexão direta/sessão do Supabase (`5432`) — migrations |
| `SUPABASE_URL` | URL do projeto (`https://xxxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave `service_role` (fotos no Storage) |
| `CRON_SECRET` | Segredo do ping diário (`openssl rand -hex 32`) |
| `AUTH_SECRET` | Segredo interno (`openssl rand -hex 32`) |

O build roda `prisma migrate deploy`. Um **cron diário** (`0 8 * * *`) chama `/api/keep-alive` e faz um `COUNT` em `Person`, para o projeto gratuito do Supabase não pausar por inatividade.

## Variáveis (local)

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | Postgres local (`localhost:5435`) ou pooler do Supabase |
| `DIRECT_URL` | Mesmo valor no Docker; no Supabase, a URL direta |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Fotos no Storage (produção) |
| `CRON_SECRET` | Autoriza o cron do Vercel |
| `AUTH_SECRET` | Segredo interno |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Seed legado do primeiro usuário |

Fotos em local ficam em `public/uploads/`. No Vercel, vão para o bucket `photos` do Supabase.
