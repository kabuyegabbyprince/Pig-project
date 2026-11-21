"use client";

import type { Session } from "next-auth";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  FileText,
  Shield,
  LogOut,
  Menu,
  X,
  ArrowRightCircle,
  ArrowLeftCircle,
  History,
  Settings,
  UserPlus,
  ImageIcon,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Calendar,
  PlusCircle,
  UserCog,
  Send,
  ChevronDown,
  ShoppingBag,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import { getRoleLabel, normalizeRoleValue } from "@/lib/roles";

type NavItem = {
  name: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  superAdminOnly?: boolean;
  cellManagerOrLeaderOnly?: boolean;
  children?: { name: string; href: string }[];
};

const adminNavigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard/admin", icon: LayoutDashboard },
  { name: "Staff", href: "/dashboard/admin/users", icon: Shield, superAdminOnly: true },
  { name: "Beneficiaries", href: "/dashboard/admin/beneficiaries", icon: Users },
  { name: "Pig Register", href: "/dashboard/admin/pigs/new", icon: PlusCircle },
  { name: "Distributions", href: "/dashboard/admin/distributions", icon: ArrowRightCircle },
  { name: "Veterinary", href: "/dashboard/admin/veterinary", icon: Stethoscope },
  { name: "Finance", href: "/dashboard/admin/finance", icon: TrendingUp },
  { name: "E-Commerce", href: "/dashboard/admin/ecommerce", icon: ShoppingBag },
  {
    name: "Post",
    icon: Send,
    children: [
      { name: "Post Gallery", href: "/dashboard/gallery" },
      { name: "Post Our Team", href: "/dashboard/team" },
    ],
  },
  { name: "Reports", href: "/dashboard/admin/reports", icon: FileText },
  { name: "Historical Records", href: "/dashboard/history", icon: History },
  { name: "Website Content", href: "/dashboard/admin/website", icon: ImageIcon, superAdminOnly: true },
  { name: "System Settings", href: "/dashboard/admin/settings", icon: Settings, superAdminOnly: true },
  { name: "Personal Settings", href: "/dashboard/settings", icon: UserCog },
];

const fieldNavigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard/field", icon: LayoutDashboard },
  { name: "Cooperative Team", href: "/dashboard/field/cooperative", icon: UsersRound, cellManagerOrLeaderOnly: true },
  { name: "Pig Register", href: "/dashboard/field/pigs/new", icon: PlusCircle },
  { name: "Beneficiaries", href: "/dashboard/field/beneficiaries", icon: Users },
  { name: "Register Beneficiary", href: "/dashboard/field/beneficiaries/new", icon: UserPlus },
  { name: "Pig Distribution", href: "/dashboard/field/distributions", icon: ArrowRightCircle },
  { name: "Piglet Returns", href: "/dashboard/field/returns", icon: ArrowLeftCircle },
  { name: "Operational Reports", href: "/dashboard/field/reports", icon: FileText },
  { name: "Historical Records", href: "/dashboard/history", icon: History },
  { name: "Personal Settings", href: "/dashboard/settings", icon: UserCog },
];

const vetNavigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard/vet", icon: LayoutDashboard },
  { name: "Veterinary Records", href: "/dashboard/vet/veterinary", icon: Stethoscope },
  { name: "Returned Piglets", href: "/dashboard/vet/returned", icon: RefreshCw },
  { name: "Follow-ups", href: "/dashboard/vet/follow-ups", icon: Calendar },
  { name: "Veterinary Reports", href: "/dashboard/vet/reports", icon: FileText },
  { name: "Historical Records", href: "/dashboard/history", icon: History },
  { name: "Personal Settings", href: "/dashboard/settings", icon: UserCog },
];

const financeNavigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard/finance", icon: LayoutDashboard },
  { name: "Record Income", href: "/dashboard/finance/new?type=INCOME", icon: TrendingUp },
  { name: "Record Expense", href: "/dashboard/finance/new?type=EXPENSE", icon: TrendingDown },
  { name: "Financial Reports", href: "/dashboard/finance/reports", icon: FileText },
  { name: "Historical Records", href: "/dashboard/history", icon: History },
  { name: "Personal Settings", href: "/dashboard/settings", icon: UserCog },
];

export function DashboardShell({
  children,
  initialSession,
}: {
  children: React.ReactNode;
  initialSession?: Session | null;
}) {
  const { data: sessionData } = useSession();
  const session = sessionData ?? initialSession ?? null;
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>(() => {
    const isPostActive = pathname.startsWith("/dashboard/gallery") || pathname.startsWith("/dashboard/team");
    return { Post: isPostActive };
  });

  const toggleDropdown = (name: string) => {
    setOpenDropdowns((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const role = normalizeRoleValue(session?.user?.role as string | undefined);
  let navigation: NavItem[] = [];
  if (role === "SUPER_ADMIN") navigation = adminNavigation;
  if (role === "PROJECT_MANAGER") navigation = adminNavigation.filter((item) => !item.superAdminOnly);
  if (
    role === "CELL_MANAGER" ||
    role === "COOPERATIVE_LEADER" ||
    role === "COOPERATIVE_MEMBER" ||
    role === "TRAINER"
  ) {
    navigation = fieldNavigation.filter(
      (item) =>
        !item.cellManagerOrLeaderOnly ||
        role === "CELL_MANAGER" ||
        role === "COOPERATIVE_LEADER"
    );
  }
  if (role === "VETERINARIAN") navigation = vetNavigation;
  if (role === "ACCOUNTANT" || role === "FINANCE_OFFICER") navigation = financeNavigation;
  if (role === "FUNDER") {
    navigation = [
      { name: "Dashboard", href: "/dashboard/admin/reports", icon: LayoutDashboard },
      { name: "Project Reports", href: "/dashboard/admin/reports", icon: FileText },
      { name: "Historical Records", href: "/dashboard/history", icon: History },
      { name: "Personal Settings", href: "/dashboard/settings", icon: UserCog },
    ];
  }

  const renderNav = (items: NavItem[], isMobile = false) => {
    return items.map((item) => {
      if (item.children) {
        const isChildActive = item.children.some(
          (child) => pathname === child.href || pathname.startsWith(child.href + "/")
        );
        const isOpen = openDropdowns[item.name] ?? isChildActive;

        return (
          <div key={item.name} className="space-y-1">
            <button
              type="button"
              onClick={() => toggleDropdown(item.name)}
              className={`group flex w-full items-center justify-between rounded-lg px-3 ${
                isMobile ? "py-2.5" : "py-2"
              } text-xs font-medium transition ${
                isChildActive
                  ? "bg-white/10 text-white font-semibold border-l-2 border-[#FF8A00]"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <div className="flex items-center">
                <item.icon className={`mr-2.5 h-4 w-4 ${isChildActive ? "text-[#FF8A00]" : "text-[#FF8A00]/80"}`} />
                <span>{item.name}</span>
              </div>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isOpen && (
              <div className="ml-3.5 space-y-1 border-l border-white/15 pl-3 pt-1">
                {item.children.map((sub) => {
                  const isSubActive = pathname === sub.href || pathname.startsWith(sub.href + "/");
                  return (
                    <Link
                      key={sub.name}
                      href={sub.href}
                      prefetch={false}
                      onClick={() => isMobile && setMobileMenuOpen(false)}
                      className={`flex items-center rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                        isSubActive
                          ? "bg-[#FF8A00]/20 text-[#FF8A00] font-semibold"
                          : "text-slate-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {sub.name}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      }

      const isActive =
        pathname === item.href ||
        (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
      return (
        <Link
          key={item.name}
          href={item.href!}
          prefetch={false}
          onClick={() => isMobile && setMobileMenuOpen(false)}
          className={`group flex items-center rounded-lg px-3 ${
            isMobile ? "py-2.5" : "py-2"
          } text-xs font-medium transition ${
            isActive
              ? "bg-white/10 text-white font-semibold shadow-xs border-l-2 border-[#FF8A00]"
              : "text-slate-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          <item.icon className={`mr-2.5 h-4 w-4 ${isActive ? "text-[#FF8A00]" : "text-slate-400 group-hover:text-[#FF8A00]"}`} />
          {item.name}
        </Link>
      );
    });
  };

  const userInitial = session?.user?.name ? session.user.name.charAt(0).toUpperCase() : "U";

  return (
    <div className="min-h-screen w-full overflow-x-clip bg-[#F5F5F5] text-[#101827] antialiased">
      <div className="flex h-screen w-full overflow-hidden">
        {/* Fixed Deep Navy sidebar (laptops & large desktops >=1024px) */}
        <aside className="dashboard-sidebar hidden w-64 shrink-0 border-r border-[#101827]/10 bg-[#101827] text-white lg:flex lg:flex-col shadow-sm">
          <div className="flex h-16 items-center border-b border-white/10 px-5 shrink-0">
            <Link href="/" prefetch={false} className="flex items-center gap-2.5 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-1 shadow-xs shrink-0">
                <img src="/pplog-.png" alt="Pig Project Rwanda" className="h-full w-full object-contain" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#FF8A00] leading-none">
                  Pig Project
                </p>
                <h1 className="mt-0.5 text-sm font-bold tracking-tight text-white group-hover:text-[#FF8A00] transition-colors">
                  Rwanda Operations
                </h1>
              </div>
            </Link>
          </div>

          <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
            {renderNav(navigation)}
          </nav>

          <div className="border-t border-white/10 bg-[#0d141f] px-4 py-3.5 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <Link href="/dashboard/settings" prefetch={false} className="flex items-center gap-2.5 min-w-0 group hover:opacity-90 transition">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FF8A00] text-[#101827] font-extrabold text-xs border border-white/10">
                  {userInitial}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-white group-hover:underline">
                    {session?.user?.name}
                  </p>
                  <p className="truncate text-[10px] text-[#FF8A00]">
                    {getRoleLabel(session?.user?.role)}
                  </p>
                </div>
              </Link>
              <div className="flex items-center gap-1 shrink-0">
                <Link
                  href="/dashboard/settings"
                  prefetch={false}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                  title="Personal Settings"
                  aria-label="Personal Settings"
                >
                  <Settings className="h-3.5 w-3.5" />
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto h-screen bg-[#F5F5F5]">
          {/* Mobile & Tablet Header (<1024px) */}
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-md lg:hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <Link href="/" prefetch={false} className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 p-1">
                  <img src="/pplog-.png" alt="Pig Project Rwanda" className="h-full w-full object-contain" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-[#FF8A00]">
                    Pig Project Rwanda
                  </p>
                  <h1 className="truncate text-sm font-bold text-[#101827]">Operations Workspace</h1>
                </div>
              </Link>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#101827] hover:bg-slate-50 transition-colors"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#101827] hover:bg-slate-50 transition-colors"
                  aria-label="Toggle navigation"
                >
                  {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </header>

          {mobileMenuOpen && (
            <div className="max-h-[calc(100dvh-57px)] overflow-y-auto border-b border-white/10 bg-[#101827] p-4 lg:hidden text-white">
              <nav className="space-y-1">{renderNav(navigation, true)}</nav>
            </div>
          )}

          <main className="dashboard-main min-w-0 flex-1 p-3.5 sm:p-6 lg:p-8">
            <div className="dashboard-container mx-auto w-full max-w-7xl min-w-0">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
