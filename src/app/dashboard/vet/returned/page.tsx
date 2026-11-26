import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getBadStatusPigs } from "@/app/actions/veterinary";
import {
  BadStatusManagerClient,
  type ReturnedPigletVerificationItem,
} from "@/components/veterinary/BadStatusManagerClient";

export const dynamic = "force-dynamic";

function toIsoString(val: unknown): string {
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "string" || typeof val === "number") {
    const d = new Date(val);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

export default async function VetBadStatusPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "VETERINARIAN" && session.user.role !== "SUPER_ADMIN")) {
    redirect("/dashboard");
  }

  let badStatusPigs: Awaited<ReturnType<typeof getBadStatusPigs>> = [];
  let pendingReturns: ReturnedPigletVerificationItem[] = [];

  try {
    const [badPigs, returnedRows] = await Promise.all([
      getBadStatusPigs(),
      prisma.pigReturn.findMany({
        where: { veterinaryVerified: false },
        orderBy: { returnDate: "desc" },
        include: {
          pig: true,
          beneficiary: {
            select: {
              fullName: true,
              beneficiaryNumber: true,
            },
          },
        },
      }),
    ]);

    badStatusPigs = badPigs;
    pendingReturns = returnedRows.map((item) => ({
      id: item.id,
      returnDate: toIsoString(item.returnDate),
      pigId: item.pig?.id ?? null,
      pigTag: item.pig?.tagNumber ?? "Registered Piglet",
      beneficiaryName: item.beneficiary?.fullName ?? "Beneficiary",
      beneficiaryNumber: item.beneficiary?.beneficiaryNumber ?? "—",
      veterinaryVerified: Boolean(item.veterinaryVerified),
      healthStatus: item.pig?.healthStatus ?? "UNCHECKED",
      status: item.pig?.status ?? "REGISTERED",
    }));
  } catch (error) {
    console.error("Failed to load VetBadStatusPage:", error);
  }

  return (
    <BadStatusManagerClient
      badStatusPigs={badStatusPigs}
      pendingReturns={pendingReturns}
    />
  );
}
