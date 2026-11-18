/**
 * Returns a consistent NextAuth JWT secret across both Node API routes and Edge Middleware.
 * Falls back cleanly to server-side Supabase credentials if NEXTAUTH_SECRET is omitted in .env.
 */
export function getNextAuthSecret(): string {
  const configured =
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (configured) {
    return configured;
  }

  return "abafashamyumvire-pig-project-jwt-signing-key-2026";
}
