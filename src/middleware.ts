import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { getNextAuthSecret } from "@/lib/auth-secret";

const normalizeRole = (role?: string | null) => {
  if (!role) return "";
  const value = role.replace(/^ROLE_/, "").trim().toUpperCase();
  if (value === "ADMIN") return "SUPER_ADMIN";
  if (value === "FIELD_OFFICER") return "CELL_MANAGER";
  return value;
};

const SUPER_ADMIN_ONLY_PREFIXES = [
  "/dashboard/admin/settings",
  "/dashboard/admin/website",
  "/dashboard/admin/audit",
  "/dashboard/admin/security",
];

const FIELD_ROLES = new Set([
  "CELL_MANAGER",
  "COOPERATIVE_LEADER",
  "COOPERATIVE_MEMBER",
]);

const FINANCE_ROLES = new Set(["FINANCE_OFFICER"]);

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    const role = normalizeRole(typeof token?.role === "string" ? token.role : undefined);
    const isServerAction = req.method === "POST" && req.headers.has("next-action");

    const redirectResponse = (targetPath: string) => {
      if (isServerAction) {
        return new NextResponse("", {
          status: 200,
          headers: {
            "x-action-redirect": `${targetPath};push`,
            "content-type": "text/plain",
          },
        });
      }
      return NextResponse.redirect(new URL(targetPath, req.url));
    };

    if (path.startsWith("/dashboard") && !role) {
      return redirectResponse("/login");
    }

    if (path === "/dashboard") {
      if (role === "SUPER_ADMIN") {
        return redirectResponse("/dashboard/admin");
      }
      if (role === "PROJECT_MANAGER") {
        return redirectResponse("/dashboard/gebyian");
      }
      if (role === "VETERINARIAN") {
        return redirectResponse("/dashboard/vet");
      }
      if (FIELD_ROLES.has(role)) {
        return redirectResponse("/dashboard/field");
      }
      if (FINANCE_ROLES.has(role)) {
        return redirectResponse("/dashboard/finance");
      }
    }

    if (path.startsWith("/dashboard/gebyian")) {
      if (role !== "PROJECT_MANAGER" && role !== "SUPER_ADMIN") {
        return redirectResponse("/dashboard");
      }
    }

    if (path.startsWith("/dashboard/admin/users")) {
      const canCreateCoopUser =
        path === "/dashboard/admin/users/new" &&
        (role === "CELL_MANAGER" || role === "COOPERATIVE_LEADER");
      if (role !== "SUPER_ADMIN" && !canCreateCoopUser) {
        return redirectResponse("/dashboard");
      }
    }

    if (
      SUPER_ADMIN_ONLY_PREFIXES.some((prefix) => path.startsWith(prefix)) &&
      role !== "SUPER_ADMIN"
    ) {
      return redirectResponse("/dashboard");
    }

    if (path.startsWith("/dashboard/admin/ecommerce")) {
      if (role !== "SUPER_ADMIN" && role !== "PROJECT_MANAGER") {
        return redirectResponse("/dashboard");
      }
    } else if (path.startsWith("/dashboard/admin/notifications")) {
      // Allowed for all active authenticated staff roles
    } else if (path.startsWith("/dashboard/admin/reports")) {
      if (role !== "SUPER_ADMIN" && role !== "FINANCE_OFFICER") {
        return redirectResponse("/dashboard");
      }
    } else if (
      path.startsWith("/dashboard/admin") &&
      !path.startsWith("/dashboard/admin/users")
    ) {
      if (role !== "SUPER_ADMIN") {
        return redirectResponse("/dashboard");
      }
    }

    if (
      (path.startsWith("/dashboard/team") ||
        path.startsWith("/dashboard/gallery") ||
        path.startsWith("/dashboard/stories")) &&
      role !== "SUPER_ADMIN"
    ) {
      return redirectResponse("/dashboard");
    }

    if (
      path.startsWith("/dashboard/vet") &&
      role !== "VETERINARIAN" &&
      role !== "SUPER_ADMIN"
    ) {
      return redirectResponse("/dashboard");
    }

    if (
      path.startsWith("/dashboard/field") &&
      !FIELD_ROLES.has(role) &&
      role !== "SUPER_ADMIN"
    ) {
      return redirectResponse("/dashboard");
    }

    if (
      path.startsWith("/dashboard/finance") &&
      !FINANCE_ROLES.has(role) &&
      role !== "SUPER_ADMIN"
    ) {
      return redirectResponse("/dashboard");
    }
  },
  {
    secret: getNextAuthSecret(),
    cookies: {
      sessionToken: {
        name: "next-auth.session-token",
      },
    },
    pages: {
      signIn: "/login",
    },
    callbacks: {
      authorized: ({ req, token }) => {
        if (req.method === "POST" && req.headers.has("next-action")) {
          return true;
        }
        if (req.nextUrl.pathname.startsWith("/dashboard")) {
          return !!token;
        }
        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*"],
};

