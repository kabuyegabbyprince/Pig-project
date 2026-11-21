export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  FinanceStatus,
  MortalityReviewStatus,
  PigHealthStatus,
  PigStatus,
  Prisma,
  RevolvingStatus,
  Role,
  TransferStatus,
} from "@prisma/client";
import {
  ArrowDownRight,
  ArrowRight,
  Bell,
  FileText,
  Globe,
  HeartPulse,
  History,
  MapPin,
  Package,
  PiggyBank,
  Plus,
  RefreshCw,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Stethoscope,
  Users,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatRwf } from "@/lib/format-rwf";
import { getActiveUser } from "@/lib/active-user";
import { getEcommerceOverview } from "@/app/actions/ecommerce";
import { formatActivity, formatModule, formatRole } from "@/lib/audit-format";
import { UserRoleActions } from "@/components/admin/UserRoleActions";
import { formatUserContact } from "@/lib/phone-utils";

export default async function AdminDashboardOverview() {
  const actor = await getActiveUser([Role.SUPER_ADMIN, Role.PROJECT_MANAGER]);
  if (!actor) {
    redirect("/dashboard");
  }

  const isSuperAdmin = actor.role === Role.SUPER_ADMIN;

  const [
    distributionCount,
    distributedPigsStatus,
    returnedQuantityAggr,
    returnedPigletsCount,
    returnedStatusPigs,
    pigsInStock,
    incomeAggr,
    expenseAggr,
    pigsWithHealthProblems,
    totalBeneficiaries,
    activeUsersCount,
    pendingTransfersCount,
    pendingMortalitiesCount,
    pendingFinanceCount,
    overdueCyclesCount,
    unreadNotificationsCount,
    usersList,
    recentLogs,
    ecommerceOverview,
  ] = await Promise.all([
    prisma.pigDistribution.count(),
    prisma.pig.count({ where: { status: PigStatus.DISTRIBUTED, deletedAt: null } }),
    prisma.pigReturn.aggregate({ _sum: { quantity: true } }),
    prisma.piglet.count({ where: { returnedFromId: { not: null } } }),
    prisma.pig.count({ where: { status: PigStatus.RETURNED, deletedAt: null } }),
    prisma.pig.count({
      where: {
        deletedAt: null,
        currentBeneficiaryId: null,
        status: {
          notIn: [PigStatus.DISTRIBUTED, PigStatus.DECEASED, PigStatus.SOLD, PigStatus.INACTIVE],
        },
      },
    }),
    prisma.financeTransaction.aggregate({
      _sum: { amount: true },
      where: { type: "INCOME", status: "APPROVED", deletedAt: null },
    }),
    prisma.financeTransaction.aggregate({
      _sum: { amount: true },
      where: { type: "EXPENSE", status: "APPROVED", deletedAt: null },
    }),
    prisma.pig.count({
      where: {
        healthStatus: {
          in: [PigHealthStatus.SICK, PigHealthStatus.CRITICAL, PigHealthStatus.UNDER_TREATMENT],
        },
        deletedAt: null,
      },
    }),
    prisma.beneficiary.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, isActive: true } }),
    prisma.pigTransfer.count({ where: { status: TransferStatus.PENDING } }),
    prisma.mortalityRecord.count({ where: { adminReviewStatus: MortalityReviewStatus.PENDING } }),
    prisma.financeTransaction.count({
      where: { status: FinanceStatus.SUBMITTED, deletedAt: null },
    }),
    prisma.revolvingCycle.count({ where: { status: RevolvingStatus.OVERDUE } }),
    prisma.notification.count({ where: { userId: actor.id, isRead: false } }),
    isSuperAdmin
      ? prisma.user.findMany({
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 12,
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        user: { select: { name: true, email: true } },
      },
    }),
    getEcommerceOverview(),
  ]);

  const pigsDistributed = Math.max(distributionCount, distributedPigsStatus);
  const pigsReturned = Math.max(
    (returnedQuantityAggr._sum.quantity ?? 0) + returnedPigletsCount,
    returnedStatusPigs
  );

  const totalIncome = incomeAggr._sum.amount ?? new Prisma.Decimal(0);
  const totalExpenses = expenseAggr._sum.amount ?? new Prisma.Decimal(0);
  const totalMoneyBalance = formatRwf(totalIncome.minus(totalExpenses));

  const summaryCards = [
    {
      title: "Pigs Distributed",
      value: pigsDistributed,
      icon: ArrowDownRight,
      tone: "bg-orange-50 text-[#FF8A00]",
    },
    {
      title: "Pigs Returned",
      value: pigsReturned,
      icon: RefreshCw,
      tone: "bg-slate-100 text-[#101827]",
    },
    {
      title: "Pigs in Stock",
      value: pigsInStock,
      icon: Package,
      tone: "bg-amber-50 text-amber-700",
    },
    {
      title: "Health Alerts",
      value: pigsWithHealthProblems,
      icon: HeartPulse,
      tone: "bg-rose-50 text-rose-700",
    },
    {
      title: "Fund Balance (RWF)",
      value: totalMoneyBalance,
      icon: Wallet,
      tone: "bg-orange-50 text-[#FF8A00]",
    },
    {
      title: "Enrolled Families",
      value: totalBeneficiaries,
      icon: Users,
      tone: "bg-slate-100 text-[#101827]",
    },
    {
      title: "Active Staff Accounts",
      value: activeUsersCount,
      icon: ShieldCheck,
      tone: "bg-indigo-50 text-indigo-700",
    },
    {
      title: "E-Commerce Orders",
      value: ecommerceOverview.tableMissing
        ? "Phase 2 Setup"
        : `${ecommerceOverview.orders.length} (${formatRwf(ecommerceOverview.totalRevenue)})`,
      icon: ShoppingBag,
      tone: "bg-orange-50 text-[#FF8A00]",
    },
  ];

  const controlModules = [
    ...(isSuperAdmin
      ? [
          {
            title: "Users & Role Governance",
            description: "Assign staff across all system roles, suspend/activate accounts, or add staff.",
            href: "/dashboard/admin/users",
            icon: ShieldCheck,
          },
          {
            title: "E-Commerce Store Control",
            description: "Manage shared-DB products, stock, orders, and ledger sync.",
            href: "/dashboard/admin/ecommerce",
            icon: ShoppingBag,
          },
          {
            title: "Website Hero & Content",
            description: "Edit public homepage hero copy, CTA links, and media.",
            href: "/dashboard/admin/website",
            icon: Globe,
          },
          {
            title: "System Settings",
            description: "Configure platform keys, revolving targets, and defaults.",
            href: "/dashboard/admin/settings",
            icon: Settings,
          },
        ]
      : []),
    {
      title: "Beneficiaries",
      description: "Inspect and manage rural households enrolled in the program.",
      href: "/dashboard/admin/beneficiaries",
      icon: Users,
    },
    {
      title: "Pig Register & Stock",
      description: "Register new pigs, track ear tags, weights, and herd status.",
      href: "/dashboard/admin/pigs",
      icon: PiggyBank,
    },
    {
      title: "Distributions & Revolving",
      description: "Track pig handovers, 2-piglet obligations, and returns.",
      href: "/dashboard/admin/distributions",
      icon: ArrowDownRight,
    },
    {
      title: "Veterinary Oversight",
      description: "Monitor exams, vaccinations, treatments, and mortality reviews.",
      href: "/dashboard/admin/veterinary",
      icon: Stethoscope,
    },
    {
      title: "Finance & Ledger",
      description: "Review income, expenses, RWF balance, and CSV exports.",
      href: "/dashboard/admin/finance",
      icon: Wallet,
    },
    {
      title: "Locations Hierarchy",
      description: "Manage Rwanda districts, sectors, cells, and villages.",
      href: "/dashboard/admin/locations",
      icon: MapPin,
    },
    {
      title: "Executive Reports",
      description: "5-pillar live reports across livestock, returns, vet, and finance.",
      href: "/dashboard/admin/reports",
      icon: FileText,
    },
    {
      title: "Immutable Audit Trail",
      description: "Inspect every login, role update, financial post, and field edit.",
      href: "/dashboard/history",
      icon: History,
    },
  ];

  const pendingItems = [
    { label: "Pending Transfers", count: pendingTransfersCount, href: "/dashboard/admin/transfers" },
    { label: "Mortality Reviews", count: pendingMortalitiesCount, href: "/dashboard/admin/veterinary" },
    { label: "Submitted Finance Tx", count: pendingFinanceCount, href: "/dashboard/admin/finance" },
    { label: "Overdue Revolving", count: overdueCyclesCount, href: "/dashboard/admin/revolving" },
    { label: "Unread Alerts", count: unreadNotificationsCount, href: "/dashboard/admin/notifications" },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#FF8A00]">
            {isSuperAdmin ? "Super Admin Master Control Center" : "Project Operations Control"}
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-[#101827]">
            Unified Operations &amp; E-Commerce Command
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Signed in as <span className="font-semibold text-slate-700">{actor.name}</span> ({actor.role}) &bull;{" "}
            Connected to shared Supabase PostgreSQL database.
          </p>
        </div>

        {isSuperAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/admin/users/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#101827] px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#1f2937] transition"
            >
              <Plus className="h-3.5 w-3.5 text-[#FF8A00]" />
              <span>Add Staff User</span>
            </Link>
            <Link
              href="/dashboard/admin/ecommerce"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-[#101827] shadow-xs hover:bg-orange-50 transition"
            >
              <ShoppingBag className="h-3.5 w-3.5 text-[#FF8A00]" />
              <span>Manage E-Commerce</span>
            </Link>
          </div>
        )}
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map(({ title, value, icon: Icon, tone }) => (
          <div
            key={title}
            className="rounded-xl border border-slate-200/80 bg-white p-4.5 shadow-xs hover:border-slate-300 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">{title}</p>
                <p className="mt-1.5 truncate text-xl font-bold tracking-tight text-slate-900">{value}</p>
              </div>
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
                <Icon className="h-4.5 w-4.5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Attention & Approval Queue Strip */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="h-4 w-4 text-amber-600" />
          <h2 className="text-sm font-bold text-slate-900">Control Queue &amp; Pending Approvals</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {pendingItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              prefetch={false}
              className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50/70 px-3.5 py-2.5 hover:border-[#FF8A00]/50 hover:bg-orange-50/40 transition"
            >
              <span className="text-xs font-medium text-slate-700">{item.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  item.count > 0 ? "bg-amber-100 text-amber-800" : "bg-slate-200/70 text-slate-600"
                }`}
              >
                {item.count}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Master Module Control Directory */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#101827]">Manage All System Modules</h2>
            <p className="text-xs text-slate-500">Direct administrative access across operations, public website, and E-Commerce.</p>
          </div>
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {controlModules.map(({ title, description, href, icon: Icon }) => (
            <Link
              key={title}
              href={href}
              prefetch={false}
              className="group flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs hover:border-[#FF8A00] hover:shadow-sm transition-all"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-[#FF8A00]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 group-hover:text-[#FF8A00] transition-all" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-[#101827]">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Embedded Super Admin User & Role Management */}
      {isSuperAdmin && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-[#101827]">User Accounts &amp; Role Assignment</h2>
              <p className="text-xs text-slate-500">
                Promote or reassign staff across all roles or suspend access instantly.
              </p>
            </div>
            <Link
              href="/dashboard/admin/users"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#FF8A00] hover:underline"
            >
              <span>Open Full User Directory</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2.5">Staff Member</th>
                  <th className="px-3 py-2.5">Email / Telephone</th>
                  <th className="px-3 py-2.5">Role &amp; Access</th>
                  <th className="px-3 py-2.5 text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70">
                    <td className="px-3 py-2.5 font-semibold text-slate-900">{u.name}</td>
                    <td className="px-3 py-2.5 text-slate-600">{formatUserContact(u.email, u.phone)}</td>
                    <td className="px-3 py-2.5">
                      <UserRoleActions
                        userId={u.id}
                        currentRole={u.role}
                        isActive={u.isActive}
                        isCurrentUser={u.id === actor.id}
                      />
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Link
                        href={`/dashboard/history?userId=${u.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        <History className="h-3 w-3" />
                        <span>Logs</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Recent System Audit Activity */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Audit Activity</h2>
            <p className="text-xs text-slate-500">Latest immutable actions logged across authentication and operations.</p>
          </div>
          <Link
            href="/dashboard/history"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#FF8A00] hover:underline"
          >
            <span>View All History</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentLogs.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500">No audit activity recorded yet.</p>
        ) : (
          <div className="mt-3 divide-y divide-slate-100">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2.5 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-orange-50 px-2 py-0.5 font-semibold text-[#FF8A00]">
                    {formatModule(log.entity)}
                  </span>
                  <span className="font-semibold text-slate-900">
                    {formatActivity(log.action, log.entity)}
                  </span>
                  <span className="text-slate-500">
                    by {log.user?.name || "System"} ({formatRole(log.role)})
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {log.createdAt.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
