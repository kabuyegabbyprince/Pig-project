import { getCachedSession } from "@/lib/session";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getRoleLabel, normalizeRoleValue } from "@/lib/roles";
import { getFieldDashboardSummary } from "@/app/actions/cooperative";
import { prisma, isSupabaseSchemaMissingError } from "@/lib/prisma";
import {
  getUserAddressProfile,
  isCellManagerProfileComplete,
} from "@/lib/user-profile-address";
import { CellManagerProfileCard } from "@/components/field/CellManagerProfileCard";
import {
  AlertTriangle,
  ArrowLeftCircle,
  ArrowRightCircle,
  Building2,
  ClipboardList,
  Crown,
  FileText,
  KeyRound,
  PiggyBank,
  Settings,
  Tag,
  UsersRound,
  Wheat,
} from "lucide-react";

export const dynamic = "force-dynamic";

async function loadCellManagerUserSummary(userId: string) {
  try {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, phone: true, nationalId: true },
    });
    return { user: row, schemaMigrationNeeded: false };
  } catch (err) {
    if (isSupabaseSchemaMissingError(err)) {
      const fallback = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, phone: true },
      });
      const linkedBen = await prisma.beneficiary
        .findFirst({
          where: { beneficiaryNumber: `COOP-${userId}` },
          select: { nationalId: true },
        })
        .catch(() => null);
      return {
        user: fallback
          ? { ...fallback, nationalId: linkedBen?.nationalId ?? null }
          : null,
        schemaMigrationNeeded: true,
      };
    }
    throw err;
  }
}

export default async function FieldDashboard({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getCachedSession();
  if (!session) {
    redirect("/login");
  }

  const [data, params] = await Promise.all([
    getFieldDashboardSummary(),
    searchParams,
  ]);
  const role = data?.actor.role ?? normalizeRoleValue(session.user?.role);

  const isMember = role === "COOPERATIVE_MEMBER";
  const isLeader = role === "COOPERATIVE_LEADER";
  const isCellOrAdmin = role === "CELL_MANAGER" || role === "SUPER_ADMIN";

  const isCellManager = role === "CELL_MANAGER";

  const [cellSummaryResult, cellAddressProfile] = isCellManager && session.user?.id
    ? await Promise.all([
        loadCellManagerUserSummary(session.user.id),
        getUserAddressProfile(session.user.id),
      ])
    : [{ user: null, schemaMigrationNeeded: false }, null];

  const cellUserRow = cellSummaryResult.user;
  const schemaMigrationNeeded = cellSummaryResult.schemaMigrationNeeded;

  const isCellProfileComplete =
    isCellManager && cellAddressProfile
      ? isCellManagerProfileComplete(cellUserRow?.phone, cellAddressProfile, cellUserRow?.nationalId)
      : true;

  const profileSuccess = params.profileSuccess === "1";
  const profileError =
    typeof params.profileError === "string" ? params.profileError : null;

  const cooperatives = data?.cooperatives ?? [];
  const primaryCoop =
    cooperatives.find((c) => c.id === data?.actor.cooperativeId) ?? cooperatives[0] ?? null;

  const totalMembersCount = data?.totalMembersCount ?? 0;
  const animalsCount = data?.animalsCount ?? 0;
  const memberReportsCount = data?.memberReportsCount ?? 0;
  const pendingReportsCount = data?.pendingReportsCount ?? 0;
  const escalatedReportsCount = data?.escalatedReportsCount ?? 0;
  const recentReports = data?.recentReports ?? [];

  const quickActions = isMember
    ? [
        {
          label: "My Animals & Records",
          href: "/dashboard/field/my-animals",
          icon: PiggyBank,
        },
        {
          label: "Submit Report to Manager",
          href: "/dashboard/field/member-reports",
          icon: ClipboardList,
        },
        {
          label: "Personal Settings & Password",
          href: "/dashboard/settings",
          icon: Settings,
        },
      ]
    : isLeader
      ? [
          {
            label: "My Cooperative (Max 15)",
            href: "/dashboard/field/cooperative",
            icon: UsersRound,
          },
          {
            label: "Review Member Reports",
            href: "/dashboard/field/member-reports",
            icon: ClipboardList,
          },
          {
            label: "Cooperative Animals",
            href: "/dashboard/field/my-animals",
            icon: PiggyBank,
          },
          {
            label: "Record Distribution",
            href: "/dashboard/field/distributions",
            icon: ArrowRightCircle,
          },
          {
            label: "Record Return",
            href: "/dashboard/field/returns",
            icon: ArrowLeftCircle,
          },
          {
            label: "Submit Daily Report",
            href: "/dashboard/field/reports/new",
            icon: FileText,
          },
        ]
      : [
          {
            label: "Cooperatives & Managers (Max 15)",
            href: "/dashboard/field/cooperative",
            icon: Building2,
          },
          {
            label: "Cooperative Escalations",
            href: "/dashboard/field/member-reports",
            icon: ClipboardList,
          },
          {
            label: "Report Animal Stock (Gebyian)",
            href: "/dashboard/field/stock-reports",
            icon: Tag,
          },
          {
            label: "Animal Food Sales (Cell)",
            href: "/dashboard/field/feed-sales",
            icon: Wheat,
          },
          {
            label: "Member & Coop Animals",
            href: "/dashboard/field/my-animals",
            icon: PiggyBank,
          },
          {
            label: "Record Distribution",
            href: "/dashboard/field/distributions",
            icon: ArrowRightCircle,
          },
          {
            label: "Record Return",
            href: "/dashboard/field/returns",
            icon: ArrowLeftCircle,
          },
        ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FF8A00]">
            {getRoleLabel(role)} · Operations Workspace
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#101827]">
            Welcome back, {data?.actor.name || session.user?.name}
          </h1>
        </div>
        {primaryCoop && !isCellOrAdmin && (
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-[#101827] shadow-xs">
            <UsersRound className="h-4 w-4 text-[#FF8A00]" />
            <span>
              {primaryCoop.name} ({primaryCoop.memberCount}/{primaryCoop.maxMembers} members)
            </span>
          </div>
        )}
      </div>

      {/* Static Password Alert */}
      {data?.actor.mustChangePassword && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <KeyRound className="h-5 w-5 text-[#FF8A00] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-[#101827]">
                Static Initial Password Active — Please Update Your Password
              </p>
              <p className="mt-0.5 text-xs text-slate-700">
                Your account was provisioned with a static initial password by your Cell Manager. Update it to your own private password in Personal Settings.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-2 rounded-xl bg-[#101827] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1f2937] transition shrink-0"
          >
            <Settings className="h-3.5 w-3.5 text-[#FF8A00]" />
            <span>Change Password</span>
          </Link>
        </div>
      )}

      {schemaMigrationNeeded && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-[#FF8A00] shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Database Column Update Pending (update.sql)</p>
            <p className="mt-0.5 leading-relaxed">
              The <span className="font-mono font-semibold">users.national_id</span> column is not yet provisioned in Supabase. Execute{" "}
              <span className="font-mono font-semibold">update.sql</span> in your Supabase SQL Editor so National IDs save directly on user accounts.
            </p>
          </div>
        </div>
      )}

      {/* Cell Manager Profile & Address Completion */}
      {isCellManager && cellAddressProfile && (
        <CellManagerProfileCard
          userName={cellUserRow?.name || data?.actor.name || session.user?.name || ""}
          userPhone={cellUserRow?.phone ?? ""}
          userNationalId={cellUserRow?.nationalId ?? ""}
          addressProfile={cellAddressProfile}
          isComplete={isCellProfileComplete}
          profileSuccess={profileSuccess}
          profileError={profileError}
        />
      )}

      {/* KPI Summary Cards */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {isCellOrAdmin && (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-[#FF8A00]">
                <Building2 className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Cooperatives (Max 15 each)
              </p>
              <p className="mt-2 text-2xl font-bold text-[#101827]">{cooperatives.length}</p>
              <p className="mt-1 text-xs text-slate-500">{totalMembersCount} active members enrolled</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-[#101827]">
                <ClipboardList className="h-5 w-5 text-[#FF8A00]" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Coop Escalations
              </p>
              <p className="mt-2 text-2xl font-bold text-[#101827]">{escalatedReportsCount}</p>
              <p className="mt-1 text-xs text-slate-500">Escalated by Cooperative Managers</p>
            </div>
          </>
        )}

        {(isLeader || isMember) && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-[#FF8A00]">
              <UsersRound className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              My Cooperative
            </p>
            <p className="mt-2 text-lg font-bold text-[#101827]">
              {primaryCoop ? primaryCoop.name : "Not Assigned Yet"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {primaryCoop
                ? `${primaryCoop.memberCount}/${primaryCoop.maxMembers} members · Manager: ${primaryCoop.leaderName || "Pending"}`
                : "Ask Cell Manager to assign you"}
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-[#101827]">
            <PiggyBank className="h-5 w-5 text-[#FF8A00]" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {isMember ? "My Tracked Animals" : "Cooperative Animals"}
          </p>
          <p className="mt-2 text-2xl font-bold text-[#101827]">{animalsCount}</p>
          <p className="mt-1 text-xs text-slate-500">Registered with weight &amp; health records</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-[#FF8A00]">
            <ClipboardList className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {isMember ? "Reports Sent to Manager" : "Member Reports"}
          </p>
          <p className="mt-2 text-2xl font-bold text-[#101827]">{memberReportsCount}</p>
          <p className="mt-1 text-xs text-slate-500">
            {pendingReportsCount} awaiting manager review
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <h2 className="text-xl font-bold text-[#101827]">Quick actions</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map(({ label, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:border-[#FF8A00] hover:bg-orange-50/40 transition-colors"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white border border-slate-200 text-[#FF8A00]">
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-sm font-semibold text-[#101827]">{label}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Role-Specific Overview Panel */}
      {isCellOrAdmin && cooperatives.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-[#101827]">Cooperatives Overview (Max 15 Members)</h2>
            <Link
              href="/dashboard/field/cooperative"
              className="text-xs font-semibold text-[#FF8A00] hover:underline"
            >
              Manage Cooperatives &amp; Managers →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cooperatives.map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-sm text-[#101827]">{c.name}</p>
                  <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-bold text-[#FF8A00] border border-orange-200">
                    {c.memberCount}/{c.maxMembers}
                  </span>
                </div>
                <p className="text-xs text-slate-600">Cell: {c.cellName}</p>
                <p className="text-xs text-slate-600 flex items-center gap-1.5">
                  <Crown className="h-3.5 w-3.5 text-[#FF8A00]" />
                  <span>Manager: {c.leaderName || "Not assigned"}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {(isLeader || isMember) && recentReports.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-[#101827]">
              {isLeader ? "Recent Incoming Member Reports" : "Recent Reports Sent to Manager"}
            </h2>
            <Link
              href="/dashboard/field/member-reports"
              className="text-xs font-semibold text-[#FF8A00] hover:underline"
            >
              Open Reports Workspace →
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentReports.map((r) => (
              <div key={r.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div>
                  <p className="font-semibold text-[#101827]">{r.summary}</p>
                  <p className="text-slate-500">
                    {r.memberName} · {r.reportType.replace(/_/g, " ")} · {r.animalCount} animal(s)
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-[#101827] shrink-0">
                  {r.status.replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
