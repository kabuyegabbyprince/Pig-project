"use client";

type SignInResult = {
  ok: boolean;
  status: number;
  error: string | null;
  url: string | null;
};

async function fetchCsrfTokenWithRetry(attempts = 2): Promise<string> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch("/api/auth/csrf", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });
      if (!res.ok) {
        throw new Error(`CSRF endpoint returned HTTP ${res.status}`);
      }
      const data = (await res.json()) as { csrfToken?: string };
      if (data?.csrfToken) {
        return data.csrfToken;
      }
      throw new Error("Missing CSRF token in response");
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 180));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Unable to initialize secure sign-in session.");
}

export async function credentialsSignIn(params: {
  email: string;
  password: string;
  selectedRole: string;
}): Promise<SignInResult> {
  const csrfToken = await fetchCsrfTokenWithRetry(2);
  const callbackUrl = `${window.location.origin}/dashboard`;

  const body = new URLSearchParams({
    email: params.email,
    password: params.password,
    selectedRole: params.selectedRole,
    csrfToken,
    callbackUrl,
    json: "true",
  });

  const res = await fetch("/api/auth/callback/credentials", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });

  const data = (await res.json().catch(() => ({}))) as { url?: string };
  let error: string | null = null;
  if (data?.url) {
    try {
      error = new URL(data.url, window.location.origin).searchParams.get("error");
    } catch {
      error = null;
    }
  }

  return {
    ok: res.ok && !error,
    status: res.status,
    error,
    url: error ? null : (data?.url ?? callbackUrl),
  };
}

export async function performSignOut(callbackPath = "/login"): Promise<void> {
  try {
    const csrfToken = await fetchCsrfTokenWithRetry(2);
    const body = new URLSearchParams({
      csrfToken,
      callbackUrl: `${window.location.origin}${callbackPath}`,
      json: "true",
    });

    await fetch("/api/auth/signout", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
    });
  } catch {
    // Still redirect cleanly to login if session is already expired
  } finally {
    window.location.assign(callbackPath);
  }
}
