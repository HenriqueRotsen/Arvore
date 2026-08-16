import { spawnSync } from "node:child_process";

function applyFromPassword() {
  const password = process.env.SUPABASE_DB_PASSWORD?.trim();
  if (!password) return false;

  const ref =
    process.env.SUPABASE_PROJECT_REF?.trim() || "wxxpmjbfojuuysgshhim";
  const host =
    process.env.SUPABASE_POOLER_HOST?.trim() ||
    "aws-0-ca-central-1.pooler.supabase.com";
  const encoded = encodeURIComponent(password);

  process.env.DATABASE_URL = `postgresql://postgres.${ref}:${encoded}@${host}:6543/postgres?pgbouncer=true`;
  process.env.DIRECT_URL = `postgresql://postgres.${ref}:${encoded}@${host}:5432/postgres`;
  console.log(
    `URLs montadas a partir de SUPABASE_DB_PASSWORD (host=${host}, ref=${ref}).`,
  );
  return true;
}

function mask(url) {
  return url.replace(/:([^:@/]+)@/, ":***@");
}

function normalize(raw, name) {
  if (!raw) {
    throw new Error(`${name} não está definida no Vercel.`);
  }

  let url = raw.trim().replace(/^['"]+|['"]+$/g, "");

  if (/\[YOUR-PASSWORD\]/i.test(url) || /\[SENHA\]/i.test(url)) {
    throw new Error(
      `${name} ainda tem [YOUR-PASSWORD]. No Vercel, cole a senha do banco no lugar do placeholder.`,
    );
  }

  const schemeIdx = url.indexOf("://");
  if (schemeIdx === -1) {
    throw new Error(`${name} não parece uma URL postgres.`);
  }
  const scheme = url.slice(0, schemeIdx);
  const rest = url.slice(schemeIdx + 3);
  const at = rest.lastIndexOf("@");
  if (at === -1) {
    throw new Error(`${name} está sem @host.`);
  }

  const userinfo = rest.slice(0, at);
  let hostpart = rest.slice(at + 1);
  const colon = userinfo.indexOf(":");
  const user = colon === -1 ? userinfo : userinfo.slice(0, colon);
  const password = colon === -1 ? "" : userinfo.slice(colon + 1);
  let encodedPass = password;
  try {
    encodedPass = encodeURIComponent(decodeURIComponent(password));
  } catch {
    encodedPass = encodeURIComponent(password);
  }

  // ...host:6543?pgbouncer=true  (faltou /postgres)
  hostpart = hostpart.replace(
    /^([^/:?]+):(\d+)\?/,
    (_, host, port) => `${host}:${port}/postgres?`,
  );
  // ...host:6543  (faltou /banco)
  if (/^[^/]+:\d+$/.test(hostpart)) {
    hostpart = `${hostpart}/postgres`;
  }

  const next = `${scheme}://${user}:${encodedPass}@${hostpart}`;
  const parsed = new URL(next.replace(/^postgresql:/, "http:"));
  if (!parsed.port || Number.isNaN(Number(parsed.port))) {
    throw new Error(
      `${name}: porta inválida (${parsed.port || "vazia"}). URL reconhecida: ${mask(next)}`,
    );
  }

  console.log(
    `${name}: host=${parsed.hostname} port=${parsed.port} db=${parsed.pathname} ${parsed.search}`,
  );
  return next;
}

try {
  if (!applyFromPassword()) {
    process.env.DATABASE_URL = normalize(process.env.DATABASE_URL, "DATABASE_URL");
    process.env.DIRECT_URL = normalize(
      process.env.DIRECT_URL || process.env.DATABASE_URL,
      "DIRECT_URL",
    );
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: process.env,
  shell: true,
});
process.exit(result.status ?? 1);
