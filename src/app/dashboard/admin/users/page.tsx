import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, UserCircle2, History, BarChart3 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { DeleteUserButton } from "./DeleteUserButton";
import { UserRoleActions } from "@/components/admin/UserRoleActions";
import { formatUserContact } from "@/lib/phone-utils";

export const dynamic = 'force-dynamic';

export default async function UsersManagementPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'SUPER_ADMIN') {
    redirect("/dashboard");
  }

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#101827]">Users &amp; Role Governance</h1>
          <p className="mt-1 text-sm text-slate-600">Assign roles, toggle active access, and audit all platform accounts.</p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard/admin/users/analytics"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-[#101827] shadow-xs hover:bg-slate-50 transition"
          >
            <BarChart3 className="h-4 w-4 text-[#FF8A00]" />
            <span>Role Analytics</span>
          </Link>
          <Link
            href="/dashboard/admin/users/new"
            className="inline-flex items-center gap-2 rounded-lg bg-[#101827] px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#1f2937] transition"
          >
            <Plus className="h-4 w-4 text-[#FF8A00]" />
            <span>Add User</span>
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-[#101827]">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email / Telephone</th>
                <th className="px-4 py-3">Role &amp; Access Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No users found yet.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-50 text-[#FF8A00]">
                          <UserCircle2 className="h-5 w-5" />
                        </span>
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatUserContact(user.email, user.phone)}</td>
                    <td className="px-4 py-3">
                      <UserRoleActions
                        userId={user.id}
                        currentRole={user.role}
                        isActive={user.isActive}
                        isCurrentUser={user.id === session.user.id}
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/history?userId=${user.id}`}
                          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold text-[#101827] hover:bg-orange-50 hover:text-[#FF8A00] border border-slate-200 transition"
                          title={`View activity history for ${user.name}`}
                        >
                          <History className="h-3.5 w-3.5 text-[#FF8A00]" />
                          <span>History</span>
                        </Link>
                        <DeleteUserButton
                          userId={user.id}
                          userName={user.name}
                          isCurrentUser={user.id === session.user.id}
                        />
                      </div>
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
