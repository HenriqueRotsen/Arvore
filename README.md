# Árvore da família Rotsen

Site colaborativo da árvore genealógica: qualquer pessoa pode ver a árvore; só administradores cadastram pessoas, vínculos **pai/mãe → filho** e cônjuges. Avós, netos, irmãos, tios e primos são calculados automaticamente.

## Como rodar

1. Instale o [Docker](https://docs.docker.com/get-docker/) e o Node.js 20+.
2. Copie o ambiente e ajuste a senha do admin:

```bash
cp .env.example .env
```

3. Suba o PostgreSQL, gere o banco e o primeiro admin:

```bash
npm install
npm run db:up
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

4. Abra [http://localhost:3000](http://localhost:3000). Se a 3000 já estiver em uso, o Next.js sobe na **3001** (ou a próxima livre) — use essa URL, não force a 3000.

Login padrão (local, definido no `.env`):

- e-mail: `admin@rotsen.local`
- senha: a que estiver em `ADMIN_PASSWORD`

## Como cadastrar a família

1. No **Painel**, crie as pessoas (nome, datas, foto opcional).
2. Vincule **pai ou mãe → filho**. Se a criança tem dois pais, faça o vínculo duas vezes.
3. Marque **cônjuge** quando quiser que o casal apareça junto (não é inferido só por terem filhos em comum).
4. A home centraliza a árvore automaticamente (gerações mais antigas primeiro). Dá para mudar com “Ver a partir de”.

## Variáveis

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | Postgres (`postgresql://rotsen:rotsen@localhost:5435/rotsen` no Docker local) |
| `AUTH_SECRET` | Segredo do login (`openssl rand -hex 32`) |
| `AUTH_URL` | Só em produção, se precisar forçar o domínio público. Em local, **não defina** — o login segue a porta em que o site está. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Primeiro admin (o seed cria ou atualiza) |

Fotos ficam em `public/uploads/`. Em produção, troque a senha do admin e o `AUTH_SECRET`.
