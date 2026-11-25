import { Role, RevolvingStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getActiveUser } from "@/lib/active-user";
import { prisma } from "@/lib/prisma";
import { ensureCooperativeBeneficiariesSynced } from "@/app/actions/cooperative";
import { normalizeRoleValue } from "@/lib/roles";

export async function GET(request: Request) {
  const user = await getActiveUser([
    Role.SUPER_ADMIN,
    Role.PROJECT_MANAGER,
    Role.CELL_MANAGER,
    Role.COOPERATIVE_LEADER,
    Role.COOPERATIVE_MEMBER,
    Role.VETERINARIAN,
  ]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureCooperativeBeneficiariesSynced();

  const actorRole = normalizeRoleValue(user.role) || user.role;
  const fullActor = await prisma.user.findUnique({
    where: { id: user.id },
    select: { cooperativeId: true },
  });

  const eligibleForDistribution =
    new URL(request.url).searchParams.get("purpose") === "distribution";

  const [rawBeneficiaries, coopMembers, cooperatives, payments] = await Promise.all([
    prisma.beneficiary.findMany({
      where: {
        deletedAt: null,
        beneficiaryNumber: { startsWith: "COOP-" },
        ...(eligibleForDistribution ? { status: { in: ["ACTIVE", "AWAITING_PIGLET"] } } : {}),
      },
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
        beneficiaryNumber: true,
        nationalId: true,
        status: true,
        districtId: true,
        sectorId: true,
        cellId: true,
        villageId: true,
        districtStr: true,
        sectorStr: true,
        cellStr: true,
        villageStr: true,
        savingsGroup: true,
        district: { select: { name: true } },
        sector: { select: { name: true } },
        cell: { select: { name: true } },
        village: { select: { name: true } },
        distributions: { select: { id: true } },
        returns: { select: { quantity: true } },
        revolvingCycles: {
          where: { status: { not: RevolvingStatus.CANCELLED } },
          select: { expectedReturn: true, status: true },
        },
        _count: {
          select: { legacyReturns: true },
        },
      },
    }),
    prisma.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        cooperativeId: { not: null },
        role: { in: [Role.COOPERATIVE_MEMBER, Role.COOPERATIVE_LEADER] },
      },
      select: { id: true, role: true, cooperativeId: true },
    }),
    prisma.cooperative.findMany({
      select: { id: true, name: true, createdById: true },
    }),
    prisma.cooperativeMemberPayment
      .findMany({
        select: { memberId: true, cooperativeId: true, status: true },
      })
      .catch(() => []),
  ]);

  const memberById = new Map(coopMembers.map((m) => [m.id, m]));
  const coopById = new Map(cooperatives.map((c) => [c.id, c]));
  const paymentByKey = new Map(
    payments.map((p) => [`${p.memberId}:${p.cooperativeId}`, p.status])
  );

  const beneficiaries = rawBeneficiaries.flatMap((b) => {
    const memberId = b.beneficiaryNumber.replace(/^COOP-/, "");
    const member = memberById.get(memberId);
    if (!member || !member.cooperativeId) return [];
    const coop = coopById.get(member.cooperativeId);
    if (!coop) return [];

    if (actorRole === Role.CELL_MANAGER && String(coop.createdById) !== String(user.id)) {
      return [];
    }
    if (
      actorRole === Role.COOPERATIVE_LEADER &&
      String(coop.id) !== String(fullActor?.cooperativeId ?? "")
    ) {
      return [];
    }
    if (actorRole === Role.COOPERATIVE_MEMBER && String(member.id) !== String(user.id)) {
      return [];
    }

    const paymentStatus = paymentByKey.get(`${member.id}:${coop.id}`) || "NOT_SUBMITTED";
    if (eligibleForDistribution && paymentStatus !== "VERIFIED") {
      return [];
    }

    const memberRole = normalizeRoleValue(member.role) || member.role;
    const distributionsCount = b.distributions.length;
    const cycleObligation = b.revolvingCycles.reduce((sum, c) => sum + c.expectedReturn, 0);
    // Base obligation is 2 piglets per distributed pig received from the foundation
    const totalRequired = Math.max(cycleObligation, distributionsCount > 0 ? distributionsCount * 2 : 2);
    const totalReturned =
      b.returns.reduce((sum, r) => sum + (r.quantity ?? 1), 0) + (b._count?.legacyReturns ?? 0);
    const remaining = Math.max(0, totalRequired - totalReturned);

    const returnStatus =
      totalReturned >= totalRequired && totalRequired > 0
        ? "Completed"
        : totalReturned > 0
          ? "Partially Returned"
          : "Pending";

    return [
      {
        id: b.id,
        fullName: b.fullName,
        beneficiaryNumber: b.beneficiaryNumber,
        nationalId: b.nationalId,
        status: b.status,
        role: memberRole,
        cooperativeId: coop.id,
        cooperativeName: coop.name || b.savingsGroup || "",
        paymentStatus,
        districtId: b.districtId,
        sectorId: b.sectorId,
        cellId: b.cellId,
        villageId: b.villageId,
        district: b.district?.name || b.districtStr || "",
        sector: b.sector?.name || b.sectorStr || "",
        cell: b.cell?.name || b.cellStr || "",
        village: b.village?.name || b.villageStr || "",
        distributionsCount,
        totalRequired,
        totalReturned,
        remaining,
        returnStatus,
      },
    ];
  });

  return NextResponse.json(beneficiaries);
}
