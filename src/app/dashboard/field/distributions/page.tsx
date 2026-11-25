import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { DistributionsTableClient } from "./DistributionsTableClient";

export const dynamic = "force-dynamic";

export default async function FieldDistributionsPage() {
  const session = await getServerSession(authOptions);

  const allowedRoles = new Set([
    "CELL_MANAGER",
    "COOPERATIVE_LEADER",
    "PROJECT_MANAGER",
    "SUPER_ADMIN",
  ]);
  if (!session || !allowedRoles.has(session.user.role || "")) {
    redirect("/dashboard");
  }

  const isGlobalManager =
    session.user.role === "SUPER_ADMIN" || session.user.role === "PROJECT_MANAGER";

  const [distributions, memberUsers] = await Promise.all([
    prisma.pigDistribution.findMany({
      where: isGlobalManager ? undefined : { distributedById: session.user.id },
      orderBy: { distributionDate: "desc" },
      include: {
        pig: true,
        beneficiary: true,
      },
    }),
    prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
    }),
  ]);

  const userNameMap = new Map(memberUsers.map((u) => [String(u.id), u.name]));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-serif text-[#1c2b23]">My Distributions</h1>
          <p className="mt-1 text-sm text-[#5d6e64]">
            Pigs you have distributed to beneficiaries and Finance-approved cooperative members.
          </p>
        </div>
        <Link href="/dashboard/field/distributions/new" className="inline-flex items-center px-4 py-2 bg-[#2c5a43] text-white text-sm font-medium rounded-md hover:bg-[#1c2b23] transition-colors">
          <PlusCircle className="h-4 w-4 mr-2" />
          Payment Queue &amp; Distribution
        </Link>
      </div>

      <DistributionsTableClient
        initialDistributions={distributions.map((dist) => {
          const resolvedName =
            dist.beneficiary?.fullName ||
            dist.pig?.ownerMemberName ||
            userNameMap.get(String(dist.beneficiaryId)) ||
            null;
          return {
            id: dist.id,
            distributionDate: dist.distributionDate,
            notes: dist.notes,
            pig: dist.pig ? { tagNumber: dist.pig.tagNumber } : null,
            beneficiary: resolvedName ? { fullName: resolvedName } : null,
          };
        })}
      />
    </div>
  );
}
