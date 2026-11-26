"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";

const PUBLIC_NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/#about", label: "About" },
  { href: "/#impact", label: "Impact" },
  { href: "/gallery", label: "Gallery" },
  { href: "/team", label: "Our Team" },
];

export default function PublicNavbar({ activePath }: { activePath: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: "rgba(16,24,39,0.88)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      <div className="app-container mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6 sm:py-3 lg:px-8">
        <Link
          href="/"
          aria-label="Pig Project Rwanda home"
          className="flex shrink-0 items-center"
        >
          <span className="inline-flex items-center rounded-xl bg-white px-2.5 py-1 shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/pplog-.png"
              alt="Pig Project Rwanda"
              className="h-8 sm:h-9 w-auto object-contain"
            />
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-6">
          {PUBLIC_NAV_LINKS.map(({ href, label }) => {
            const isActive = href === activePath;
            return (
              <Link
                key={href}
                href={href}
                className={`whitespace-nowrap shrink-0 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-[#FF8A00]"
                    : "text-white/85 hover:text-white hover:underline underline-offset-4"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link
            href="/login"
            className="hidden sm:inline-block whitespace-nowrap shrink-0 text-sm font-medium text-white/80 hover:text-white px-2.5 py-1.5 transition-colors"
          >
            Staff Login
          </Link>

          <Link
            href="/contact"
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-[#101827] shadow-sm hover:bg-orange-50 transition-colors whitespace-nowrap shrink-0"
          >
            <span>Contact Us</span>
            <ArrowRight className="h-3.5 w-3.5 text-[#FF8A00]" />
          </Link>

          <button
            type="button"
            aria-label="Toggle navigation menu"
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden ml-0.5 flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div
          style={{
            background: "rgba(16,24,39,0.97)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <nav className="mx-auto max-w-7xl flex flex-col gap-1 px-4 py-4">
            {PUBLIC_NAV_LINKS.map(({ href, label }) => {
              const isActive = href === activePath;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-white/10 text-[#FF8A00]"
                      : "text-white/85 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="mt-1 rounded-lg px-4 py-2.5 text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              Staff Login
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
