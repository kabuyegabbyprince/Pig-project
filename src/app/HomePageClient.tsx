"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  ChevronRight,
  HandHeart,
  Menu,
  Sprout,
  User,
  ArrowRight,
  X,
} from "lucide-react";
import type { GalleryItem, TeamMember } from "@prisma/client";
import { GEBYIAN_WEBSITE_URL } from "@/lib/config";

type HeroData = {
  title: string;
  description: string;
  primaryButtonText: string;
  primaryButtonLink: string;
  secondaryButtonText: string;
  secondaryButtonLink: string;
  imageUrl: string;
  imageAlt: string;
};

interface HomePageClientProps {
  heroData: HeroData;
  totalBeneficiaries: number;
  totalPigsDistributed: number;
  litterbornCount: number;
  returnedPiglets: number;
  teamMembers: TeamMember[];
  galleryItems: GalleryItem[];
}

const NAV_LINKS = [
  { href: "#about",             label: "About" },
  { href: "#how-it-works",      label: "How It Works" },
  { href: "#impact",            label: "Impact" },
  { href: GEBYIAN_WEBSITE_URL,  label: "Gebyian Website" },
  { href: "/gallery",           label: "Gallery" },
  { href: "/team",              label: "Our Team" },
  { href: "#stories",           label: "Stories" },
];

export function HomePageClient({
  heroData,
  totalBeneficiaries,
  totalPigsDistributed,
  litterbornCount,
  returnedPiglets,
  teamMembers,
  galleryItems,
}: HomePageClientProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleHashLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const targetId = href.replace(/^#/, "");
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const impactStats = [
    { value: totalBeneficiaries,  label: "Families Supported" },
    { value: totalPigsDistributed,label: "Pigs Distributed" },
    { value: litterbornCount,     label: "Piglets Born" },
    { value: returnedPiglets,     label: "Piglets Returned" },
  ];

  const steps = [
    {
      icon: BadgeCheck,
      title: "Select a family",
      text: "Field teams identify households where a livestock asset can make a practical difference.",
    },
    {
      icon: Sprout,
      title: "Raise and grow",
      text: "Families receive a pig, care guidance, and veterinary support as the livestock grows.",
    },
    {
      icon: HandHeart,
      title: "Return piglets",
      text: "Returned piglets move into the fund and help another family begin the same journey.",
    },
  ];

  return (
    <div
      style={{ margin: 0, padding: 0, overflowX: "hidden" }}
      className="bg-white text-slate-900 antialiased"
    >
      {/* ══════════════════════════════════════════════
          FIXED NAVBAR — stays on screen at all times
          ══════════════════════════════════════════════ */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: "rgba(16,24,39,0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div className="app-container mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-3 lg:px-8">
          {/* Logo */}
          <Link href="/" aria-label="Pig Project Rwanda home" className="flex shrink-0 items-center">
            <span className="inline-flex items-center rounded-xl bg-white px-2.5 py-1 shadow-xs">
              <img
                src="/pplog-.png"
                alt="Pig Project Rwanda"
                className="h-8 sm:h-9 w-auto object-contain"
              />
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {NAV_LINKS.map(({ href, label }) => {
              const isExternal = href.startsWith("http");
              return (
                <Link
                  key={label}
                  href={href}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noopener noreferrer" : undefined}
                  onClick={(e) => handleHashLinkClick(e, href)}
                  className="rounded-full px-3.5 py-1.5 text-sm font-medium text-white/85 hover:text-white hover:bg-white/10 transition-colors"
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Link
              href="/login"
              className="hidden sm:inline-block text-sm font-medium text-white/80 hover:text-white px-2.5 py-1.5 transition-colors"
            >
              Staff Login
            </Link>

            <Link
              href="/contact"
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-[#101827] shadow-sm hover:bg-orange-50 transition-colors whitespace-nowrap"
            >
              <span>Contact Us</span>
              <ArrowRight className="h-3.5 w-3.5 text-[#FF8A00]" />
            </Link>
            {/* Hamburger — mobile & tablet */}
            <button
              type="button"
              aria-label="Toggle menu"
              onClick={() => setMobileOpen((v) => !v)}
              className="lg:hidden ml-0.5 flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
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
              {NAV_LINKS.map(({ href, label }) => {
                const isExternal = href.startsWith("http");
                return (
                  <Link
                    key={label}
                    href={href}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                    onClick={(e) => {
                      handleHashLinkClick(e, href);
                      setMobileOpen(false);
                    }}
                    className="rounded-lg px-4 py-2.5 text-sm font-medium text-white/85 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    {label}
                  </Link>
                );
              })}
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="mt-1 rounded-lg px-4 py-2.5 text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                Staff Login
              </Link>

            </nav>
          </div>
        )}
      </header>

      {/* ══════════════════════════════════════════════
          HERO — responsive full-viewport shell with zero overlap
          ══════════════════════════════════════════════ */}
      <section id="home" className="hero-section">
        {/* Full-bleed background image */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${heroData.imageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center center",
            backgroundRepeat: "no-repeat",
            zIndex: 0,
          }}
        />
        {/* Dark gradient overlay */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(165deg, rgba(16,24,39,0.88) 0%, rgba(10,14,23,0.95) 100%)",
            zIndex: 1,
          }}
        />

        {/* Hero content — vertically centred */}
        <div className="hero-content-wrap">
          <div className="app-container mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.12]">
              {heroData.title}
            </h1>

            <p className="mt-4 sm:mt-5 max-w-2xl mx-auto text-sm leading-relaxed text-slate-200/90 sm:text-lg lg:text-xl">
              {heroData.description}
            </p>

            {/* CTA Buttons */}
            <div className="mt-7 sm:mt-9 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <Link
                href={heroData.primaryButtonLink}
                onClick={(e) => handleHashLinkClick(e, heroData.primaryButtonLink)}
                className="inline-flex items-center gap-2 rounded-full bg-[#FF8A00] px-6 py-3 sm:px-7 sm:py-3.5 text-xs sm:text-sm font-bold text-[#101827] shadow-md hover:bg-[#e07900] transition-all"
              >
                <span>{heroData.primaryButtonText}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={heroData.secondaryButtonLink}
                onClick={(e) => handleHashLinkClick(e, heroData.secondaryButtonLink)}
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3 sm:px-7 sm:py-3.5 text-xs sm:text-sm font-bold text-white backdrop-blur-sm hover:bg-white/20 transition-all"
              >
                {heroData.secondaryButtonText}
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="mt-7 sm:mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[10px] sm:text-xs font-semibold text-slate-300 uppercase tracking-widest">
              {["Community-Led", "Rwanda Operations", "Revolving Mandate"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FF8A00]" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom stat chips — flows cleanly on small/short viewports */}
        <div className="hero-stat-chips">
          {[
            { value: totalBeneficiaries, label: "Families" },
            { value: totalPigsDistributed, label: "Pigs Distributed" },
            { value: litterbornCount, label: "Piglets Born" },
          ].map((s) => (
            <div key={s.label} className="hero-stat-chip">
              <p className="text-lg sm:text-[1.375rem] font-extrabold text-white leading-none">
                {s.value}
              </p>
              <p className="mt-1 text-[10px] font-semibold text-[#FF8A00] uppercase tracking-wider">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          MAIN CONTENT — scrolls naturally below hero
          ══════════════════════════════════════════════ */}
      <main>
        {/* ── About ── */}
        <section id="about" className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#FF8A00]">
                About The Fund
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                A simple model with a lasting community return.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
                The project starts with one healthy pig, then grows through practical training,
                veterinary care, and an accountable revolving cycle where one family&apos;s harvest
                enables the next family to begin.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs hover:border-slate-300 transition-colors">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange-50 text-[#FF8A00]">
                  <User className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">Vulnerable Families</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Direct targeting of households in need of durable, practical agricultural assets.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs hover:border-slate-300 transition-colors">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange-50 text-[#FF8A00]">
                  <HandHeart className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">Veterinary Guidance</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Continuous professional supervision ensures healthy litters and strong reproduction.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section id="how-it-works" className="border-y border-slate-200/70 bg-slate-50/70 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#FF8A00]">
                Sustainable Workflow
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Receive. Raise. Return.
              </h2>
              <p className="mt-3 text-sm text-slate-600">
                A structured three-step lifecycle empowering Rwandan rural households.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <article
                    key={step.title}
                    className="relative rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-[#FF8A00]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-300">0{idx + 1}</span>
                    </div>
                    <h3 className="mt-5 text-lg font-bold text-slate-900">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Impact ── */}
        <section id="impact" className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-2xl bg-[#101827] p-8 text-white sm:p-12 lg:p-14 shadow-sm">
            <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-5">
                <span className="inline-flex rounded-full border border-[#FF8A00]/40 bg-[#FF8A00]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#FF8A00]">
                  Real-Time Database Records
                </span>
                <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl leading-tight">
                  Transparent community impact measured live.
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  Every animal recorded, vaccinated, and distributed is tracked directly within our operations ledger.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
                {impactStats.map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-xs">
                    <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                      {stat.value}
                    </div>
                    <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-[#FF8A00]">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Stories & Gallery ── */}
        <section id="stories" className="border-t border-slate-200/70 bg-slate-50/50 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#FF8A00]">
                  Field Documentation
                </p>
                <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                  Stories from the ground
                </h2>
              </div>
              <Link
                href="/gallery"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#FF8A00] hover:text-[#101827] transition-colors"
              >
                <span>View full gallery</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {galleryItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500">
                <p className="text-sm font-medium">Our gallery is being updated. Please check back soon.</p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {galleryItems.map((item) => (
                  <article
                    key={item.id}
                    className="group overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs hover:border-slate-300 hover:shadow-sm transition-all"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-5">
                      <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                      {item.location && <p className="mt-1 text-xs text-slate-500">{item.location}</p>}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Our Team ── */}
        <section id="team" className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#FF8A00]">
                  Dedicated Leadership
                </p>
                <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                  People behind the project
                </h2>
              </div>
              <Link
                href="/team"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#FF8A00] hover:text-[#101827] transition-colors"
              >
                <span>Meet the entire team</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {teamMembers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-xs font-medium text-slate-500">
                Team profiles are currently being synchronized.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                {teamMembers.map((member) => (
                  <article key={member.id} className="group">
                    <div className="aspect-square overflow-hidden rounded-xl border border-slate-200/70 bg-slate-50">
                      {member.photoUrl ? (
                        <img
                          src={member.photoUrl}
                          alt={member.fullName}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xl font-bold text-[#101827] bg-orange-50">
                          {member.fullName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <h3 className="mt-3 text-sm font-bold text-slate-900">{member.fullName}</h3>
                    <p className="text-xs text-slate-500">{member.role}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 bg-slate-50/70 py-14 text-slate-600">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-4">
            <div className="md:col-span-2 space-y-3">
              <Link href="/" aria-label="Pig Project Rwanda home" className="inline-flex items-center rounded-xl bg-white px-3 py-1.5 shadow-xs border border-slate-200/70">
                <img src="/pplog-.png" alt="Pig Project Rwanda Logo" className="h-11 w-auto object-contain" />
              </Link>
              <p className="text-sm font-semibold text-slate-900">
                One Piglet. One Family. A Fund That Keeps Moving.
              </p>
              <p className="text-xs leading-relaxed text-slate-500 max-w-md">
                A sustainable revolving fund supporting vulnerable rural families across Rwanda with livestock capital and veterinary backing.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">Navigation</h4>
              <ul className="space-y-2 text-xs">
                <li><Link href="#about" onClick={(e) => handleHashLinkClick(e, "#about")} className="hover:text-slate-900 transition-colors">About Us</Link></li>
                <li><Link href="#how-it-works" onClick={(e) => handleHashLinkClick(e, "#how-it-works")} className="hover:text-slate-900 transition-colors">How It Works</Link></li>
                <li><Link href="#impact" onClick={(e) => handleHashLinkClick(e, "#impact")} className="hover:text-slate-900 transition-colors">Impact Summary</Link></li>
                <li><Link href="/gallery" className="hover:text-slate-900 transition-colors">Field Gallery</Link></li>
                <li><Link href="/team" className="hover:text-slate-900 transition-colors">Our Team</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">Operations</h4>
              <ul className="space-y-2 text-xs">
                <li><Link href="/login"   className="hover:text-slate-900 transition-colors">Staff Login</Link></li>

                <li><Link href="/contact" className="hover:text-slate-900 transition-colors">Contact Support</Link></li>
                <li><span className="text-slate-400">Value Protocols, Rwanda</span></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-slate-200/80 pt-6 text-center text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Pig Project Rwanda &bull; Value Protocols. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
