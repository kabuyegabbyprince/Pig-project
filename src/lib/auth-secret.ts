import { pickValidSupabaseServerKey } from "@/lib/supabase-env";

/**
 * Returns a consistent NextAuth JWT secret across both Node API routes and Edge Middleware.
 * Falls back cleanly to server-side Supabase credentials if NEXTAUTH_SECRET is omitted in .env.
 */
export function getNextAuthSecret(): string {
  const configured =
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    pickValidSupabaseServerKey();

  if (configured) {
    return configured;
  }

  return "abafashamyumvire-pig-project-jwt-signing-key-2026";
}
