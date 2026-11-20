import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { Role } from "@prisma/client";
import { getPhoneLookupCandidates } from "@/lib/phone-utils";
import { getNextAuthSecret } from "@/lib/auth-secret";
import { verifySupabaseAuthPassword } from "@/lib/supabase-auth";
import { getBootstrapStatus, SUPER_ADMIN_BOOTSTRAPPED_KEY } from "@/lib/auth-bootstrap";

const validRoles = [
  Role.SUPER_ADMIN,
  Role.PROJECT_MANAGER,
  Role.COOPERATIVE_LEADER,
  Role.COOPERATIVE_MEMBER,
  Role.CELL_MANAGER,
  Role.VETERINARIAN,
  Role.ACCOUNTANT,
  Role.FIELD_OFFICER,
  Role.FINANCE_OFFICER,
  Role.TRAINER,
  Role.FUNDER,
];

const normalizeRole = (role?: string | null): Role | "" => {
  if (!role) return "";
  const cleanRole = role.replace(/^ROLE_/, "");
  if (cleanRole === "ADMIN") return Role.SUPER_ADMIN;
  return validRoles.includes(cleanRole as Role) ? (cleanRole as Role) : "";
};

type BackendLoginResponse = {
  success?: boolean;
  data?: {
    email?: string;
    name?: string;
    role?: string;
    token?: string;
  };
};

export const authOptions: NextAuthOptions = {
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        secure: true,
      },
    },
    callbackUrl: {
      name: "next-auth.callback-url",
      options: {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        secure: true,
      },
    },
    csrfToken: {
      name: "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        secure: true,
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email or Telephone", type: "text" },
        password: { label: "Password", type: "password" },
        selectedRole: { label: "Staff Role", type: "text" },
      },
      async authorize(credentials) {
        const rawIdentifier = String(credentials?.email || "").trim();
        const cleanEmail = rawIdentifier.toLowerCase();
        const cleanPassword = String(credentials?.password || "");
        const rawSelectedRole = String(credentials?.selectedRole || "").trim();

        if (!rawIdentifier || !cleanPassword) {
          return null;
        }

        const isEmail = rawIdentifier.includes("@");
        const localUser = isEmail
          ? await prisma.user.findUnique({
              where: { email: cleanEmail },
            })
          : await prisma.user.findFirst({
              where: {
                OR: getPhoneLookupCandidates(rawIdentifier).map((p) => ({ phone: p })),
              },
            });

        if (localUser) {
          if (!localUser.isActive || localUser.deletedAt) {
            return null;
          }

          const passwordMatches = await bcrypt.compare(
            cleanPassword,
            localUser.password,
          );
          const legacyPasswordMatches =
            !passwordMatches && cleanPassword !== cleanPassword.trim()
              ? await bcrypt.compare(cleanPassword.trim(), localUser.password)
              : false;

          let authed = passwordMatches || legacyPasswordMatches;

          // Fallback: if password was updated directly inside Supabase Authentication, verify via auth.users and sync hash
          if (!authed) {
            const supaUser = await verifySupabaseAuthPassword(localUser.email, cleanPassword);
            if (supaUser) {
              try {
                const syncedHash = await bcrypt.hash(cleanPassword, 10);
                await prisma.user.update({
                  where: { id: String(localUser.id) },
                  data: { password: syncedHash },
                });
                authed = true;
              } catch (syncErr) {
                console.error("Failed to sync updated Supabase Auth password:", syncErr);
              }
            }
          }

          if (!authed) {
            return null;
          }

          // Credentials verified! Now verify role routing:
          const userRole = normalizeRole(localUser.role);

          // If the credential is the one of admin, handle it automatically:
          if (userRole === Role.SUPER_ADMIN) {
            return {
              id: String(localUser.id),
              email: localUser.email,
              name: localUser.name,
              role: localUser.role,
              accessLevel: localUser.accessLevel,
              assignedDistrictId: localUser.assignedDistrictId,
              assignedSectorId: localUser.assignedSectorId,
              assignedCellId: localUser.assignedCellId,
              assignedVillageId: localUser.assignedVillageId,
            };
          }

          // For non-admin staff, user must select their assigned role:
          if (!rawSelectedRole) {
            throw new Error("ROLE_REQUIRED");
          }

          const normSelected = normalizeRole(rawSelectedRole);
          if (normSelected !== userRole) {
            throw new Error(`ROLE_MISMATCH:${localUser.role}`);
          }

          return {
            id: String(localUser.id),
            email: localUser.email,
            name: localUser.name,
            role: localUser.role,
            accessLevel: localUser.accessLevel,
            assignedDistrictId: localUser.assignedDistrictId,
            assignedSectorId: localUser.assignedSectorId,
            assignedCellId: localUser.assignedCellId,
            assignedVillageId: localUser.assignedVillageId,
          };
        }

        // Direct Supabase Auth user lookup (e.g. account created directly in Supabase Authentication UI)
        if (!localUser && isEmail) {
          const supaUser = await verifySupabaseAuthPassword(cleanEmail, cleanPassword);
          if (supaUser) {
            const { isFirstSuperAdminAvailable } = await getBootstrapStatus();
            const meta = supaUser.user_metadata ?? {};
            const metaRole = normalizeRole(
              typeof meta.role === "string"
                ? meta.role
                : typeof supaUser.app_metadata?.role === "string"
                  ? supaUser.app_metadata.role
                  : undefined
            );
            const assignedRole =
              metaRole || (isFirstSuperAdminAvailable ? Role.SUPER_ADMIN : Role.FIELD_OFFICER);
            const fullName =
              typeof meta.full_name === "string" && meta.full_name.trim()
                ? meta.full_name.trim()
                : typeof meta.name === "string" && meta.name.trim()
                  ? meta.name.trim()
                  : cleanEmail.split("@")[0];
            const phone =
              typeof meta.phone === "string" && meta.phone.trim()
                ? meta.phone.trim()
                : supaUser.phone || null;

            const syncedPublicUser = await prisma.user.create({
              data: {
                email: cleanEmail,
                name: fullName,
                phone,
                password: await bcrypt.hash(cleanPassword, 10),
                role: assignedRole,
                isActive: true,
              },
            });

            if (isFirstSuperAdminAvailable) {
              await prisma.systemSetting.upsert({
                where: { key: SUPER_ADMIN_BOOTSTRAPPED_KEY },
                create: {
                  key: SUPER_ADMIN_BOOTSTRAPPED_KEY,
                  value: "true",
                  description: "Tracks whether the initial Super Admin has claimed master control.",
                  updatedById: String(syncedPublicUser.id),
                },
                update: {
                  value: "true",
                  updatedById: String(syncedPublicUser.id),
                },
              });
            }

            if (assignedRole !== Role.SUPER_ADMIN) {
              if (!rawSelectedRole) {
                throw new Error("ROLE_REQUIRED");
              }
              const normSelected = normalizeRole(rawSelectedRole);
              if (normSelected !== assignedRole) {
                throw new Error(`ROLE_MISMATCH:${assignedRole}`);
              }
            }

            return {
              id: String(syncedPublicUser.id),
              email: syncedPublicUser.email,
              name: syncedPublicUser.name,
              role: syncedPublicUser.role,
              accessLevel: syncedPublicUser.accessLevel,
              assignedDistrictId: syncedPublicUser.assignedDistrictId,
              assignedSectorId: syncedPublicUser.assignedSectorId,
              assignedCellId: syncedPublicUser.assignedCellId,
              assignedVillageId: syncedPublicUser.assignedVillageId,
            };
          }
        }

        if (process.env.BACKEND_URL) {
          const backendUrl = process.env.BACKEND_URL.replace(/\/+$/, "");
          let res: Response;

          try {
            res = await fetch(`${backendUrl}/api/auth/login`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                email: cleanEmail,
                password: cleanPassword,
              }),
            });
          } catch {
            console.error("Authentication backend request failed.");
            return null;
          }

          if (!res.ok) {
            return null;
          }

          const result = (await res.json()) as BackendLoginResponse;
          const user = result?.data;
          if (!result?.success || !user) {
            return null;
          }

          const email = String(user.email || cleanEmail).trim().toLowerCase();
          const role = normalizeRole(user.role) || Role.FIELD_OFFICER;
          const mappedUser = await prisma.user.upsert({
            where: { email },
            update: {
              name: user.name || user.email || "System User",
              role,
              isActive: true,
              deletedAt: null,
            },
            create: {
              name: user.name || user.email || "System User",
              email,
              password: await bcrypt.hash(randomUUID(), 10),
              role,
              isActive: true,
            },
          });

          return {
            id: String(mappedUser.id),
            email,
            name: mappedUser.name,
            role,
            accessLevel: mappedUser.accessLevel,
            assignedDistrictId: mappedUser.assignedDistrictId,
            assignedSectorId: mappedUser.assignedSectorId,
            assignedCellId: mappedUser.assignedCellId,
            assignedVillageId: mappedUser.assignedVillageId,
            token: user.token,
          };
        }

        return null;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = String(user.id);
        token.role = normalizeRole(user.role);
        token.accessToken = user.token;
        token.accessLevel = user.accessLevel;
        token.assignedDistrictId = user.assignedDistrictId;
        token.assignedSectorId = user.assignedSectorId;
        token.assignedCellId = user.assignedCellId;
        token.assignedVillageId = user.assignedVillageId;
        return token;
      }

      if (token?.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: String(token.id) },
            select: { role: true, isActive: true, deletedAt: true, name: true },
          });
          if (!dbUser || !dbUser.isActive || dbUser.deletedAt) {
            token.role = "";
          } else {
            token.role = normalizeRole(dbUser.role);
            token.name = dbUser.name;
          }
        } catch {
          // Preserve existing token claims if database is temporarily unreachable
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? "");
        session.user.role = normalizeRole(String(token.role ?? ""));
        session.accessToken = token.accessToken;
        session.user.accessLevel = String(token.accessLevel ?? "ALL");
        session.user.assignedDistrictId = token.assignedDistrictId ?? null;
        session.user.assignedSectorId = token.assignedSectorId ?? null;
        session.user.assignedCellId = token.assignedCellId ?? null;
        session.user.assignedVillageId = token.assignedVillageId ?? null;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  events: {
    async signIn({ user }) {
      if (user?.id) {
        try {
          const userId = String(user.id);
          const userRole = "role" in user && user.role ? String(user.role) : null;
          await prisma.auditLog.create({
            data: {
              userId,
              role: userRole,
              action: "LOGIN",
              entity: "AUTH",
              entityId: userId,
              newValue: {
                email: user.email,
                name: user.name,
              },
            },
          });
        } catch (err) {
          console.error("Failed to record login audit log:", err);
        }
      }
    },
  },
  secret: getNextAuthSecret(),
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
