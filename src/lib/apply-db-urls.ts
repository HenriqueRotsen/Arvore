/** Monta DATABASE_URL / DIRECT_URL a partir da senha crua do Supabase. */
export function applySupabaseDbUrls() {
  const password = process.env.SUPABASE_DB_PASSWORD?.trim();
  if (!password) return;

  const ref =
    process.env.SUPABASE_PROJECT_REF?.trim() || "wxxpmjbfojuuysgshhim";
  const host =
    process.env.SUPABASE_POOLER_HOST?.trim() ||
    "aws-0-ca-central-1.pooler.supabase.com";
  const encoded = encodeURIComponent(password);

  process.env.DATABASE_URL = `postgresql://postgres.${ref}:${encoded}@${host}:6543/postgres?pgbouncer=true`;
  process.env.DIRECT_URL = `postgresql://postgres.${ref}:${encoded}@${host}:5432/postgres`;
}
