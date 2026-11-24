"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

export function AuthProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session?: Session | null;
}) {
  return (
    <SessionProvider
      basePath="/api/auth"
      session={session}
      refetchOnWindowFocus={false}
      refetchWhenOffline={false}
      refetchInterval={0}
    >
      {children}
    </SessionProvider>
  );
}
