import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, BarChart3 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  UsersManagementClient,
  ManagedUser,
  ManagedCooperative,
} from "@/components/admin/UsersManagementClient";

export const dynamic = "force-dynamic";

export default async function UsersManagementPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const [rawUsers, rawCooperatives] = await Promise.all([
    prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        nationalId: true,
        role: true,
        isActive: true,
        createdAt: true,
        districtName: true,
        sectorName: true,
        cellName: true,
        villageName: true,
        address: true,
        cooperativeId: true,
      },
    }),
    prisma.cooperative
      .findMany({
        select: {
          id: true,
          name: true,
          cellName: true,
        },
        orderBy: { name: "asc" },
      })
      .catch(() => [] as ManagedCooperative[]),
  ]);

  const users: ManagedUser[] = rawUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    nationalId: u.nationalId,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : String(u.createdAt),
    districtName: u.districtName,
    sectorName: u.sectorName,
    cellName: u.cellName,
    villageName: u.villageName,
    address: u.address,
    cooperativeId: u.cooperativeId,
  }));

  const cooperatives: ManagedCooperative[] = rawCooperatives.map((c) => ({
    id: c.id,
    name: c.name,
    cellName: c.cellName,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#101827]">Users &amp; Citizen Role Governance</h1>
          <p className="mt-1 text-sm text-slate-600">
            Audit platform users, inspect Rwandan National IDs (Irangamuntu), and manage district duty stations.
          </p>
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

      <UsersManagementClient
        users={users}
        cooperatives={cooperatives}
        currentUserId={session.user.id}
      />
    </div>
  );
}

