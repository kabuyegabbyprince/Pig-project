import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { createUser } from "@/app/actions/user";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { formatUserContact } from "@/lib/phone-utils";
import {
  CELL_MANAGER_COOP_ROLE_OPTIONS,
  getRoleLabel,
  normalizeRoleValue,
} from "@/lib/roles";
import { UserPlus, Users, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CooperativeManagementPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }> | { error?: string };
}) {
  const session = await getServerSession(authOptions);
  const actorRole = normalizeRoleValue(session?.user?.role);

  if (
    !session ||
    (actorRole !== Role.SUPER_ADMIN &&
      actorRole !== Role.CELL_MANAGER &&
      actorRole !== Role.COOPERATIVE_LEADER)
  ) {
    redirect("/dashboard");
  }

  const params = await Promise.resolve(searchParams ?? {});
  const errorMessage = params.error ? decodeURIComponent(params.error) : "";

  const cooperativeUsers = await prisma.user.findMany({
    where: {
      deletedAt: null,
      role: { in: [Role.COOPERATIVE_LEADER, Role.COOPERATIVE_MEMBER] },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  const allowedRoleOptions =
    actorRole === Role.COOPERATIVE_LEADER
      ? CELL_MANAGER_COOP_ROLE_OPTIONS.filter(
          (r) => r.value === Role.COOPERATIVE_MEMBER
        )
      : CELL_MANAGER_COOP_ROLE_OPTIONS;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#FF8A00]">
          Cell Cooperative Management
        </p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-[#101827]">
          Cooperative Leaders &amp; Members
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Register and manage Cooperative Leaders and Cooperative Members operating within your cell.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {/* Add Cooperative Account Form */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-[#FF8A00]">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#101827]">
              Register Cooperative Leader / Member
            </h2>
            <p className="text-xs text-slate-500">
              Accounts created here can sign in directly using their assigned role.
            </p>
          </div>
        </div>

        <form action={createUser} className="space-y-4">
          <input type="hidden" name="returnTo" value="/dashboard/field/cooperative" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:ring-2 focus:ring-[#FF8A00]/20 outline-none"
                placeholder="Mukamana Alice"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Email *
              </label>
              <input
                type="email"
                name="email"
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:ring-2 focus:ring-[#FF8A00]/20 outline-none"
                placeholder="member@cooperative.rw"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Telephone
              </label>
              <input
                type="text"
                name="phone"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:ring-2 focus:ring-[#FF8A00]/20 outline-none"
                placeholder="+250 788 000 000"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Cooperative Role *
              </label>
              <select
                name="role"
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:ring-2 focus:ring-[#FF8A00]/20 outline-none cursor-pointer"
              >
                <option value="">-- Select Role --</option>
                {allowedRoleOptions.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Initial Password *
              </label>
              <input
                type="password"
                name="password"
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:ring-2 focus:ring-[#FF8A00]/20 outline-none"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-end">
              <SubmitButton
                pendingText="Saving..."
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#101827] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1f2937] transition-colors cursor-pointer"
              >
                <UserPlus className="h-4 w-4 text-[#FF8A00]" />
                <span>Add Cooperative Account</span>
              </SubmitButton>
            </div>
          </div>
        </form>
      </div>

      {/* Cooperative Directory Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <Users className="h-5 w-5 text-[#FF8A00]" />
            <h2 className="text-sm font-bold text-[#101827]">
              Registered Cooperative Accounts ({cooperativeUsers.length})
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-[#101827]">
              {cooperativeUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                    No Cooperative Leaders or Cooperative Members registered yet.
                  </td>
                </tr>
              ) : (
                cooperativeUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3 font-medium">{u.name}</td>
                    <td className="px-5 py-3 text-slate-600">
                      {formatUserContact(u.email, u.phone)}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-[#FF8A00]">
                        {getRoleLabel(u.role)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          u.isActive
                            ? "bg-slate-100 text-[#101827]"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        <ShieldCheck className="h-3 w-3 text-[#FF8A00]" />
                        {u.isActive ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
