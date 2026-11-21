import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, UserCheck, UserX, BarChart3, Activity } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { ROLE_OPTIONS, getRoleLabel, getRoleMeta, normalizeRoleValue } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function UserAnalyticsPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      lastLoginAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const totalUsers = users.length;
  const activeStaff = users.filter((u) => u.isActive).length;
  const inactiveStaff = totalUsers - activeStaff;

  const roleCounts: Record<Role, number> = {
    SUPER_ADMIN: 0,
    PROJECT_MANAGER: 0,
    CELL_MANAGER: 0,
    COOPERATIVE_LEADER: 0,
    COOPERATIVE_MEMBER: 0,
    VETERINARIAN: 0,
    ACCOUNTANT: 0,
    FINANCE_OFFICER: 0,
    TRAINER: 0,
    FUNDER: 0,
  };

  for (const user of users) {
    const norm = normalizeRoleValue(user.role);
    if (norm && norm in roleCounts) {
      roleCounts[norm]++;
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/admin/users"
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#FF8A00]">System Administration</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#101827]">User Access & Role Analytics</h1>
            <p className="mt-1 text-sm text-slate-600">
              Graphical summary and distribution analysis of registered staff accounts and system permissions.
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/admin/users/new"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#101827] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1f2937] shadow-xs transition"
        >
          <Users className="h-4 w-4 text-[#FF8A00]" />
          Register New User
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-5 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-[#101827]">
            <Users className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-600">Total Registered Users</p>
          <p className="mt-3 text-3xl font-bold text-[#101827] sm:text-4xl">{totalUsers}</p>
          <p className="mt-1 text-xs text-slate-500">Active system accounts</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-[#FF8A00]">
            <UserCheck className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-600">Active Staff Accounts</p>
          <p className="mt-3 text-3xl font-bold text-[#FF8A00] sm:text-4xl">{activeStaff}</p>
          <p className="mt-1 text-xs text-slate-500">Currently authorized for access</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
            <UserX className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-600">Inactive Accounts</p>
          <p className="mt-3 text-3xl font-bold text-rose-700 sm:text-4xl">{inactiveStaff}</p>
          <p className="mt-1 text-xs text-rose-600">Suspended or disabled staff</p>
        </div>
      </div>

      {/* Role Distribution Visual Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#FF8A00]">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#101827]">User Role Distribution</h2>
            <p className="text-xs text-slate-600">Proportional allocation of staff across project permission levels.</p>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {ROLE_OPTIONS.map((roleOpt) => {
            const count = roleCounts[roleOpt.value] ?? 0;
            const percentage = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0;
            const meta = getRoleMeta(roleOpt.value);

            return (
              <div key={roleOpt.value} className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#101827]">{meta.label}</span>
                    <span className="text-xs text-slate-500">({roleOpt.value})</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
                    <span>{count} {count === 1 ? "user" : "users"}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[#101827]">{percentage}%</span>
                  </div>
                </div>

                <p className="text-xs text-slate-500">{meta.description}</p>

                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${meta.badgeColor}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Staff Activity Summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-[#101827]">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#101827]">Staff Directory & Login Status</h2>
            <p className="text-xs text-slate-600">Overview of all registered users and their account status.</p>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#101827] uppercase">Staff Member</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#101827] uppercase">Email / Username</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#101827] uppercase">Assigned Role</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#101827] uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#101827] uppercase">Last Login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-sm text-[#101827]">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-[#FF8A00]">
                      {getRoleLabel(u.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${u.isActive ? "bg-orange-100 text-[#101827]" : "bg-red-100 text-red-800"}`}>
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "Never logged in"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
