"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import {
  BeneficiaryStatus,
  NotificationType,
  PigHealthStatus,
  PigSex,
  PigStatus,
  Prisma,
  Role,
} from "@prisma/client";
import { prisma, isSupabaseSchemaMissingError } from "@/lib/prisma";
import { getActiveUser } from "@/lib/active-user";
import { invalidateAuthUserCache } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone-utils";
import { syncSupabaseAuthUser } from "@/lib/supabase-auth";
import { normalizeRoleValue } from "@/lib/roles";
import { checkPigVetClearance } from "@/lib/vet-clearance";
import {
  getUserAddressProfile,
  saveUserAddressProfile,
} from "@/lib/user-profile-address";

const MAX_COOPERATIVE_MEMBERS = 15;

export type MemberReportType =
  | "ROUTINE_UPDATE"
  | "HEALTH_CHECK"
  | "WEIGHT_GROWTH"
  | "BIRTH_NEW_PIGLETS"
  | "READY_TO_SELL"
  | "FEED_NEEDED";

export type MemberReportStatus = "SUBMITTED" | "REVIEWED" | "ESCALATED_TO_CELL";

export type SerializedCooperativeMember = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  nationalId: string | null;
  districtName: string | null;
  sectorName: string | null;
  cellName: string | null;
  villageName: string | null;
  address: string | null;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
  cooperativeId: string | null;
  animalCount: number;
  createdAt: string;
};

export type SerializedCooperative = {
  id: string;
  name: string;
  code: string | null;
  cellName: string;
  maxMembers: number;
  leaderUserId: string | null;
  leaderName: string | null;
  createdById: string;
  createdByName: string | null;
  isActive: boolean;
  memberCount: number;
  createdAt: string;
  members: SerializedCooperativeMember[];
};

export type SerializedCooperativeAnimal = {
  id: string;
  tagNumber: string;
  pigType: string | null;
  batchCode: string | null;
  breed: string | null;
  sex: string | null;
  currentWeight: number | null;
  estimatedAge: number | null;
  healthStatus: PigHealthStatus;
  status: PigStatus;
  notes: string | null;
  currentLocation: string | null;
  cooperativeId: string | null;
  cooperativeName: string | null;
  ownerMemberId: string | null;
  ownerMemberName: string | null;
  dateReceived: string;
  createdAt: string;
};

export type SerializedMemberReport = {
  id: string;
  cooperativeId: string;
  cooperativeName: string;
  memberId: string;
  memberName: string;
  leaderId: string | null;
  leaderName: string | null;
  pigId: string | null;
  pigTag: string | null;
  reportType: MemberReportType;
  animalCount: number;
  estimatedWeightKg: string | null;
  summary: string;
  notes: string | null;
  status: MemberReportStatus;
  leaderNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

export type SerializedMemberPaymentSummary = {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  cooperativeId: string;
  cooperativeName: string;
  pigValueFee: string;
  taxFee: string;
  totalAmount: string;
  momoReference: string;
  status: string;
  verifiedById: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CooperativesWorkspaceData = {
  schemaMissing: boolean;
  actor: {
    id: string;
    name: string;
    role: Role;
    cooperativeId: string | null;
    mustChangePassword: boolean;
    cellName: string | null;
  };
  cooperatives: SerializedCooperative[];
  animals: SerializedCooperativeAnimal[];
  availableStockPigs: SerializedCooperativeAnimal[];
  memberPayments: SerializedMemberPaymentSummary[];
  memberReports: SerializedMemberReport[];
  unassignedUsers: SerializedCooperativeMember[];
};

export type FieldDashboardSummary = {
  actor: {
    id: string;
    name: string;
    role: Role;
    cooperativeId: string | null;
    mustChangePassword: boolean;
  };
  cooperatives: Array<{
    id: string;
    name: string;
    cellName: string;
    maxMembers: number;
    leaderName: string | null;
    memberCount: number;
  }>;
  totalMembersCount: number;
  animalsCount: number;
  memberReportsCount: number;
  pendingReportsCount: number;
  escalatedReportsCount: number;
  recentReports: Array<{
    id: string;
    summary: string;
    memberName: string;
    reportType: MemberReportType;
    animalCount: number;
    status: MemberReportStatus;
  }>;
};

function revalidateAllCooperativePaths() {
  revalidatePath("/dashboard/field");
  revalidatePath("/dashboard/field/cooperative");
  revalidatePath("/dashboard/field/my-animals");
  revalidatePath("/dashboard/field/member-reports");
  revalidatePath("/dashboard/field/stock-reports");
  revalidatePath("/dashboard/field/distributions");
  revalidatePath("/dashboard/field/distributions/new");
  revalidatePath("/dashboard/field/pigs");
  revalidatePath("/dashboard/finance");
  revalidatePath("/dashboard/finance/pigs");
  revalidatePath("/dashboard/history");
  revalidatePath("/dashboard/admin/users");
}

function getFriendlyActionError(err: unknown, fallback: string): string {
  if (isSupabaseSchemaMissingError(err)) {
    return "Database migration required: please execute update.sql in your Supabase SQL Editor first.";
  }
  const msg = err instanceof Error ? err.message : String(err ?? "");
  if (msg.includes("Cooperative capacity limit reached")) {
    return "Cooperative is already at its maximum capacity of 15 members (including Cooperative Manager).";
  }
  return msg || fallback;
}

export async function syncBeneficiaryRecordForCoopUser(params: {
  userId: string;
  name: string;
  phone?: string | null;
  nationalId?: string | null;
  role: Role;
  isActive: boolean;
  cooperativeName: string;
  cellName?: string | null;
  districtName?: string | null;
  sectorName?: string | null;
  villageName?: string | null;
  createdById?: string | null;
}) {
  const beneficiaryNumber = `COOP-${params.userId}`;
  const roleLabel =
    params.role === Role.COOPERATIVE_LEADER ? "Cooperative Leader" : "Cooperative Member";
  const noteText = `${roleLabel} in ${params.cooperativeName}`;

  const existing = await prisma.beneficiary.findFirst({
    where: { beneficiaryNumber },
  });

  if (!existing) {
    return prisma.beneficiary.create({
      data: {
        beneficiaryNumber,
        fullName: params.name,
        phone: params.phone ?? null,
        nationalId: params.nationalId ?? null,
        districtStr: params.districtName ?? null,
        sectorStr: params.sectorName ?? null,
        cellStr: params.cellName ?? null,
        villageStr: params.villageName ?? null,
        savingsGroup: params.cooperativeName,
        status: params.isActive ? BeneficiaryStatus.ACTIVE : BeneficiaryStatus.INACTIVE,
        registrationDate: new Date(),
        createdById: params.createdById ?? null,
        notes: noteText,
      },
    });
  }

  const preserveProgressStatuses = new Set<BeneficiaryStatus>([
    BeneficiaryStatus.PIGLET_RECEIVED,
    BeneficiaryStatus.GROWING,
    BeneficiaryStatus.PREGNANT,
    BeneficiaryStatus.LITTER_BORN,
    BeneficiaryStatus.PIGLETS_GROWING,
    BeneficiaryStatus.REPAYMENT_DUE,
    BeneficiaryStatus.PARTIALLY_REPAID,
    BeneficiaryStatus.REPAID_3_PIGLETS,
    BeneficiaryStatus.COMPLETED,
  ]);

  const nextStatus = !params.isActive
    ? BeneficiaryStatus.INACTIVE
    : preserveProgressStatuses.has(existing.status)
      ? existing.status
      : BeneficiaryStatus.ACTIVE;

  return prisma.beneficiary.update({
    where: { id: existing.id },
    data: {
      fullName: params.name,
      phone: params.phone ?? existing.phone,
      nationalId: params.nationalId ?? existing.nationalId,
      districtStr: params.districtName ?? existing.districtStr,
      sectorStr: params.sectorName ?? existing.sectorStr,
      cellStr: params.cellName ?? existing.cellStr,
      villageStr: params.villageName ?? existing.villageStr,
      savingsGroup: params.cooperativeName,
      status: nextStatus,
      notes: noteText,
      deletedAt: null,
    },
  });
}

export async function ensureCooperativeBeneficiariesSynced() {
  try {
    const [coops, members] = await Promise.all([
      prisma.cooperative.findMany(),
      prisma.user.findMany({
        where: {
          deletedAt: null,
          cooperativeId: { not: null },
          role: { in: [Role.COOPERATIVE_MEMBER, Role.COOPERATIVE_LEADER] },
        },
      }),
    ]);

    if (members.length === 0) return;

    const coopById = new Map(coops.map((c) => [c.id, c]));
    const benNumbers = members.map((m) => `COOP-${m.id}`);
    const existingBens = await prisma.beneficiary.findMany({
      where: { beneficiaryNumber: { in: benNumbers } },
      select: { beneficiaryNumber: true },
    });
    const existingSet = new Set(existingBens.map((b) => b.beneficiaryNumber));

    for (const m of members) {
      const benNum = `COOP-${m.id}`;
      if (existingSet.has(benNum)) continue;
      const coop = m.cooperativeId ? coopById.get(m.cooperativeId) : undefined;
      if (!coop) continue;
      const normRole = normalizeRoleValue(m.role) || Role.COOPERATIVE_MEMBER;
      await syncBeneficiaryRecordForCoopUser({
        userId: String(m.id),
        name: m.name,
        phone: m.phone ?? null,
        nationalId: (m as { nationalId?: string | null }).nationalId ?? null,
        role: normRole,
        isActive: Boolean(m.isActive),
        cooperativeName: coop.name,
        cellName: m.cellName ?? coop.cellName,
        districtName: m.districtName ?? null,
        sectorName: m.sectorName ?? null,
        villageName: m.villageName ?? null,
        createdById: coop.createdById,
      });
    }
  } catch {
    // Non-blocking sync safeguard
  }
}

export async function getFieldDashboardSummary(): Promise<FieldDashboardSummary | null> {
  const actor = await getActiveUser([
    Role.SUPER_ADMIN,
    Role.CELL_MANAGER,
    Role.COOPERATIVE_LEADER,
    Role.COOPERATIVE_MEMBER,
  ]);
  if (!actor) return null;

  const actorRole = normalizeRoleValue(actor.role) || actor.role;

  const fullActor = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { id: true, cooperativeId: true, mustChangePassword: true },
  });

  const actorCoopId = fullActor?.cooperativeId ?? null;
  const mustChangePassword = Boolean(fullActor?.mustChangePassword);

  try {
    const [coopsRaw, coopUsersRaw, pigsRaw, reportsRaw] = await Promise.all([
      prisma.cooperative.findMany({
        select: {
          id: true,
          name: true,
          cellName: true,
          maxMembers: true,
          leaderUserId: true,
          leaderName: true,
          createdById: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.findMany({
        where: {
          deletedAt: null,
          cooperativeId: { not: null },
          role: { in: [Role.COOPERATIVE_LEADER, Role.COOPERATIVE_MEMBER] },
        },
        select: { id: true, cooperativeId: true },
      }),
      prisma.pig.findMany({
        where: { deletedAt: null },
        select: { id: true, cooperativeId: true, ownerMemberId: true },
      }),
      prisma.cooperativeMemberReport.findMany({
        select: {
          id: true,
          cooperativeId: true,
          memberId: true,
          leaderId: true,
          memberName: true,
          reportType: true,
          animalCount: true,
          summary: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const visibleCoops =
      actorRole === Role.SUPER_ADMIN
        ? coopsRaw
        : actorRole === Role.CELL_MANAGER
          ? coopsRaw.filter((c) => String(c.createdById) === String(actor.id))
          : actorCoopId
            ? coopsRaw.filter((c) => c.id === actorCoopId)
            : coopsRaw.filter((c) => String(c.leaderUserId) === String(actor.id));

    const visibleCoopIds = new Set(visibleCoops.map((c) => c.id));

    const memberCountByCoop = new Map<string, number>();
    for (const u of coopUsersRaw) {
      if (u.cooperativeId) {
        memberCountByCoop.set(
          u.cooperativeId,
          (memberCountByCoop.get(u.cooperativeId) ?? 0) + 1
        );
      }
    }

    const cooperatives = visibleCoops.map((c) => ({
      id: c.id,
      name: c.name,
      cellName: c.cellName,
      maxMembers: c.maxMembers || MAX_COOPERATIVE_MEMBERS,
      leaderName: c.leaderName ?? null,
      memberCount: memberCountByCoop.get(c.id) ?? 0,
    }));

    const totalMembersCount = cooperatives.reduce((sum, c) => sum + c.memberCount, 0);

    const animalsCount = pigsRaw.filter((p) => {
      if (actorRole === Role.SUPER_ADMIN) {
        return Boolean(p.cooperativeId || p.ownerMemberId);
      }
      if (actorRole === Role.CELL_MANAGER) {
        return Boolean(p.cooperativeId && visibleCoopIds.has(p.cooperativeId));
      }
      if (actorRole === Role.COOPERATIVE_LEADER) {
        return (
          (actorCoopId && p.cooperativeId === actorCoopId) ||
          (p.cooperativeId && visibleCoopIds.has(p.cooperativeId)) ||
          p.ownerMemberId === actor.id
        );
      }
      return p.ownerMemberId === actor.id;
    }).length;

    const scopedReports = reportsRaw.filter((r) => {
      if (actorRole === Role.SUPER_ADMIN) return true;
      if (actorRole === Role.CELL_MANAGER) return visibleCoopIds.has(r.cooperativeId);
      if (actorRole === Role.COOPERATIVE_LEADER) {
        return (
          (actorCoopId && r.cooperativeId === actorCoopId) ||
          r.leaderId === actor.id ||
          r.memberId === actor.id
        );
      }
      return r.memberId === actor.id;
    });

    const pendingReportsCount = scopedReports.filter((r) => r.status === "SUBMITTED").length;
    const escalatedReportsCount = scopedReports.filter(
      (r) => r.status === "ESCALATED_TO_CELL"
    ).length;

    const recentReports = scopedReports.slice(0, 4).map((r) => ({
      id: r.id,
      summary: r.summary,
      memberName: r.memberName,
      reportType: (r.reportType || "ROUTINE_UPDATE") as MemberReportType,
      animalCount: r.animalCount ?? 1,
      status: (r.status || "SUBMITTED") as MemberReportStatus,
    }));

    return {
      actor: {
        id: actor.id,
        name: actor.name,
        role: actorRole,
        cooperativeId: actorCoopId,
        mustChangePassword,
      },
      cooperatives,
      totalMembersCount,
      animalsCount,
      memberReportsCount: scopedReports.length,
      pendingReportsCount,
      escalatedReportsCount,
      recentReports,
    };
  } catch (err) {
    if (isSupabaseSchemaMissingError(err)) {
      return {
        actor: {
          id: actor.id,
          name: actor.name,
          role: actorRole,
          cooperativeId: actorCoopId,
          mustChangePassword,
        },
        cooperatives: [],
        totalMembersCount: 0,
        animalsCount: 0,
        memberReportsCount: 0,
        pendingReportsCount: 0,
        escalatedReportsCount: 0,
        recentReports: [],
      };
    }
    throw err;
  }
}

export async function getCooperativesWorkspaceData(): Promise<CooperativesWorkspaceData | null> {
  const actor = await getActiveUser([
    Role.SUPER_ADMIN,
    Role.CELL_MANAGER,
    Role.COOPERATIVE_LEADER,
    Role.COOPERATIVE_MEMBER,
  ]);
  if (!actor) return null;

  const [fullActor, addressProfile] = await Promise.all([
    prisma.user.findUnique({
      where: { id: actor.id },
    }),
    getUserAddressProfile(actor.id),
  ]);

  const actorCoopId = fullActor?.cooperativeId ?? null;
  const mustChangePassword = Boolean(fullActor?.mustChangePassword);
  const actorCellName = addressProfile.cellName || null;
  const actorRole = normalizeRoleValue(actor.role) || actor.role;

  try {
    const [coopsRaw, usersRaw, pigsRaw, reportsRaw, paymentsRaw, coopBeneficiariesRaw] = await Promise.all([
      prisma.cooperative.findMany({
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.findMany({
        where: {
          deletedAt: null,
          role: { in: [Role.COOPERATIVE_LEADER, Role.COOPERATIVE_MEMBER] },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.pig.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
      }),
      prisma.cooperativeMemberReport.findMany({
        orderBy: { createdAt: "desc" },
      }),
      prisma.cooperativeMemberPayment
        .findMany({
          orderBy: { createdAt: "desc" },
        })
        .catch(() => []),
      prisma.beneficiary
        .findMany({
          where: { beneficiaryNumber: { startsWith: "COOP-" } },
          select: {
            beneficiaryNumber: true,
            nationalId: true,
            districtStr: true,
            sectorStr: true,
            cellStr: true,
            villageStr: true,
          },
        })
        .catch(() => []),
    ]);

    const coopNameById = new Map<string, string>();
    for (const c of coopsRaw) {
      coopNameById.set(c.id, c.name);
    }

    const benByUserId = new Map<
      string,
      {
        nationalId: string | null;
        districtStr: string | null;
        sectorStr: string | null;
        cellStr: string | null;
        villageStr: string | null;
      }
    >();
    for (const b of coopBeneficiariesRaw) {
      if (b.beneficiaryNumber.startsWith("COOP-")) {
        benByUserId.set(b.beneficiaryNumber.slice(5), b);
      }
    }

    // Strict role scoping:
    // - SUPER_ADMIN sees all cooperatives
    // - CELL_MANAGER sees ONLY cooperatives (and members inside them) that he created
    // - COOPERATIVE_LEADER / COOPERATIVE_MEMBER see only their own cooperative
    const visibleCoops =
      actorRole === Role.SUPER_ADMIN
        ? coopsRaw
        : actorRole === Role.CELL_MANAGER
          ? coopsRaw.filter((c) => String(c.createdById) === String(actor.id))
          : actorCoopId
            ? coopsRaw.filter((c) => c.id === actorCoopId)
            : coopsRaw.filter((c) => String(c.leaderUserId) === String(actor.id));

    const visibleCoopIds = new Set(visibleCoops.map((c) => c.id));

    // Animal counts per owner
    const animalCountByOwner = new Map<string, number>();
    for (const p of pigsRaw) {
      if (p.ownerMemberId) {
        animalCountByOwner.set(
          p.ownerMemberId,
          (animalCountByOwner.get(p.ownerMemberId) ?? 0) + 1
        );
      }
    }

    const serializeMember = (u: (typeof usersRaw)[number]): SerializedCooperativeMember => {
      const uRecord = u as unknown as {
        nationalId?: string | null;
        districtName?: string | null;
        sectorName?: string | null;
        cellName?: string | null;
        villageName?: string | null;
        address?: string | null;
      };
      const benFallback = benByUserId.get(String(u.id));
      return {
        id: String(u.id),
        name: u.name,
        email: u.email,
        phone: u.phone ?? null,
        nationalId: uRecord.nationalId ?? benFallback?.nationalId ?? null,
        districtName: uRecord.districtName ?? benFallback?.districtStr ?? null,
        sectorName: uRecord.sectorName ?? benFallback?.sectorStr ?? null,
        cellName: uRecord.cellName ?? benFallback?.cellStr ?? null,
        villageName: uRecord.villageName ?? benFallback?.villageStr ?? null,
        address: uRecord.address ?? null,
        role: normalizeRoleValue(u.role) || u.role,
        isActive: Boolean(u.isActive),
        mustChangePassword: Boolean(u.mustChangePassword),
        cooperativeId: u.cooperativeId ?? null,
        animalCount: animalCountByOwner.get(String(u.id)) ?? 0,
        createdAt:
          u.createdAt instanceof Date
            ? u.createdAt.toISOString()
            : new Date(u.createdAt).toISOString(),
      };
    };

    const serializedUsers = usersRaw.map(serializeMember);
    const userById = new Map<string, SerializedCooperativeMember>();
    for (const u of serializedUsers) {
      userById.set(u.id, u);
    }

    const cooperatives: SerializedCooperative[] = visibleCoops.map((c) => {
      const members = serializedUsers.filter((u) => u.cooperativeId === c.id);
      // Put manager first in the member list
      members.sort((a, b) => {
        if (a.role === Role.COOPERATIVE_LEADER && b.role !== Role.COOPERATIVE_LEADER) return -1;
        if (a.role !== Role.COOPERATIVE_LEADER && b.role === Role.COOPERATIVE_LEADER) return 1;
        return a.name.localeCompare(b.name);
      });
      return {
        id: c.id,
        name: c.name,
        code: c.code ?? null,
        cellName: c.cellName,
        maxMembers: c.maxMembers || MAX_COOPERATIVE_MEMBERS,
        leaderUserId: c.leaderUserId ?? null,
        leaderName: c.leaderName ?? null,
        createdById: c.createdById,
        createdByName: c.createdByName ?? null,
        isActive: Boolean(c.isActive),
        memberCount: members.length,
        createdAt:
          c.createdAt instanceof Date
            ? c.createdAt.toISOString()
            : new Date(c.createdAt).toISOString(),
        members,
      };
    });

    // Only SUPER_ADMIN sees global unassigned users; Cell Managers manage members they add to their cooperatives
    const unassignedUsers =
      actorRole === Role.SUPER_ADMIN
        ? serializedUsers.filter((u) => !u.cooperativeId)
        : [];

    const serializePig = (p: (typeof pigsRaw)[number]): SerializedCooperativeAnimal => ({
      id: p.id,
      tagNumber: p.tagNumber,
      pigType: p.pigType ?? null,
      batchCode: p.batchCode ?? null,
      breed: p.breed ?? null,
      sex: p.sex ? String(p.sex) : null,
      currentWeight: p.currentWeight ?? null,
      estimatedAge: p.estimatedAge ?? p.daysAge ?? null,
      healthStatus: p.healthStatus,
      status: p.status,
      notes: p.notes ?? null,
      currentLocation: p.currentLocation ?? null,
      cooperativeId: p.cooperativeId ?? null,
      cooperativeName: p.cooperativeId ? coopNameById.get(p.cooperativeId) ?? null : null,
      ownerMemberId: p.ownerMemberId ?? null,
      ownerMemberName: p.ownerMemberName ?? null,
      dateReceived:
        p.dateReceived instanceof Date
          ? p.dateReceived.toISOString()
          : p.dateReceived
            ? new Date(p.dateReceived).toISOString()
            : p.createdAt instanceof Date
              ? p.createdAt.toISOString()
              : new Date(p.createdAt).toISOString(),
      createdAt:
        p.createdAt instanceof Date
          ? p.createdAt.toISOString()
          : new Date(p.createdAt).toISOString(),
    });

    // Filter cooperative/member animals strictly by role & owned cooperatives
    const scopedPigs = pigsRaw.filter((p) => {
      if (actorRole === Role.SUPER_ADMIN) {
        return Boolean(p.cooperativeId || p.ownerMemberId);
      }
      if (actorRole === Role.CELL_MANAGER) {
        return Boolean(p.cooperativeId && visibleCoopIds.has(p.cooperativeId));
      }
      if (actorRole === Role.COOPERATIVE_LEADER) {
        return (
          (actorCoopId && p.cooperativeId === actorCoopId) ||
          (p.cooperativeId && visibleCoopIds.has(p.cooperativeId)) ||
          p.ownerMemberId === actor.id
        );
      }
      // COOPERATIVE_MEMBER: only own animals
      return p.ownerMemberId === actor.id;
    });

    const animals: SerializedCooperativeAnimal[] = scopedPigs.map(serializePig);

    // Vet-cleared unallocated stock pigs available for Cell Manager / Admin distribution
    const availableStockPigs: SerializedCooperativeAnimal[] = [];
    if (actorRole === Role.SUPER_ADMIN || actorRole === Role.CELL_MANAGER) {
      const candidateStock = pigsRaw.filter(
        (p) =>
          !p.currentBeneficiaryId &&
          !p.ownerMemberId &&
          !p.cooperativeId &&
          (p.healthStatus === PigHealthStatus.HEALTHY ||
            p.healthStatus === PigHealthStatus.RECOVERED) &&
          (p.status === PigStatus.REGISTERED ||
            p.status === PigStatus.ACTIVE ||
            p.status === PigStatus.RETURNED)
      );
      const clearanceResults = await Promise.all(
        candidateStock.map(async (p) => ({
          pig: p,
          clearance: await checkPigVetClearance(p.id, "DISTRIBUTION"),
        }))
      );
      for (const item of clearanceResults) {
        if (item.clearance.cleared) {
          availableStockPigs.push(serializePig(item.pig));
        }
      }
    }

    // Scoped member qualification payments
    const memberPayments: SerializedMemberPaymentSummary[] = paymentsRaw
      .filter((pm) => {
        if (actorRole === Role.SUPER_ADMIN) return true;
        if (actorRole === Role.CELL_MANAGER || actorRole === Role.COOPERATIVE_LEADER) {
          return visibleCoopIds.has(String(pm.cooperativeId));
        }
        return String(pm.memberId) === String(actor.id);
      })
      .map((pm) => {
        const mem = userById.get(String(pm.memberId));
        return {
          id: pm.id,
          memberId: String(pm.memberId),
          memberName: mem?.name ?? "Cooperative Member",
          memberEmail: mem?.email ?? "",
          cooperativeId: String(pm.cooperativeId),
          cooperativeName: coopNameById.get(String(pm.cooperativeId)) ?? "Cooperative",
          pigValueFee: pm.pigValueFee.toString(),
          taxFee: pm.taxFee.toString(),
          totalAmount: pm.totalAmount.toString(),
          momoReference: pm.momoReference,
          status: pm.status,
          verifiedById: pm.verifiedById ?? null,
          createdAt:
            pm.createdAt instanceof Date
              ? pm.createdAt.toISOString()
              : new Date(pm.createdAt).toISOString(),
          updatedAt:
            pm.updatedAt instanceof Date
              ? pm.updatedAt.toISOString()
              : new Date(pm.updatedAt).toISOString(),
        };
      });

    // Filter member reports strictly to visible cooperatives
    const scopedReports = reportsRaw.filter((r) => {
      if (actorRole === Role.SUPER_ADMIN) {
        return true;
      }
      if (actorRole === Role.CELL_MANAGER) {
        return visibleCoopIds.has(r.cooperativeId);
      }
      if (actorRole === Role.COOPERATIVE_LEADER) {
        return (
          (actorCoopId && r.cooperativeId === actorCoopId) ||
          r.leaderId === actor.id ||
          r.memberId === actor.id
        );
      }
      return r.memberId === actor.id;
    });

    const memberReports: SerializedMemberReport[] = scopedReports.map((r) => ({
      id: r.id,
      cooperativeId: r.cooperativeId,
      cooperativeName: r.cooperativeName,
      memberId: r.memberId,
      memberName: r.memberName,
      leaderId: r.leaderId ?? null,
      leaderName: r.leaderName ?? null,
      pigId: r.pigId ?? null,
      pigTag: r.pigTag ?? null,
      reportType: (r.reportType || "ROUTINE_UPDATE") as MemberReportType,
      animalCount: r.animalCount ?? 1,
      estimatedWeightKg: r.estimatedWeightKg ? r.estimatedWeightKg.toString() : null,
      summary: r.summary,
      notes: r.notes ?? null,
      status: (r.status || "SUBMITTED") as MemberReportStatus,
      leaderNotes: r.leaderNotes ?? null,
      reviewedAt: r.reviewedAt
        ? r.reviewedAt instanceof Date
          ? r.reviewedAt.toISOString()
          : new Date(r.reviewedAt).toISOString()
        : null,
      createdAt:
        r.createdAt instanceof Date
          ? r.createdAt.toISOString()
          : new Date(r.createdAt).toISOString(),
    }));

    return {
      schemaMissing: false,
      actor: {
        id: actor.id,
        name: actor.name,
        role: actorRole,
        cooperativeId: actorCoopId,
        mustChangePassword,
        cellName: actorCellName,
      },
      cooperatives,
      animals,
      availableStockPigs,
      memberPayments,
      memberReports,
      unassignedUsers,
    };
  } catch (err) {
    if (isSupabaseSchemaMissingError(err)) {
      return {
        schemaMissing: true,
        actor: {
          id: actor.id,
          name: actor.name,
          role: actorRole,
          cooperativeId: actorCoopId,
          mustChangePassword,
          cellName: actorCellName,
        },
        cooperatives: [],
        animals: [],
        availableStockPigs: [],
        memberPayments: [],
        memberReports: [],
        unassignedUsers: [],
      };
    }
    throw err;
  }
}

export async function createCooperative(formData: FormData): Promise<{
  success: boolean;
  error?: string;
  cooperativeId?: string;
}> {
  const actor = await getActiveUser([Role.SUPER_ADMIN, Role.CELL_MANAGER]);
  if (!actor) {
    return {
      success: false,
      error: "Unauthorized: Only Cell Managers or Super Admins can create cooperatives.",
    };
  }

  const name = String(formData.get("name") || "").trim();
  const cellName = String(formData.get("cellName") || "").trim();
  const code = String(formData.get("code") || "").trim() || null;

  if (!name || !cellName) {
    return { success: false, error: "Cooperative Name and Cell / Akagari are required." };
  }

  try {
    const existing = await prisma.cooperative.findFirst({
      where: { name },
    });
    if (existing) {
      return { success: false, error: `A cooperative named "${name}" already exists.` };
    }

    const coopId = randomUUID();
    await prisma.cooperative.create({
      data: {
        id: coopId,
        name,
        code,
        cellName,
        maxMembers: MAX_COOPERATIVE_MEMBERS,
        createdById: actor.id,
        createdByName: actor.name,
        isActive: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        role: actor.role,
        action: "CREATED",
        entity: "COOPERATIVE",
        entityId: coopId,
        newValue: {
          name,
          code,
          cellName,
          maxMembers: MAX_COOPERATIVE_MEMBERS,
        },
      },
    });

    revalidateAllCooperativePaths();
    return { success: true, cooperativeId: coopId };
  } catch (err) {
    return {
      success: false,
      error: getFriendlyActionError(err, "Failed to create cooperative."),
    };
  }
}

export async function addCooperativeMember(formData: FormData): Promise<{
  success: boolean;
  error?: string;
}> {
  const actor = await getActiveUser([Role.SUPER_ADMIN, Role.CELL_MANAGER]);
  if (!actor) {
    return {
      success: false,
      error: "Unauthorized: Only Cell Managers can add cooperative members and set static passwords.",
    };
  }

  const cooperativeId = String(formData.get("cooperativeId") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const rawPhone = String(formData.get("phone") || "").trim();
  const nationalId = String(formData.get("nationalId") || "").trim().replace(/\s+/g, "");
  const districtName = String(formData.get("district") || "").trim();
  const sectorName = String(formData.get("sector") || "").trim();
  const cellName = String(formData.get("cell") || "").trim();
  const villageName = String(formData.get("village") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const requestedRoleRaw = String(formData.get("role") || "COOPERATIVE_MEMBER").trim();
  const staticPassword = String(formData.get("staticPassword") || "");

  if (!cooperativeId || !name || !email || !staticPassword || !nationalId) {
    return {
      success: false,
      error: "Cooperative, Full Name, Email, National ID, and Static Initial Password are required.",
    };
  }

  if (staticPassword.length < 6) {
    return {
      success: false,
      error: "Static initial password must be at least 6 characters.",
    };
  }

  const assignedRole =
    requestedRoleRaw === Role.COOPERATIVE_LEADER
      ? Role.COOPERATIVE_LEADER
      : Role.COOPERATIVE_MEMBER;

  const normalizedPhone = rawPhone ? normalizePhone(rawPhone) : null;

  try {
    const actorRole = normalizeRoleValue(actor.role) || actor.role;
    const coop = await prisma.cooperative.findUnique({
      where: { id: cooperativeId },
    });
    if (!coop) {
      return { success: false, error: "Selected cooperative was not found." };
    }
    if (actorRole === Role.CELL_MANAGER && String(coop.createdById) !== String(actor.id)) {
      return {
        success: false,
        error: "Access denied: You can only add members to cooperatives you created.",
      };
    }

    const currentMembers = await prisma.user.findMany({
      where: {
        cooperativeId,
        deletedAt: null,
      },
    });

    if (currentMembers.length >= MAX_COOPERATIVE_MEMBERS) {
      return {
        success: false,
        error: `Cooperative "${coop.name}" has reached the strict limit of ${MAX_COOPERATIVE_MEMBERS} members (including Cooperative Manager).`,
      };
    }

    let existingUser = null;
    try {
      existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { nationalId },
            ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
          ],
        },
      });
    } catch (err) {
      if (isSupabaseSchemaMissingError(err)) {
        existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email },
              ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
            ],
          },
        });
        if (!existingUser && nationalId) {
          const dupBen = await prisma.beneficiary
            .findFirst({ where: { nationalId } })
            .catch(() => null);
          if (dupBen) {
            return { success: false, error: "A user with this National ID already exists." };
          }
        }
      } else {
        throw err;
      }
    }

    if (existingUser) {
      if (existingUser.email === email) {
        return { success: false, error: "A user with this email already exists." };
      }
      if (existingUser.nationalId === nationalId) {
        return { success: false, error: "A user with this National ID already exists." };
      }
      if (normalizedPhone && existingUser.phone === normalizedPhone) {
        return { success: false, error: "A user with this phone number already exists." };
      }
    }

    const hashedPassword = await bcrypt.hash(staticPassword, 10);

    // If creating directly as Cooperative Manager, demote any existing manager in this cooperative first
    const previousLeader =
      assignedRole === Role.COOPERATIVE_LEADER
        ? currentMembers.find((m) => normalizeRoleValue(m.role) === Role.COOPERATIVE_LEADER)
        : undefined;

    if (previousLeader) {
      await prisma.user.update({
        where: { id: String(previousLeader.id) },
        data: { role: Role.COOPERATIVE_MEMBER },
      });
      invalidateAuthUserCache(String(previousLeader.id));
      await syncSupabaseAuthUser({
        email: previousLeader.email,
        role: Role.COOPERATIVE_MEMBER,
      });
    }

    const memberDistrict = districtName || null;
    const memberSector = sectorName || null;
    const memberCell = cellName || null;
    const memberVillage = villageName || null;
    const memberAddress = address || null;

    const baseMemberData = {
      name,
      email,
      phone: normalizedPhone,
      password: hashedPassword,
      role: assignedRole,
      cooperativeId,
      mustChangePassword: true,
      isActive: true,
      districtName: memberDistrict,
      sectorName: memberSector,
      cellName: memberCell,
      villageName: memberVillage,
      address: memberAddress,
    };

    let createdUser;
    try {
      createdUser = await prisma.user.create({
        data: {
          ...baseMemberData,
          nationalId,
        },
      });
    } catch (err) {
      if (isSupabaseSchemaMissingError(err)) {
        createdUser = await prisma.user.create({
          data: baseMemberData,
        });
      } else {
        throw err;
      }
    }

    await saveUserAddressProfile(String(createdUser.id), name, assignedRole, {
      districtId: memberDistrict ?? "",
      districtName: memberDistrict ?? "",
      sectorId: memberSector ?? "",
      sectorName: memberSector ?? "",
      cellId: memberCell ?? "",
      cellName: memberCell ?? "",
      villageId: memberVillage ?? "",
      villageName: memberVillage ?? "",
      address: memberAddress ?? "",
    }).catch(() => null);

    await syncSupabaseAuthUser({
      email,
      password: staticPassword,
      name,
      role: assignedRole,
      phone: normalizedPhone,
      publicUserId: String(createdUser.id),
      isActive: true,
    });

    await syncBeneficiaryRecordForCoopUser({
      userId: String(createdUser.id),
      name,
      phone: normalizedPhone,
      nationalId,
      role: assignedRole,
      isActive: true,
      cooperativeName: coop.name,
      cellName: memberCell || coop.cellName,
      districtName: memberDistrict,
      sectorName: memberSector,
      villageName: memberVillage,
      createdById: actor.id,
    });

    if (assignedRole === Role.COOPERATIVE_LEADER) {
      await prisma.cooperative.update({
        where: { id: cooperativeId },
        data: {
          leaderUserId: String(createdUser.id),
          leaderName: createdUser.name,
        },
      });
    }

    if (previousLeader) {
      await syncBeneficiaryRecordForCoopUser({
        userId: String(previousLeader.id),
        name: previousLeader.name,
        phone: previousLeader.phone ?? null,
        nationalId: (previousLeader as { nationalId?: string | null }).nationalId ?? null,
        role: Role.COOPERATIVE_MEMBER,
        isActive: Boolean(previousLeader.isActive),
        cooperativeName: coop.name,
        cellName: previousLeader.cellName ?? coop.cellName,
        districtName: previousLeader.districtName ?? null,
        sectorName: previousLeader.sectorName ?? null,
        villageName: previousLeader.villageName ?? null,
        createdById: actor.id,
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        role: actor.role,
        action: "CREATED",
        entity: "USER",
        entityId: String(createdUser.id),
        newValue: {
          name,
          email,
          phone: normalizedPhone,
          nationalId,
          districtName: memberDistrict,
          sectorName: memberSector,
          cellName: memberCell,
          villageName: memberVillage,
          address: memberAddress,
          role: assignedRole,
          cooperativeId,
          cooperativeName: coop.name,
          mustChangePassword: true,
        },
      },
    });

    if (previousLeader) {
      await prisma.auditLog.create({
        data: {
          userId: actor.id,
          role: actor.role,
          action: "MANAGER_CHANGED",
          entity: "COOPERATIVE",
          entityId: cooperativeId,
          previousValue: {
            leaderUserId: String(previousLeader.id),
            leaderName: previousLeader.name,
          },
          newValue: {
            leaderUserId: String(createdUser.id),
            leaderName: createdUser.name,
            cooperativeName: coop.name,
          },
        },
      });
    }

    try {
      await prisma.notification.create({
        data: {
          userId: String(createdUser.id),
          type: NotificationType.INFO,
          title: `Welcome to ${coop.name}`,
          message: `You were added as ${assignedRole === Role.COOPERATIVE_LEADER ? "Cooperative Manager" : "Cooperative Member"} in ${coop.name} (${coop.cellName}). Visit Personal Settings to update your initial static password.`,
          relatedEntity: "COOPERATIVE",
          relatedEntityId: cooperativeId,
        },
      });
    } catch {
      // Non-blocking notification
    }

    revalidateAllCooperativePaths();
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: getFriendlyActionError(err, "Failed to add cooperative member."),
    };
  }
}

export async function updateCooperativeMemberDetails(formData: FormData): Promise<{
  success: boolean;
  error?: string;
}> {
  const actor = await getActiveUser([Role.SUPER_ADMIN, Role.CELL_MANAGER]);
  if (!actor) {
    return {
      success: false,
      error: "Unauthorized: Only Cell Managers or Super Admins can update member details.",
    };
  }

  const userId = String(formData.get("userId") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const rawPhone = String(formData.get("phone") || "").trim();
  const rawNationalId = String(formData.get("nationalId") || "").trim().replace(/\s+/g, "");
  const districtName = String(formData.get("district") || "").trim();
  const sectorName = String(formData.get("sector") || "").trim();
  const cellName = String(formData.get("cell") || "").trim();
  const villageName = String(formData.get("village") || "").trim();
  const address = String(formData.get("address") || "").trim();

  if (!userId || !name) {
    return {
      success: false,
      error: "Member Name is required.",
    };
  }

  const normalizedPhone = rawPhone ? normalizePhone(rawPhone) : null;

  try {
    const actorRole = normalizeRoleValue(actor.role) || actor.role;
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target || target.deletedAt) {
      return { success: false, error: "Cooperative member not found." };
    }
    const normRole = normalizeRoleValue(target.role);
    if (normRole !== Role.COOPERATIVE_LEADER && normRole !== Role.COOPERATIVE_MEMBER) {
      return { success: false, error: "Only cooperative member accounts can be edited here." };
    }

    const coop = target.cooperativeId
      ? await prisma.cooperative.findUnique({ where: { id: target.cooperativeId } })
      : null;

    if (actorRole === Role.CELL_MANAGER) {
      if (!coop || String(coop.createdById) !== String(actor.id)) {
        return {
          success: false,
          error: "Access denied: You can only edit members of cooperatives you created.",
        };
      }
    }

    if (normalizedPhone) {
      const dupPhone = await prisma.user.findFirst({
        where: { phone: normalizedPhone, NOT: { id: userId } },
      });
      if (dupPhone) {
        return { success: false, error: "Another user already uses this phone number." };
      }
    }

    const finalNationalId =
      rawNationalId || (target as { nationalId?: string | null }).nationalId || null;

    if (finalNationalId) {
      try {
        const dupNid = await prisma.user.findFirst({
          where: { nationalId: finalNationalId, NOT: { id: userId } },
        });
        if (dupNid) {
          return { success: false, error: "Another user already uses this National ID." };
        }
      } catch (err) {
        if (!isSupabaseSchemaMissingError(err)) throw err;
      }
    }

    const updateBase = {
      name,
      phone: normalizedPhone,
      districtName: districtName || null,
      sectorName: sectorName || null,
      cellName: cellName || null,
      villageName: villageName || null,
      address: address || null,
    };

    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          ...updateBase,
          nationalId: finalNationalId,
        },
      });
    } catch (err) {
      if (isSupabaseSchemaMissingError(err)) {
        await prisma.user.update({
          where: { id: userId },
          data: updateBase,
        });
      } else {
        throw err;
      }
    }

    if (coop && coop.leaderUserId === String(target.id) && coop.leaderName !== name) {
      await prisma.cooperative.update({
        where: { id: coop.id },
        data: { leaderName: name },
      });
    }

    await saveUserAddressProfile(String(target.id), name, normRole, {
      districtId: districtName,
      districtName,
      sectorId: sectorName,
      sectorName,
      cellId: cellName,
      cellName,
      villageId: villageName,
      villageName,
      address,
    }).catch(() => null);

    invalidateAuthUserCache(String(target.id));
    await syncSupabaseAuthUser({
      email: target.email,
      name,
      phone: normalizedPhone,
    });

    if (coop) {
      await syncBeneficiaryRecordForCoopUser({
        userId: String(target.id),
        name,
        phone: normalizedPhone,
        nationalId: finalNationalId,
        role: normRole,
        isActive: Boolean(target.isActive),
        cooperativeName: coop.name,
        cellName: cellName || coop.cellName,
        districtName: districtName || null,
        sectorName: sectorName || null,
        villageName: villageName || null,
        createdById: coop.createdById,
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        role: actor.role,
        action: "UPDATED",
        entity: "USER",
        entityId: String(target.id),
        newValue: {
          name,
          phone: normalizedPhone,
          nationalId: finalNationalId,
          districtName,
          sectorName,
          cellName,
          villageName,
          address,
        },
      },
    });

    revalidateAllCooperativePaths();
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: getFriendlyActionError(err, "Failed to update cooperative member details."),
    };
  }
}

export async function assignCooperativeManager(
  cooperativeId: string,
  memberUserId: string
): Promise<{ success: boolean; error?: string }> {
  const actor = await getActiveUser([Role.SUPER_ADMIN, Role.CELL_MANAGER]);
  if (!actor) {
    return {
      success: false,
      error: "Unauthorized: Only Cell Managers can select or change a Cooperative Manager.",
    };
  }

  if (!cooperativeId || !memberUserId) {
    return { success: false, error: "Cooperative and target member are required." };
  }

  try {
    const actorRole = normalizeRoleValue(actor.role) || actor.role;
    const coop = await prisma.cooperative.findUnique({
      where: { id: cooperativeId },
    });
    if (!coop) {
      return { success: false, error: "Cooperative not found." };
    }
    if (actorRole === Role.CELL_MANAGER && String(coop.createdById) !== String(actor.id)) {
      return {
        success: false,
        error: "Access denied: You can only manage cooperatives you created.",
      };
    }

    const target = await prisma.user.findUnique({
      where: { id: memberUserId },
    });
    if (!target || target.deletedAt) {
      return { success: false, error: "Selected member was not found." };
    }

    const coopMembers = await prisma.user.findMany({
      where: {
        cooperativeId,
        deletedAt: null,
      },
    });

    const isAlreadyInCoop = target.cooperativeId === cooperativeId;
    if (!isAlreadyInCoop && coopMembers.length >= MAX_COOPERATIVE_MEMBERS) {
      return {
        success: false,
        error: `Cooperative "${coop.name}" already has ${MAX_COOPERATIVE_MEMBERS} members.`,
      };
    }

    // Demote any existing Cooperative Manager(s) inside this cooperative
    const previousLeaders = coopMembers.filter(
      (m) =>
        String(m.id) !== String(target.id) &&
        normalizeRoleValue(m.role) === Role.COOPERATIVE_LEADER
    );

    for (const prev of previousLeaders) {
      await prisma.user.update({
        where: { id: String(prev.id) },
        data: { role: Role.COOPERATIVE_MEMBER },
      });
      invalidateAuthUserCache(String(prev.id));
      await syncSupabaseAuthUser({
        email: prev.email,
        role: Role.COOPERATIVE_MEMBER,
      });
      await syncBeneficiaryRecordForCoopUser({
        userId: String(prev.id),
        name: prev.name,
        phone: prev.phone ?? null,
        nationalId: (prev as { nationalId?: string | null }).nationalId ?? null,
        role: Role.COOPERATIVE_MEMBER,
        isActive: Boolean(prev.isActive),
        cooperativeName: coop.name,
        cellName: prev.cellName ?? coop.cellName,
        districtName: prev.districtName ?? null,
        sectorName: prev.sectorName ?? null,
        villageName: prev.villageName ?? null,
        createdById: actor.id,
      });
      try {
        await prisma.notification.create({
          data: {
            userId: String(prev.id),
            type: NotificationType.INFO,
            title: "Cooperative Manager Updated",
            message: `${target.name} has been assigned as the new Cooperative Manager for ${coop.name}. Your role is now Cooperative Member.`,
            relatedEntity: "COOPERATIVE",
            relatedEntityId: cooperativeId,
          },
        });
      } catch {
        // Non-blocking
      }
    }

    await prisma.user.update({
      where: { id: String(target.id) },
      data: {
        role: Role.COOPERATIVE_LEADER,
        cooperativeId,
      },
    });
    invalidateAuthUserCache(String(target.id));
    await syncSupabaseAuthUser({
      email: target.email,
      role: Role.COOPERATIVE_LEADER,
    });
    await syncBeneficiaryRecordForCoopUser({
      userId: String(target.id),
      name: target.name,
      phone: target.phone ?? null,
      nationalId: (target as { nationalId?: string | null }).nationalId ?? null,
      role: Role.COOPERATIVE_LEADER,
      isActive: Boolean(target.isActive),
      cooperativeName: coop.name,
      cellName: target.cellName ?? coop.cellName,
      districtName: target.districtName ?? null,
      sectorName: target.sectorName ?? null,
      villageName: target.villageName ?? null,
      createdById: actor.id,
    });

    await prisma.cooperative.update({
      where: { id: cooperativeId },
      data: {
        leaderUserId: String(target.id),
        leaderName: target.name,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        role: actor.role,
        action: "MANAGER_CHANGED",
        entity: "COOPERATIVE",
        entityId: cooperativeId,
        previousValue: {
          leaderUserId: coop.leaderUserId ?? null,
          leaderName: coop.leaderName ?? null,
        },
        newValue: {
          leaderUserId: String(target.id),
          leaderName: target.name,
          cooperativeName: coop.name,
        },
      },
    });

    try {
      await prisma.notification.create({
        data: {
          userId: String(target.id),
          type: NotificationType.INFO,
          title: `Appointed Cooperative Manager`,
          message: `You have been selected by ${actor.name} as Cooperative Manager for ${coop.name}. You can now review member reports and oversee cooperative animals.`,
          relatedEntity: "COOPERATIVE",
          relatedEntityId: cooperativeId,
        },
      });
    } catch {
      // Non-blocking
    }

    revalidateAllCooperativePaths();
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: getFriendlyActionError(err, "Failed to change Cooperative Manager."),
    };
  }
}

export async function assignExistingUserToCooperative(
  cooperativeId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const actor = await getActiveUser([Role.SUPER_ADMIN, Role.CELL_MANAGER]);
  if (!actor) {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const actorRole = normalizeRoleValue(actor.role) || actor.role;
    const coop = await prisma.cooperative.findUnique({ where: { id: cooperativeId } });
    if (!coop) return { success: false, error: "Cooperative not found." };
    if (actorRole === Role.CELL_MANAGER && String(coop.createdById) !== String(actor.id)) {
      return {
        success: false,
        error: "Access denied: You can only assign users to cooperatives you created.",
      };
    }

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target || target.deletedAt) return { success: false, error: "User not found." };

    const coopMembers = await prisma.user.findMany({
      where: { cooperativeId, deletedAt: null },
    });
    if (coopMembers.length >= MAX_COOPERATIVE_MEMBERS) {
      return {
        success: false,
        error: `Cooperative "${coop.name}" already has the maximum ${MAX_COOPERATIVE_MEMBERS} members.`,
      };
    }

    await prisma.user.update({
      where: { id: String(target.id) },
      data: {
        cooperativeId,
        role: Role.COOPERATIVE_MEMBER,
      },
    });
    invalidateAuthUserCache(String(target.id));
    await syncSupabaseAuthUser({
      email: target.email,
      role: Role.COOPERATIVE_MEMBER,
    });
    await syncBeneficiaryRecordForCoopUser({
      userId: String(target.id),
      name: target.name,
      phone: target.phone ?? null,
      nationalId: (target as { nationalId?: string | null }).nationalId ?? null,
      role: Role.COOPERATIVE_MEMBER,
      isActive: Boolean(target.isActive),
      cooperativeName: coop.name,
      cellName: target.cellName ?? coop.cellName,
      districtName: target.districtName ?? null,
      sectorName: target.sectorName ?? null,
      villageName: target.villageName ?? null,
      createdById: actor.id,
    });

    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        role: actor.role,
        action: "UPDATED",
        entity: "USER",
        entityId: String(target.id),
        newValue: {
          name: target.name,
          cooperativeId,
          cooperativeName: coop.name,
          role: Role.COOPERATIVE_MEMBER,
        },
      },
    });

    revalidateAllCooperativePaths();
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: getFriendlyActionError(err, "Failed to assign member to cooperative."),
    };
  }
}

export async function toggleCooperativeMemberActive(userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const actor = await getActiveUser([Role.SUPER_ADMIN, Role.CELL_MANAGER]);
  if (!actor) {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const actorRole = normalizeRoleValue(actor.role) || actor.role;
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target || target.deletedAt) {
      return { success: false, error: "Member not found." };
    }
    const norm = normalizeRoleValue(target.role);
    if (norm !== Role.COOPERATIVE_LEADER && norm !== Role.COOPERATIVE_MEMBER) {
      return { success: false, error: "Cell Managers can only manage cooperative accounts." };
    }
    if (actorRole === Role.CELL_MANAGER) {
      const targetCoop = target.cooperativeId
        ? await prisma.cooperative.findUnique({ where: { id: target.cooperativeId } })
        : null;
      if (!targetCoop || String(targetCoop.createdById) !== String(actor.id)) {
        return {
          success: false,
          error: "Access denied: You can only manage members of cooperatives you created.",
        };
      }
    }

    const nextActive = !target.isActive;
    await prisma.user.update({
      where: { id: String(target.id) },
      data: { isActive: nextActive },
    });
    invalidateAuthUserCache(String(target.id));
    await syncSupabaseAuthUser({
      email: target.email,
      isActive: nextActive,
    });
    if (target.cooperativeId) {
      const targetCoop = await prisma.cooperative.findUnique({ where: { id: target.cooperativeId } });
      if (targetCoop) {
        await syncBeneficiaryRecordForCoopUser({
          userId: String(target.id),
          name: target.name,
          phone: target.phone ?? null,
          nationalId: (target as { nationalId?: string | null }).nationalId ?? null,
          role: norm,
          isActive: nextActive,
          cooperativeName: targetCoop.name,
          cellName: target.cellName ?? targetCoop.cellName,
          districtName: target.districtName ?? null,
          sectorName: target.sectorName ?? null,
          villageName: target.villageName ?? null,
          createdById: targetCoop.createdById,
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        role: actor.role,
        action: nextActive ? "ACTIVATED" : "SUSPENDED",
        entity: "USER",
        entityId: String(target.id),
        newValue: { name: target.name, isActive: nextActive },
      },
    });

    revalidateAllCooperativePaths();
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: getFriendlyActionError(err, "Failed to update member status."),
    };
  }
}

export async function removeCooperativeMember(userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const actor = await getActiveUser([Role.SUPER_ADMIN, Role.CELL_MANAGER]);
  if (!actor) {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const actorRole = normalizeRoleValue(actor.role) || actor.role;
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target || target.deletedAt) {
      return { success: false, error: "Member not found." };
    }
    const norm = normalizeRoleValue(target.role);
    if (norm !== Role.COOPERATIVE_LEADER && norm !== Role.COOPERATIVE_MEMBER) {
      return { success: false, error: "Cell Managers can only manage cooperative accounts." };
    }
    if (actorRole === Role.CELL_MANAGER) {
      const targetCoop = target.cooperativeId
        ? await prisma.cooperative.findUnique({ where: { id: target.cooperativeId } })
        : null;
      if (!targetCoop || String(targetCoop.createdById) !== String(actor.id)) {
        return {
          success: false,
          error: "Access denied: You can only remove members from cooperatives you created.",
        };
      }
    }

    const prevCoopId = target.cooperativeId;
    await prisma.user.update({
      where: { id: String(target.id) },
      data: {
        cooperativeId: null,
        role: Role.COOPERATIVE_MEMBER,
      },
    });
    invalidateAuthUserCache(String(target.id));
    await syncSupabaseAuthUser({
      email: target.email,
      role: Role.COOPERATIVE_MEMBER,
    });

    if (prevCoopId) {
      const coop = await prisma.cooperative.findUnique({ where: { id: prevCoopId } });
      if (coop && coop.leaderUserId === String(target.id)) {
        await prisma.cooperative.update({
          where: { id: prevCoopId },
          data: { leaderUserId: null, leaderName: null },
        });
      }
    }
    await prisma.beneficiary.updateMany({
      where: { beneficiaryNumber: `COOP-${String(target.id)}` },
      data: { status: BeneficiaryStatus.INACTIVE },
    });

    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        role: actor.role,
        action: "UPDATED",
        entity: "USER",
        entityId: String(target.id),
        previousValue: { cooperativeId: prevCoopId, role: target.role },
        newValue: { cooperativeId: null, role: Role.COOPERATIVE_MEMBER, removedFromCoop: true },
      },
    });

    revalidateAllCooperativePaths();
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: getFriendlyActionError(err, "Failed to remove member from cooperative."),
    };
  }
}

export async function registerCooperativeAnimal(formData: FormData): Promise<{
  success: boolean;
  error?: string;
}> {
  const actor = await getActiveUser([
    Role.SUPER_ADMIN,
    Role.CELL_MANAGER,
    Role.COOPERATIVE_LEADER,
    Role.COOPERATIVE_MEMBER,
  ]);
  if (!actor) {
    return { success: false, error: "Unauthorized." };
  }

  const actorRole = normalizeRoleValue(actor.role) || actor.role;
  const fullActor = await prisma.user.findUnique({ where: { id: actor.id } });

  const requestedCoopId = String(formData.get("cooperativeId") || "").trim();
  const requestedOwnerId = String(formData.get("ownerMemberId") || "").trim();
  const customTag = String(formData.get("tagNumber") || "").trim().toUpperCase();
  const breed = String(formData.get("breed") || "").trim() || null;
  const sexRaw = String(formData.get("sex") || "").trim().toUpperCase();
  const weightRaw = String(formData.get("currentWeight") || "").trim();
  const ageRaw = String(formData.get("estimatedAge") || "").trim();
  const healthRaw = String(formData.get("healthStatus") || "HEALTHY").trim().toUpperCase();
  const currentLocation = String(formData.get("currentLocation") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  let cooperativeId = fullActor?.cooperativeId ?? null;
  let ownerMemberId = actor.id;
  let ownerMemberName = actor.name;

  try {
    if (actorRole === Role.COOPERATIVE_MEMBER) {
      if (!cooperativeId) {
        return {
          success: false,
          error: "You must be assigned to a cooperative by your Cell Manager before registering personal animals.",
        };
      }
      ownerMemberId = actor.id;
      ownerMemberName = actor.name;
    } else if (actorRole === Role.COOPERATIVE_LEADER) {
      if (!cooperativeId) {
        const ledCoop = await prisma.cooperative.findFirst({
          where: { leaderUserId: actor.id },
        });
        cooperativeId = ledCoop?.id ?? null;
      }
      if (!cooperativeId) {
        return { success: false, error: "No cooperative is linked to your Cooperative Manager account." };
      }
      if (requestedOwnerId) {
        const member = await prisma.user.findUnique({ where: { id: requestedOwnerId } });
        if (!member || member.cooperativeId !== cooperativeId) {
          return { success: false, error: "Selected owner does not belong to your cooperative." };
        }
        ownerMemberId = String(member.id);
        ownerMemberName = member.name;
      }
    } else {
      // CELL_MANAGER or SUPER_ADMIN
      cooperativeId = requestedCoopId || cooperativeId;
      if (!cooperativeId) {
        return { success: false, error: "Please select a cooperative." };
      }
      if (actorRole === Role.CELL_MANAGER) {
        const coop = await prisma.cooperative.findUnique({ where: { id: cooperativeId } });
        if (!coop || String(coop.createdById) !== String(actor.id)) {
          return {
            success: false,
            error: "Access denied: You can only register animals inside cooperatives you created.",
          };
        }
      }
      if (requestedOwnerId) {
        const member = await prisma.user.findUnique({ where: { id: requestedOwnerId } });
        if (!member || member.cooperativeId !== cooperativeId) {
          return { success: false, error: "Selected owner does not belong to this cooperative." };
        }
        ownerMemberId = String(member.id);
        ownerMemberName = member.name;
      }
    }

    const currentWeight = weightRaw ? Number(weightRaw) : null;
    if (currentWeight !== null && (Number.isNaN(currentWeight) || currentWeight < 0)) {
      return { success: false, error: "Weight must be a valid positive number." };
    }
    const estimatedAge = ageRaw ? parseInt(ageRaw, 10) : null;
    const sex =
      sexRaw === "MALE" ? PigSex.MALE : sexRaw === "FEMALE" ? PigSex.FEMALE : null;
    const healthStatus = Object.values(PigHealthStatus).includes(healthRaw as PigHealthStatus)
      ? (healthRaw as PigHealthStatus)
      : PigHealthStatus.HEALTHY;

    let tagNumber = customTag;
    if (!tagNumber) {
      const year = new Date().getFullYear();
      const prefix = `PF-RW-${year}-`;
      const lastPig = await prisma.pig.findFirst({
        where: {
          OR: [
            { tagNumber: { startsWith: prefix } },
            { tagNumber: { startsWith: `PIG-${year}-` } },
          ],
        },
        orderBy: { tagNumber: "desc" },
      });
      let nextSeq = 1;
      if (lastPig) {
        const lastPart = lastPig.tagNumber.split("-").pop() ?? "";
        const parsed = parseInt(lastPart, 10);
        if (!Number.isNaN(parsed)) nextSeq = parsed + 1;
      }
      tagNumber = `${prefix}${String(nextSeq).padStart(5, "0")}`;
    } else {
      const dup = await prisma.pig.findFirst({ where: { tagNumber } });
      if (dup) {
        return { success: false, error: `Animal tag "${tagNumber}" already exists.` };
      }
    }

    const pig = await prisma.pig.create({
      data: {
        tagNumber,
        breed,
        sex,
        currentWeight,
        estimatedAge: estimatedAge && !Number.isNaN(estimatedAge) ? estimatedAge : null,
        healthStatus,
        status: PigStatus.REGISTERED,
        currentLocation,
        notes,
        cooperativeId,
        ownerMemberId,
        ownerMemberName,
        dateReceived: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        role: actor.role,
        action: "CREATED",
        entity: "PIG",
        entityId: pig.id,
        newValue: {
          tagNumber: pig.tagNumber,
          cooperativeId,
          ownerMemberId,
          ownerMemberName,
          currentWeight,
          healthStatus,
        },
      },
    });

    revalidateAllCooperativePaths();
    return { success: true };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { success: false, error: "Animal tag already exists. Please use a unique tag." };
    }
    return {
      success: false,
      error: getFriendlyActionError(err, "Failed to save animal record."),
    };
  }
}

export async function updateCooperativeAnimalRecord(formData: FormData): Promise<{
  success: boolean;
  error?: string;
}> {
  const actor = await getActiveUser([
    Role.SUPER_ADMIN,
    Role.CELL_MANAGER,
    Role.COOPERATIVE_LEADER,
    Role.COOPERATIVE_MEMBER,
  ]);
  if (!actor) {
    return { success: false, error: "Unauthorized." };
  }

  const pigId = String(formData.get("pigId") || "").trim();
  const weightRaw = String(formData.get("currentWeight") || "").trim();
  const ageRaw = String(formData.get("estimatedAge") || "").trim();
  const healthRaw = String(formData.get("healthStatus") || "").trim().toUpperCase();
  const currentLocation = String(formData.get("currentLocation") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!pigId) return { success: false, error: "Animal ID is required." };

  try {
    const pig = await prisma.pig.findUnique({ where: { id: pigId } });
    if (!pig) return { success: false, error: "Animal record not found." };

    const actorRole = normalizeRoleValue(actor.role) || actor.role;
    const fullActor = await prisma.user.findUnique({ where: { id: actor.id } });

    if (actorRole === Role.COOPERATIVE_MEMBER && pig.ownerMemberId !== actor.id) {
      return { success: false, error: "You can only edit your own animal records." };
    }
    if (
      actorRole === Role.COOPERATIVE_LEADER &&
      pig.cooperativeId !== fullActor?.cooperativeId &&
      pig.ownerMemberId !== actor.id
    ) {
      return { success: false, error: "This animal does not belong to your cooperative." };
    }
    if (actorRole === Role.CELL_MANAGER) {
      const coop = pig.cooperativeId
        ? await prisma.cooperative.findUnique({ where: { id: pig.cooperativeId } })
        : null;
      if (!coop || String(coop.createdById) !== String(actor.id)) {
        return {
          success: false,
          error: "Access denied: You can only update animals belonging to cooperatives you created.",
        };
      }
    }

    const currentWeight = weightRaw ? Number(weightRaw) : pig.currentWeight;
    if (currentWeight !== null && (Number.isNaN(currentWeight) || currentWeight < 0)) {
      return { success: false, error: "Weight must be a valid positive number." };
    }
    const estimatedAge = ageRaw ? parseInt(ageRaw, 10) : pig.estimatedAge;
    const healthStatus = Object.values(PigHealthStatus).includes(healthRaw as PigHealthStatus)
      ? (healthRaw as PigHealthStatus)
      : pig.healthStatus;

    await prisma.pig.update({
      where: { id: pig.id },
      data: {
        currentWeight,
        estimatedAge: estimatedAge && !Number.isNaN(estimatedAge) ? estimatedAge : null,
        healthStatus,
        currentLocation,
        notes,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        role: actor.role,
        action: "UPDATED",
        entity: "PIG",
        entityId: pig.id,
        previousValue: {
          currentWeight: pig.currentWeight,
          healthStatus: pig.healthStatus,
        },
        newValue: {
          tagNumber: pig.tagNumber,
          currentWeight,
          healthStatus,
          notes,
        },
      },
    });

    revalidateAllCooperativePaths();
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: getFriendlyActionError(err, "Failed to update animal record."),
    };
  }
}

export async function submitMemberReportToLeader(formData: FormData): Promise<{
  success: boolean;
  error?: string;
}> {
  const actor = await getActiveUser([
    Role.SUPER_ADMIN,
    Role.CELL_MANAGER,
    Role.COOPERATIVE_LEADER,
    Role.COOPERATIVE_MEMBER,
  ]);
  if (!actor) {
    return { success: false, error: "Unauthorized." };
  }

  const actorRole = normalizeRoleValue(actor.role) || actor.role;
  const fullActor = await prisma.user.findUnique({ where: { id: actor.id } });

  const requestedCoopId = String(formData.get("cooperativeId") || "").trim();
  const pigId = String(formData.get("pigId") || "").trim() || null;
  const reportTypeRaw = String(formData.get("reportType") || "ROUTINE_UPDATE").trim();
  const animalCount = Math.max(1, parseInt(String(formData.get("animalCount") || "1"), 10) || 1);
  const weightRaw = String(formData.get("estimatedWeightKg") || "").trim();
  const summary = String(formData.get("summary") || "").trim();
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!summary) {
    return { success: false, error: "Report summary is required." };
  }

  const validTypes: MemberReportType[] = [
    "ROUTINE_UPDATE",
    "HEALTH_CHECK",
    "WEIGHT_GROWTH",
    "BIRTH_NEW_PIGLETS",
    "READY_TO_SELL",
    "FEED_NEEDED",
  ];
  const reportType = validTypes.includes(reportTypeRaw as MemberReportType)
    ? (reportTypeRaw as MemberReportType)
    : "ROUTINE_UPDATE";

  const estimatedWeightNum = weightRaw ? Number(weightRaw) : null;
  if (estimatedWeightNum !== null && (Number.isNaN(estimatedWeightNum) || estimatedWeightNum <= 0)) {
    return { success: false, error: "Estimated weight must be greater than zero." };
  }

  try {
    const coopId =
      actorRole === Role.CELL_MANAGER || actorRole === Role.SUPER_ADMIN
        ? requestedCoopId || fullActor?.cooperativeId
        : fullActor?.cooperativeId;

    if (!coopId) {
      return {
        success: false,
        error: "You are not assigned to a cooperative yet. Ask your Cell Manager to assign you to a cooperative.",
      };
    }

    const coop = await prisma.cooperative.findUnique({ where: { id: coopId } });
    if (!coop) {
      return { success: false, error: "Cooperative not found." };
    }

    let pigTag: string | null = null;
    if (pigId) {
      const pig = await prisma.pig.findUnique({ where: { id: pigId } });
      if (!pig) return { success: false, error: "Referenced animal record was not found." };
      pigTag = pig.tagNumber;
    }

    const reportId = randomUUID();
    await prisma.cooperativeMemberReport.create({
      data: {
        id: reportId,
        cooperativeId: coop.id,
        cooperativeName: coop.name,
        memberId: actor.id,
        memberName: actor.name,
        leaderId: coop.leaderUserId ?? null,
        leaderName: coop.leaderName ?? null,
        pigId,
        pigTag,
        reportType,
        animalCount,
        estimatedWeightKg:
          estimatedWeightNum !== null ? new Prisma.Decimal(estimatedWeightNum.toFixed(2)) : null,
        summary,
        notes,
        status: "SUBMITTED",
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        role: actor.role,
        action: "CREATED",
        entity: "COOPERATIVE_MEMBER_REPORT",
        entityId: reportId,
        newValue: {
          cooperativeName: coop.name,
          reportType,
          animalCount,
          pigTag,
          summary,
        },
      },
    });

    if (coop.leaderUserId && coop.leaderUserId !== actor.id) {
      try {
        await prisma.notification.create({
          data: {
            userId: coop.leaderUserId,
            type: reportType === "HEALTH_CHECK" ? NotificationType.ALERT : NotificationType.INFO,
            title: `Member Report: ${actor.name}`,
            message: `${actor.name} (${coop.name}) submitted a ${reportType.replace(/_/g, " ").toLowerCase()} report${pigTag ? ` for ${pigTag}` : ""}: ${summary}`,
            relatedEntity: "COOPERATIVE_MEMBER_REPORT",
            relatedEntityId: reportId,
          },
        });
      } catch {
        // Non-blocking
      }
    }

    revalidateAllCooperativePaths();
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: getFriendlyActionError(err, "Failed to submit report to Cooperative Manager."),
    };
  }
}

export async function reviewMemberReport(
  reportId: string,
  nextStatus: "REVIEWED" | "ESCALATED_TO_CELL",
  leaderNotes?: string
): Promise<{ success: boolean; error?: string }> {
  const actor = await getActiveUser([
    Role.SUPER_ADMIN,
    Role.CELL_MANAGER,
    Role.COOPERATIVE_LEADER,
  ]);
  if (!actor) {
    return {
      success: false,
      error: "Unauthorized: Only Cooperative Managers or Cell Managers can review member reports.",
    };
  }

  try {
    const report = await prisma.cooperativeMemberReport.findUnique({
      where: { id: reportId },
    });
    if (!report) {
      return { success: false, error: "Member report not found." };
    }

    const coop = await prisma.cooperative.findUnique({
      where: { id: report.cooperativeId },
    });

    const actorRole = normalizeRoleValue(actor.role) || actor.role;
    if (actorRole === Role.COOPERATIVE_LEADER) {
      const fullActor = await prisma.user.findUnique({ where: { id: actor.id } });
      if (
        report.cooperativeId !== fullActor?.cooperativeId &&
        report.leaderId !== actor.id
      ) {
        return { success: false, error: "You can only review reports from your own cooperative." };
      }
    }
    if (actorRole === Role.CELL_MANAGER) {
      if (!coop || String(coop.createdById) !== String(actor.id)) {
        return {
          success: false,
          error: "Access denied: You can only review reports from cooperatives you created.",
        };
      }
    }

    const cleanNotes = leaderNotes?.trim() || null;
    await prisma.cooperativeMemberReport.update({
      where: { id: report.id },
      data: {
        status: nextStatus,
        leaderNotes: cleanNotes,
        leaderId: report.leaderId || actor.id,
        leaderName: report.leaderName || actor.name,
        reviewedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        role: actor.role,
        action: "STATUS_UPDATED",
        entity: "COOPERATIVE_MEMBER_REPORT",
        entityId: report.id,
        previousValue: { status: report.status },
        newValue: {
          status: nextStatus,
          cooperativeName: report.cooperativeName,
          memberName: report.memberName,
          leaderNotes: cleanNotes,
        },
      },
    });

    // Notify reporting member
    if (report.memberId !== actor.id) {
      try {
        await prisma.notification.create({
          data: {
            userId: report.memberId,
            type: NotificationType.INFO,
            title:
              nextStatus === "ESCALATED_TO_CELL"
                ? "Report Escalated to Cell Manager"
                : "Member Report Reviewed",
            message: `Your report (${report.summary}) was ${
              nextStatus === "ESCALATED_TO_CELL"
                ? "escalated to the Cell Manager for official action"
                : "reviewed"
            } by ${actor.name}.${cleanNotes ? ` Note: ${cleanNotes}` : ""}`,
            relatedEntity: "COOPERATIVE_MEMBER_REPORT",
            relatedEntityId: report.id,
          },
        });
      } catch {
        // Non-blocking
      }
    }

    // If escalated, notify the owning Cell Manager who created the cooperative
    if (nextStatus === "ESCALATED_TO_CELL") {
      try {
        if (coop?.createdById && String(coop.createdById) !== String(actor.id)) {
          await prisma.notification.create({
            data: {
              userId: String(coop.createdById),
              type: NotificationType.ALERT,
              title: `Cooperative Escalation: ${report.cooperativeName}`,
              message: `${actor.name} escalated a report from ${report.memberName} (${report.animalCount} animal(s)${report.pigTag ? `, Tag ${report.pigTag}` : ""}): ${report.summary}`,
              relatedEntity: "COOPERATIVE_MEMBER_REPORT",
              relatedEntityId: report.id,
            },
          });
        }
      } catch {
        // Non-blocking
      }
    }

    revalidateAllCooperativePaths();
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: getFriendlyActionError(err, "Failed to update report status."),
    };
  }
}

export async function submitMemberPaymentForApproval(formData: FormData): Promise<{
  success: boolean;
  error?: string;
}> {
  const actor = await getActiveUser([Role.SUPER_ADMIN, Role.CELL_MANAGER]);
  if (!actor) {
    return {
      success: false,
      error: "Unauthorized: Only Cell Managers can submit member payment proofs for Finance approval.",
    };
  }

  const actorRole = normalizeRoleValue(actor.role) || actor.role;
  const cooperativeId = String(formData.get("cooperativeId") || "").trim();
  const memberId = String(formData.get("memberId") || "").trim();
  const momoReference = String(formData.get("momoReference") || "").trim();

  if (!cooperativeId || !memberId || !momoReference) {
    return {
      success: false,
      error: "Cooperative, Cooperative Member, and MoMo Payment Reference are required.",
    };
  }

  try {
    const coop = await prisma.cooperative.findUnique({ where: { id: cooperativeId } });
    if (!coop) {
      return { success: false, error: "Selected cooperative was not found." };
    }
    if (actorRole === Role.CELL_MANAGER && String(coop.createdById) !== String(actor.id)) {
      return {
        success: false,
        error: "Access denied: You can only submit members from cooperatives you created.",
      };
    }

    const member = await prisma.user.findUnique({ where: { id: memberId } });
    const memberNormRole = normalizeRoleValue(member?.role);
    if (
      !member ||
      !member.isActive ||
      member.deletedAt ||
      member.cooperativeId !== cooperativeId ||
      (memberNormRole !== Role.COOPERATIVE_MEMBER && memberNormRole !== Role.COOPERATIVE_LEADER)
    ) {
      return {
        success: false,
        error: "Selected beneficiary must be an active Cooperative Member or Cooperative Leader in this cooperative.",
      };
    }

    const existing = await prisma.cooperativeMemberPayment.findFirst({
      where: { memberId },
    });

    if (existing && existing.status === "VERIFIED" && existing.cooperativeId === cooperativeId) {
      return {
        success: false,
        error: "This member's payment is already verified & approved by Finance Officer. Proceed to Step 2 to distribute a pig.",
      };
    }

    let paymentId = "";
    if (existing) {
      await prisma.cooperativeMemberPayment.update({
        where: { id: existing.id },
        data: {
          cooperativeId,
          pigValueFee: new Prisma.Decimal("16000.00"),
          taxFee: new Prisma.Decimal("2800.00"),
          totalAmount: new Prisma.Decimal("18800.00"),
          momoReference,
          status: "PENDING",
          verifiedById: null,
        },
      });
      paymentId = existing.id;
    } else {
      const created = await prisma.cooperativeMemberPayment.create({
        data: {
          memberId,
          cooperativeId,
          pigValueFee: new Prisma.Decimal("16000.00"),
          taxFee: new Prisma.Decimal("2800.00"),
          totalAmount: new Prisma.Decimal("18800.00"),
          momoReference,
          status: "PENDING",
          verifiedById: null,
        },
      });
      paymentId = created.id;
    }

    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        role: actor.role,
        action: "SUBMITTED_FOR_APPROVAL",
        entity: "COOPERATIVE_MEMBER_PAYMENT",
        entityId: paymentId,
        newValue: {
          memberId,
          memberName: member.name,
          cooperativeId,
          cooperativeName: coop.name,
          submittedById: actor.id,
          submittedByName: actor.name,
          pigValueFee: 16000,
          taxFee: 2800,
          totalAmount: 18800,
          momoReference,
          status: "PENDING",
        },
      },
    });

    // Notify Finance Officers for manual verification
    try {
      const financeOfficers = await prisma.user.findMany({
        where: {
          role: Role.FINANCE_OFFICER,
          isActive: true,
          deletedAt: null,
        },
      });
      for (const fo of financeOfficers) {
        await prisma.notification.create({
          data: {
            userId: String(fo.id),
            type: NotificationType.APPROVAL,
            title: `Member Payment Pending Approval: ${member.name}`,
            message: `Cell Manager ${actor.name} added ${member.name} (${coop.name}) to the awaiting-approval list. Fee: 16,000 + 2,800 = 18,800 RWF. MoMo Ref: ${momoReference}`,
            relatedEntity: "COOPERATIVE_MEMBER_PAYMENT",
            relatedEntityId: paymentId,
          },
        });
      }
    } catch {
      // Non-blocking notification
    }

    revalidateAllCooperativePaths();
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: getFriendlyActionError(err, "Failed to submit member payment for approval."),
    };
  }
}

export async function distributePigToCooperativeMember(formData: FormData): Promise<{
  success: boolean;
  error?: string;
}> {
  const actor = await getActiveUser([Role.SUPER_ADMIN, Role.CELL_MANAGER]);
  if (!actor) {
    return {
      success: false,
      error: "Unauthorized: Only Cell Managers can distribute pigs to cooperative members.",
    };
  }

  const actorRole = normalizeRoleValue(actor.role) || actor.role;
  const pigId = String(formData.get("pigId") || "").trim();
  const cooperativeId = String(formData.get("cooperativeId") || "").trim();
  const memberId = String(formData.get("memberId") || "").trim();
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!pigId || !cooperativeId || !memberId) {
    return { success: false, error: "Pig, Cooperative, and Cooperative Member are required." };
  }

  try {
    const coop = await prisma.cooperative.findUnique({ where: { id: cooperativeId } });
    if (!coop) {
      return { success: false, error: "Selected cooperative was not found." };
    }
    if (actorRole === Role.CELL_MANAGER && String(coop.createdById) !== String(actor.id)) {
      return {
        success: false,
        error: "Access denied: Only the Cell Manager who added this cooperative and member can distribute a pig to them.",
      };
    }

    const pig = await prisma.pig.findUnique({ where: { id: pigId } });
    if (!pig || pig.deletedAt) {
      return { success: false, error: "Selected pig was not found." };
    }

    const member = await prisma.user.findUnique({ where: { id: memberId } });
    const memberNormRole = normalizeRoleValue(member?.role);
    if (
      !member ||
      !member.isActive ||
      member.deletedAt ||
      member.cooperativeId !== cooperativeId ||
      (memberNormRole !== Role.COOPERATIVE_MEMBER && memberNormRole !== Role.COOPERATIVE_LEADER)
    ) {
      return {
        success: false,
        error: "Pig receivers (beneficiaries) must be active Cooperative Members or Cooperative Leaders in this cooperative.",
      };
    }

    // Enforce manual Finance Officer approval (no instant verification allowed!)
    const payment = await prisma.cooperativeMemberPayment.findFirst({
      where: { memberId },
    });

    if (!payment || payment.cooperativeId !== cooperativeId) {
      return {
        success: false,
        error:
          "Member has not been submitted to Finance for payment verification yet. In Step 1, add the member and their 18,800 RWF (16,000 + 2,800 RWF) MoMo reference to the Finance awaiting-approval list first.",
      };
    }

    if (payment.status === "PENDING") {
      return {
        success: false,
        error:
          "Payment is still PENDING Finance Officer verification. The Finance Officer must manually verify and approve this member's MoMo payment before pig handover.",
      };
    }

    if (payment.status === "REJECTED") {
      return {
        success: false,
        error:
          "This member's payment submission was REJECTED by the Finance Officer. Submit a valid MoMo payment reference in Step 1 for manual verification first.",
      };
    }

    if (payment.status !== "VERIFIED") {
      return {
        success: false,
        error: `Payment status (${payment.status}) is not approved for pig distribution.`,
      };
    }

    // Check vet clearance
    const clearance = await checkPigVetClearance(pigId, "DISTRIBUTION");
    if (!clearance.cleared) {
      return {
        success: false,
        error:
          clearance.reason ||
          "This pig has not passed veterinary health clearance and cannot be distributed.",
      };
    }

    const now = new Date();
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;
    const dueDate = new Date(now.getTime() + oneYearMs);
    const coopMemberBeneficiaryNumber = `COOP-${memberId}`;

    await prisma.$transaction(async (tx) => {
      // Ensure a linked Beneficiary record exists so PigDistribution, RevolvingCycle, and PigReturn FKs stay valid
      let beneficiary = await tx.beneficiary.findFirst({
        where: { beneficiaryNumber: coopMemberBeneficiaryNumber },
      });

      if (!beneficiary) {
        beneficiary = await tx.beneficiary.create({
          data: {
            beneficiaryNumber: coopMemberBeneficiaryNumber,
            fullName: member.name,
            phone: member.phone ?? null,
            nationalId: (member as { nationalId?: string | null }).nationalId ?? null,
            districtStr: member.districtName ?? null,
            sectorStr: member.sectorName ?? null,
            cellStr: member.cellName ?? coop.cellName,
            villageStr: member.villageName ?? null,
            savingsGroup: coop.name,
            status: BeneficiaryStatus.PIGLET_RECEIVED,
            registrationDate: now,
            createdById: actor.id,
            notes: `Auto-linked Cooperative Member (${coop.name})`,
          },
        });
      } else {
        await tx.beneficiary.update({
          where: { id: beneficiary.id },
          data: {
            fullName: member.name,
            phone: member.phone ?? beneficiary.phone,
            nationalId: (member as { nationalId?: string | null }).nationalId ?? beneficiary.nationalId,
            districtStr: member.districtName ?? beneficiary.districtStr,
            sectorStr: member.sectorName ?? beneficiary.sectorStr,
            cellStr: member.cellName ?? beneficiary.cellStr ?? coop.cellName,
            villageStr: member.villageName ?? beneficiary.villageStr,
            savingsGroup: coop.name,
            status: BeneficiaryStatus.PIGLET_RECEIVED,
          },
        });
      }

      // Update pig ownership & holder
      await tx.pig.update({
        where: { id: pig.id },
        data: {
          cooperativeId,
          ownerMemberId: memberId,
          ownerMemberName: member.name,
          currentBeneficiaryId: beneficiary.id,
          currentLocation: `${coop.name} (${coop.cellName})`,
          status: PigStatus.DISTRIBUTED,
        },
      });

      // Record distribution
      const distribution = await tx.pigDistribution.create({
        data: {
          pigId: pig.id,
          beneficiaryId: beneficiary.id,
          distributedById: actor.id,
          distributionDate: now,
          notes:
            notes ||
            `Distributed by Cell Manager ${actor.name} to Cooperative Member ${member.name} (Finance-verified MoMo: ${payment.momoReference})`,
        },
      });

      // Create revolving cycle expecting minimum 2 piglets return
      const cycleNumber =
        (await tx.revolvingCycle.count({ where: { beneficiaryId: beneficiary.id } })) + 1;
      await tx.revolvingCycle.create({
        data: {
          beneficiaryId: beneficiary.id,
          cycleNumber,
          startDate: now,
          dueDate,
          expectedReturn: 2,
          notes: `Cooperative revolving return requirement: minimum 2 piglets upon birth. Cooperative: ${coop.name}. Distribution ID: ${distribution.id}`,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actor.id,
          role: actor.role,
          action: "DISTRIBUTED",
          entity: "PIG",
          entityId: pig.id,
          newValue: {
            pigTag: pig.tagNumber,
            cooperativeId,
            cooperativeName: coop.name,
            memberId,
            memberName: member.name,
            beneficiaryId: beneficiary.id,
            cellManagerName: actor.name,
            paymentVerified: true,
            momoReference: payment.momoReference,
          },
        },
      });
    });

    // Notify member
    try {
      await prisma.notification.create({
        data: {
          userId: memberId,
          type: NotificationType.SUCCESS,
          title: `Pig Handover Completed (${pig.tagNumber})`,
          message: `Cell Manager ${actor.name} has distributed vet-cleared pig ${pig.tagNumber} to you in ${coop.name}. Minimum revolving return: 2 piglets.`,
          relatedEntity: "PIG",
          relatedEntityId: pig.id,
        },
      });
    } catch {
      // Non-blocking
    }

    revalidateAllCooperativePaths();
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: getFriendlyActionError(err, "Failed to distribute pig to member."),
    };
  }
}
