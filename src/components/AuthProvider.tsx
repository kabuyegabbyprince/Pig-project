"use client";

import { createContext, useContext, useMemo } from "react";
import type { Session } from "next-auth";

type AuthSessionContextValue = {
  data: Session | null;
  status: "authenticated" | "unauthenticated";
};

const AuthSessionContext = createContext<AuthSessionContextValue>({
  data: null,
  status: "unauthenticated",
});

export function useAuthSession() {
  return useContext(AuthSessionContext);
}

export function AuthProvider({
  children,
  session = null,
}: {
  children: React.ReactNode;
  session?: Session | null;
}) {
  const value = useMemo<AuthSessionContextValue>(
    () => ({
      data: session ?? null,
      status: session ? "authenticated" : "unauthenticated",
    }),
    [session]
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}
