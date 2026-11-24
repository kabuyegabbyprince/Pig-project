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

    if (path.startsWith("/dashboard") && !role) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (path === "/dashboard") {
      if (role === "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/dashboard/admin", req.url));
      }
      if (role === "PROJECT_MANAGER") {
        return NextResponse.redirect(new URL("/dashboard/gebyian", req.url));
      }
      if (role === "VETERINARIAN") {
        return NextResponse.redirect(new URL("/dashboard/vet", req.url));
      }
      if (FIELD_ROLES.has(role)) {
        return NextResponse.redirect(new URL("/dashboard/field", req.url));
      }
      if (FINANCE_ROLES.has(role)) {
        return NextResponse.redirect(new URL("/dashboard/finance", req.url));
      }
    }

    if (path.startsWith("/dashboard/gebyian")) {
      if (role !== "PROJECT_MANAGER" && role !== "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    if (path.startsWith("/dashboard/admin/users")) {
      const canCreateCoopUser =
        path === "/dashboard/admin/users/new" &&
        (role === "CELL_MANAGER" || role === "COOPERATIVE_LEADER");
      if (role !== "SUPER_ADMIN" && !canCreateCoopUser) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    if (SUPER_ADMIN_ONLY_PREFIXES.some((prefix) => path.startsWith(prefix)) && role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (path.startsWith("/dashboard/admin/ecommerce")) {
      if (role !== "SUPER_ADMIN" && role !== "PROJECT_MANAGER") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    } else if (path.startsWith("/dashboard/admin/notifications")) {
      // Allowed for all active authenticated staff roles
    } else if (path.startsWith("/dashboard/admin/reports")) {
      if (role !== "SUPER_ADMIN" && role !== "FINANCE_OFFICER") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    } else if (
      path.startsWith("/dashboard/admin") &&
      !path.startsWith("/dashboard/admin/users")
    ) {
      if (role !== "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    if ((path.startsWith("/dashboard/team") || path.startsWith("/dashboard/gallery")) && role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (path.startsWith("/dashboard/vet") && role !== "VETERINARIAN" && role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (
      path.startsWith("/dashboard/field") &&
      !FIELD_ROLES.has(role) &&
      role !== "SUPER_ADMIN"
    ) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (
      path.startsWith("/dashboard/finance") &&
      !FINANCE_ROLES.has(role) &&
      role !== "SUPER_ADMIN"
    ) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
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
        if (req.nextUrl.pathname.startsWith("/dashboard")) {
          return !!token;
        }
        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
