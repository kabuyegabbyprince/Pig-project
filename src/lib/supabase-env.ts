export function pickValidSupabaseServerKey(): string | undefined {
  const candidates = [
    process.env.SUPABASE_SECRET_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  ]
    .map((v) => v?.trim())
    .filter((v): v is string => Boolean(v));

  if (candidates.length === 0) return undefined;

  return (
    candidates.find((c) => c.startsWith("sb_secret_") || c.startsWith("eyJ")) ??
    candidates[0]
  );
}

export function getSupabaseServerConfig(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key = pickValidSupabaseServerKey();
  if (!url || !key) return null;
  return { url, key };
}
