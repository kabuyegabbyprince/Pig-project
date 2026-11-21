import "server-only";

export type SupabaseAuthUser = {
  id: string;
  email?: string;
  phone?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
  banned_until?: string | null;
};

type SupabaseAuthConfig = {
  url: string;
  serviceKey: string;
  anonKey: string;
};

function getSupabaseAuthConfig(): SupabaseAuthConfig | null {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    "";
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim() || serviceKey;
  if (!url || !serviceKey) return null;
  return { url, serviceKey, anonKey };
}

export async function findSupabaseAuthUserByEmail(
  email: string
): Promise<SupabaseAuthUser | null> {
  const cfg = getSupabaseAuthConfig();
  if (!cfg) return null;

  const target = email.trim().toLowerCase();
  if (!target) return null;

  try {
    for (let page = 1; page <= 10; page++) {
      const res = await fetch(
        `${cfg.url}/auth/v1/admin/users?page=${page}&per_page=200`,
        {
          method: "GET",
          headers: {
            apikey: cfg.serviceKey,
            Authorization: `Bearer ${cfg.serviceKey}`,
          },
          cache: "no-store",
        }
      );

      if (!res.ok) return null;
      const data = (await res.json()) as { users?: SupabaseAuthUser[] };
      const users = Array.isArray(data.users) ? data.users : [];
      const found = users.find(
        (u) => typeof u.email === "string" && u.email.trim().toLowerCase() === target
      );
      if (found) return found;
      if (users.length < 200) break;
    }
  } catch (err) {
    console.error("Failed to query Supabase Auth users:", err);
  }

  return null;
}

export async function createSupabaseAuthUser(input: {
  email: string;
  password: string;
  name: string;
  role: string;
  phone?: string | null;
  publicUserId?: string;
}): Promise<{
  ok: boolean;
  duplicate?: boolean;
  user?: SupabaseAuthUser;
  error?: string;
}> {
  const cfg = getSupabaseAuthConfig();
  if (!cfg) {
    return { ok: false, error: "Supabase Auth is not configured." };
  }

  const email = input.email.trim().toLowerCase();

  try {
    const res = await fetch(`${cfg.url}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        apikey: cfg.serviceKey,
        Authorization: `Bearer ${cfg.serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password: input.password,
        email_confirm: true,
        user_metadata: {
          name: input.name,
          full_name: input.name,
          role: input.role,
          phone: input.phone ?? null,
          public_user_id: input.publicUserId ?? null,
        },
        app_metadata: {
          role: input.role,
        },
      }),
      cache: "no-store",
    });

    const text = await res.text();
    let parsed: Record<string, unknown> = {};
    try {
      parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      parsed = { message: text };
    }

    if (!res.ok) {
      const msg = String(parsed.msg || parsed.message || parsed.error_description || text);
      const duplicate =
        res.status === 422 && /already|exists|registered/i.test(msg);
      return { ok: false, duplicate, error: msg };
    }

    return { ok: true, user: parsed as unknown as SupabaseAuthUser };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Supabase Auth error";
    return { ok: false, error: message };
  }
}

export async function verifySupabaseAuthPassword(
  email: string,
  password: string
): Promise<SupabaseAuthUser | null> {
  const cfg = getSupabaseAuthConfig();
  if (!cfg) return null;

  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password) return null;

  try {
    const res = await fetch(`${cfg.url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: cfg.anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: cleanEmail,
        password,
      }),
      cache: "no-store",
    });

    if (!res.ok) return null;
    const data = (await res.json()) as { user?: SupabaseAuthUser };
    return data.user ?? null;
  } catch (err) {
    console.error("Supabase password verification failed:", err);
    return null;
  }
}

export async function syncSupabaseAuthUser(input: {
  email: string;
  password?: string;
  name?: string;
  role?: string;
  phone?: string | null;
  publicUserId?: string;
  isActive?: boolean;
}): Promise<void> {
  const cfg = getSupabaseAuthConfig();
  if (!cfg) return;

  const email = input.email.trim().toLowerCase();
  if (!email) return;

  try {
    const existing = await findSupabaseAuthUserByEmail(email);
    if (!existing) {
      if (input.password) {
        await createSupabaseAuthUser({
          email,
          password: input.password,
          name: input.name || "System User",
          role: input.role || "COOPERATIVE_MEMBER",
          phone: input.phone ?? null,
          publicUserId: input.publicUserId,
        });
      }
      return;
    }

    const body: Record<string, unknown> = {
      email_confirm: true,
    };

    if (input.password) {
      body.password = input.password;
    }

    const nextUserMeta: Record<string, unknown> = {
      ...(existing.user_metadata ?? {}),
    };
    if (input.name !== undefined) {
      nextUserMeta.name = input.name;
      nextUserMeta.full_name = input.name;
    }
    if (input.role !== undefined) {
      nextUserMeta.role = input.role;
      body.app_metadata = {
        ...(existing.app_metadata ?? {}),
        role: input.role,
      };
    }
    if (input.phone !== undefined) {
      nextUserMeta.phone = input.phone;
    }
    if (input.publicUserId !== undefined) {
      nextUserMeta.public_user_id = input.publicUserId;
    }
    body.user_metadata = nextUserMeta;

    if (typeof input.isActive === "boolean") {
      body.ban_duration = input.isActive ? "none" : "876000h";
    }

    const res = await fetch(`${cfg.url}/auth/v1/admin/users/${existing.id}`, {
      method: "PUT",
      headers: {
        apikey: cfg.serviceKey,
        Authorization: `Bearer ${cfg.serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Failed to sync Supabase Auth user:", errText);
    }
  } catch (err) {
    console.error("Error syncing Supabase Auth user:", err);
  }
}

export async function deleteSupabaseAuthUserByEmail(email: string): Promise<void> {
  const cfg = getSupabaseAuthConfig();
  if (!cfg) return;

  try {
    const existing = await findSupabaseAuthUserByEmail(email);
    if (!existing) return;

    const res = await fetch(`${cfg.url}/auth/v1/admin/users/${existing.id}`, {
      method: "DELETE",
      headers: {
        apikey: cfg.serviceKey,
        Authorization: `Bearer ${cfg.serviceKey}`,
      },
      cache: "no-store",
    });

    if (!res.ok && res.status !== 404) {
      const errText = await res.text();
      console.error("Failed to delete Supabase Auth user:", errText);
    }
  } catch (err) {
    console.error("Error deleting Supabase Auth user:", err);
  }
}
