import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { getNextAuthSecret } from "@/lib/auth-secret";

const normalizeRole = (role?: string | null) => {
  if (!role) return "";
  const value = role.replace(/^ROLE_/, "");
  return value === "ADMIN" ? "SUPER_ADMIN" : value;
};

const SUPER_ADMIN_ONLY_PREFIXES = [
  "/dashboard/admin/users",
  "/dashboard/admin/settings",
  "/dashboard/admin/website",
  "/dashboard/admin/ecommerce",
  "/dashboard/admin/audit",
  "/dashboard/admin/security",
];

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    const role = normalizeRole(typeof token?.role === "string" ? token.role : undefined);

    if (path.startsWith("/dashboard") && !role) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (path === "/dashboard") {
      if (role === "SUPER_ADMIN" || role === "PROJECT_MANAGER") {
        return NextResponse.redirect(new URL("/dashboard/admin", req.url));
      }
      if (role === "VETERINARIAN") {
        return NextResponse.redirect(new URL("/dashboard/vet", req.url));
      }
      if (role === "FIELD_OFFICER" || role === "TRAINER") {
        return NextResponse.redirect(new URL("/dashboard/field", req.url));
      }
      if (role === "FINANCE_OFFICER") {
        return NextResponse.redirect(new URL("/dashboard/finance", req.url));
      }
      if (role === "FUNDER") {
        return NextResponse.redirect(new URL("/dashboard/admin/reports", req.url));
      }
    }

    if (SUPER_ADMIN_ONLY_PREFIXES.some((prefix) => path.startsWith(prefix)) && role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (path.startsWith("/dashboard/admin/reports")) {
      if (role !== "SUPER_ADMIN" && role !== "PROJECT_MANAGER" && role !== "FUNDER") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    } else if (path.startsWith("/dashboard/admin")) {
      if (role !== "SUPER_ADMIN" && role !== "PROJECT_MANAGER") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    if ((path.startsWith("/dashboard/team") || path.startsWith("/dashboard/gallery")) && role !== "SUPER_ADMIN" && role !== "PROJECT_MANAGER") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (path.startsWith("/dashboard/vet") && role !== "VETERINARIAN" && role !== "SUPER_ADMIN" && role !== "PROJECT_MANAGER") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (
      path.startsWith("/dashboard/field") &&
      role !== "FIELD_OFFICER" &&
      role !== "TRAINER" &&
      role !== "SUPER_ADMIN" &&
      role !== "PROJECT_MANAGER"
    ) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (
      path.startsWith("/dashboard/finance") &&
      role !== "FINANCE_OFFICER" &&
      role !== "SUPER_ADMIN" &&
      role !== "PROJECT_MANAGER"
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
