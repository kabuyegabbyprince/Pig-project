import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveUser } from "@/lib/active-user";
import { normalizeRoleValue } from "@/lib/roles";
import { ensureCooperativeBeneficiariesSynced } from "@/app/actions/cooperative";
import { BeneficiariesClient } from "./BeneficiariesClient";

export const dynamic = "force-dynamic";

export default async function BeneficiariesPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string | string[] }> | { q?: string | string[] };
}) {
  const actor = await getActiveUser([
    Role.SUPER_ADMIN,
    Role.PROJECT_MANAGER,
    Role.CELL_MANAGER,
    Role.COOPERATIVE_LEADER,
    Role.COOPERATIVE_MEMBER,
  ]);
  if (!actor) {
    redirect("/dashboard");
  }

  await ensureCooperativeBeneficiariesSynced();

  const resolvedParams = searchParams ? await Promise.resolve(searchParams) : undefined;
  const searchTerm = Array.isArray(resolvedParams?.q) ? resolvedParams.q[0] : resolvedParams?.q ?? "";
  const normalizedSearch = searchTerm.trim();

  const actorRole = normalizeRoleValue(actor.role) || actor.role;

  const [coopsRaw, coopUsersRaw, paymentsRaw, rawBeneficiaries] = await Promise.all([
    prisma.cooperative.findMany(),
    prisma.user.findMany({
      where: {
        deletedAt: null,
        cooperativeId: { not: null },
        role: { in: [Role.COOPERATIVE_MEMBER, Role.COOPERATIVE_LEADER] },
      },
      select: {
        id: true,
        role: true,
        cooperativeId: true,
        isActive: true,
      },
    }),
    prisma.cooperativeMemberPayment.findMany().catch(() => []),
    prisma.beneficiary.findMany({
      where: {
        deletedAt: null,
        beneficiaryNumber: { startsWith: "COOP-" },
        ...(normalizedSearch
          ? {
              OR: [
                { fullName: { contains: normalizedSearch, mode: "insensitive" } },
                { beneficiaryNumber: { contains: normalizedSearch, mode: "insensitive" } },
                { savingsGroup: { contains: normalizedSearch, mode: "insensitive" } },
                { districtStr: { contains: normalizedSearch, mode: "insensitive" } },
                { sectorStr: { contains: normalizedSearch, mode: "insensitive" } },
                { cellStr: { contains: normalizedSearch, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const coopById = new Map(coopsRaw.map((c) => [c.id, c]));
  const userById = new Map(coopUsersRaw.map((u) => [String(u.id), u]));
  const paymentByMemberId = new Map(paymentsRaw.map((p) => [String(p.memberId), p]));

  const actorUser = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { cooperativeId: true },
  });

  const visibleCoopIds = new Set(
    actorRole === Role.SUPER_ADMIN || actorRole === Role.PROJECT_MANAGER
      ? coopsRaw.map((c) => c.id)
      : actorRole === Role.CELL_MANAGER
        ? coopsRaw
            .filter((c) => String(c.createdById) === String(actor.id))
            .map((c) => c.id)
        : coopsRaw
            .filter(
              (c) =>
                c.id === actorUser?.cooperativeId ||
                String(c.leaderUserId) === String(actor.id)
            )
            .map((c) => c.id)
  );

  const scopedBeneficiaries = rawBeneficiaries.filter((b) => {
    const memberId = b.beneficiaryNumber.replace(/^COOP-/, "");
    const u = userById.get(memberId);
    if (!u || !u.cooperativeId) return false;
    if (actorRole === Role.COOPERATIVE_MEMBER) {
      return String(u.id) === String(actor.id);
    }
    return visibleCoopIds.has(u.cooperativeId);
  });

  const canEnroll =
    actorRole === Role.SUPER_ADMIN || actorRole === Role.CELL_MANAGER;

  return (
    <BeneficiariesClient
      canEnroll={canEnroll}
      initialBeneficiaries={scopedBeneficiaries.map((b) => {
        const memberId = b.beneficiaryNumber.replace(/^COOP-/, "");
        const u = userById.get(memberId);
        const coop = u?.cooperativeId ? coopById.get(u.cooperativeId) : undefined;
        const pm = paymentByMemberId.get(memberId);
        const normRole = normalizeRoleValue(u?.role);
        return {
          id: b.id,
          fullName: b.fullName,
          beneficiaryNumber: b.beneficiaryNumber,
          cooperativeName: coop?.name ?? b.savingsGroup ?? null,
          memberRoleLabel:
            normRole === Role.COOPERATIVE_LEADER ? "Cooperative Leader" : "Cooperative Member",
          paymentStatus: pm?.status ?? "NOT_SUBMITTED",
          districtStr: b.districtStr,
          sectorStr: b.sectorStr,
          cellStr: b.cellStr ?? coop?.cellName ?? null,
          status: b.status,
          registrationDate: b.registrationDate,
        };
      })}
      initialQuery={normalizedSearch}
    />
  );
}
