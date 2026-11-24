"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import {
  NotificationType,
  PigHealthStatus,
  PigSex,
  PigStatus,
  Prisma,
  Role,
} from "@prisma/client";
import { prisma, isSupabaseSchemaMissingError } from "@/lib/prisma";
import { getActiveUser } from "@/lib/active-user";
import { normalizePhone } from "@/lib/phone-utils";
import { syncSupabaseAuthUser } from "@/lib/supabase-auth";
import { normalizeRoleValue } from "@/lib/roles";
import { checkPigVetClearance } from "@/lib/vet-clearance";

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

export type CooperativesWorkspaceData = {
  schemaMissing: boolean;
  actor: {
    id: string;
    name: string;
    role: Role;
    cooperativeId: string | null;
    mustChangePassword: boolean;
  };
  cooperatives: SerializedCooperative[];
  animals: SerializedCooperativeAnimal[];
  memberReports: SerializedMemberReport[];
  unassignedUsers: SerializedCooperativeMember[];
};

function revalidateAllCooperativePaths() {
  revalidatePath("/dashboard/field");
  revalidatePath("/dashboard/field/cooperative");
  revalidatePath("/dashboard/field/my-animals");
  revalidatePath("/dashboard/field/member-reports");
  revalidatePath("/dashboard/field/stock-reports");
  revalidatePath("/dashboard/field/pigs");
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

export async function getCooperativesWorkspaceData(): Promise<CooperativesWorkspaceData | null> {
  const actor = await getActiveUser([
    Role.SUPER_ADMIN,
    Role.CELL_MANAGER,
    Role.COOPERATIVE_LEADER,
    Role.COOPERATIVE_MEMBER,
  ]);
  if (!actor) return null;

  const fullActor = await prisma.user.findUnique({
    where: { id: actor.id },
  });

  const actorCoopId = fullActor?.cooperativeId ?? null;
  const mustChangePassword = Boolean(fullActor?.mustChangePassword);
  const actorRole = normalizeRoleValue(actor.role) || actor.role;

  try {
    const [coopsRaw, usersRaw, pigsRaw, reportsRaw] = await Promise.all([
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
        orderBy: { createdAt: "desc" },
      }),
      prisma.cooperativeMemberReport.findMany({
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const coopNameById = new Map<string, string>();
    for (const c of coopsRaw) {
      coopNameById.set(c.id, c.name);
    }

    // Filter scope based on role
    const visibleCoops =
      actorRole === Role.SUPER_ADMIN || actorRole === Role.CELL_MANAGER
        ? coopsRaw
        : actorCoopId
          ? coopsRaw.filter((c) => c.id === actorCoopId)
          : coopsRaw.filter((c) => c.leaderUserId === actor.id);

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

    const serializeMember = (u: (typeof usersRaw)[number]): SerializedCooperativeMember => ({
      id: String(u.id),
      name: u.name,
      email: u.email,
      phone: u.phone ?? null,
      role: normalizeRoleValue(u.role) || u.role,
      isActive: Boolean(u.isActive),
      mustChangePassword: Boolean(u.mustChangePassword),
      cooperativeId: u.cooperativeId ?? null,
      animalCount: animalCountByOwner.get(String(u.id)) ?? 0,
      createdAt:
        u.createdAt instanceof Date
          ? u.createdAt.toISOString()
          : new Date(u.createdAt).toISOString(),
    });

    const serializedUsers = usersRaw.map(serializeMember);

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

    const unassignedUsers =
      actorRole === Role.SUPER_ADMIN || actorRole === Role.CELL_MANAGER
        ? serializedUsers.filter((u) => !u.cooperativeId)
        : [];

    // Filter animals
    const scopedPigs = pigsRaw.filter((p) => {
      if (actorRole === Role.SUPER_ADMIN || actorRole === Role.CELL_MANAGER) {
        return Boolean(p.cooperativeId || p.ownerMemberId);
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

    const animals: SerializedCooperativeAnimal[] = scopedPigs.map((p) => ({
      id: p.id,
      tagNumber: p.tagNumber,
      breed: p.breed ?? null,
      sex: p.sex ? String(p.sex) : null,
      currentWeight: p.currentWeight ?? null,
      estimatedAge: p.estimatedAge ?? null,
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
    }));

    // Filter member reports
    const scopedReports = reportsRaw.filter((r) => {
      if (actorRole === Role.SUPER_ADMIN || actorRole === Role.CELL_MANAGER) {
        return true;
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
      },
      cooperatives,
      animals,
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
        },
        cooperatives: [],
        animals: [],
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
  const requestedRoleRaw = String(formData.get("role") || "COOPERATIVE_MEMBER").trim();
  const staticPassword = String(formData.get("staticPassword") || "");

  if (!cooperativeId || !name || !email || !staticPassword) {
    return {
      success: false,
      error: "Cooperative, Full Name, Email, and Static Initial Password are required.",
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
    const coop = await prisma.cooperative.findUnique({
      where: { id: cooperativeId },
    });
    if (!coop) {
      return { success: false, error: "Selected cooperative was not found." };
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

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
        ],
      },
    });
    if (existingUser) {
      if (existingUser.email === email) {
        return { success: false, error: "A user with this email already exists." };
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
      await syncSupabaseAuthUser({
        email: previousLeader.email,
        role: Role.COOPERATIVE_MEMBER,
      });
    }

    const createdUser = await prisma.user.create({
      data: {
        name,
        email,
        phone: normalizedPhone,
        password: hashedPassword,
        role: assignedRole,
        cooperativeId,
        mustChangePassword: true,
        isActive: true,
      },
    });

    await syncSupabaseAuthUser({
      email,
      password: staticPassword,
      name,
      role: assignedRole,
      phone: normalizedPhone,
      publicUserId: String(createdUser.id),
      isActive: true,
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
    const coop = await prisma.cooperative.findUnique({
      where: { id: cooperativeId },
    });
    if (!coop) {
      return { success: false, error: "Cooperative not found." };
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
      await syncSupabaseAuthUser({
        email: prev.email,
        role: Role.COOPERATIVE_MEMBER,
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
    await syncSupabaseAuthUser({
      email: target.email,
      role: Role.COOPERATIVE_LEADER,
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
    const coop = await prisma.cooperative.findUnique({ where: { id: cooperativeId } });
    if (!coop) return { success: false, error: "Cooperative not found." };

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
    await syncSupabaseAuthUser({
      email: target.email,
      role: Role.COOPERATIVE_MEMBER,
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
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target || target.deletedAt) {
      return { success: false, error: "Member not found." };
    }
    const norm = normalizeRoleValue(target.role);
    if (norm !== Role.COOPERATIVE_LEADER && norm !== Role.COOPERATIVE_MEMBER) {
      return { success: false, error: "Cell Managers can only manage cooperative accounts." };
    }

    const nextActive = !target.isActive;
    await prisma.user.update({
      where: { id: String(target.id) },
      data: { isActive: nextActive },
    });
    await syncSupabaseAuthUser({
      email: target.email,
      isActive: nextActive,
    });

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
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target || target.deletedAt) {
      return { success: false, error: "Member not found." };
    }
    const norm = normalizeRoleValue(target.role);
    if (norm !== Role.COOPERATIVE_LEADER && norm !== Role.COOPERATIVE_MEMBER) {
      return { success: false, error: "Cell Managers can only manage cooperative accounts." };
    }

    const prevCoopId = target.cooperativeId;
    await prisma.user.update({
      where: { id: String(target.id) },
      data: {
        cooperativeId: null,
        role: Role.COOPERATIVE_MEMBER,
      },
    });
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

    // If escalated, notify Cell Managers so they can prepare official stock reports to Gebyian Manager
    if (nextStatus === "ESCALATED_TO_CELL") {
      try {
        const cellManagers = await prisma.user.findMany({
          where: {
            role: Role.CELL_MANAGER,
            isActive: true,
            deletedAt: null,
          },
        });
        for (const cm of cellManagers) {
          if (String(cm.id) === actor.id) continue;
          await prisma.notification.create({
            data: {
              userId: String(cm.id),
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

export async function distributePigToCooperativeMember(formData: FormData): Promise<{
  success: boolean;
  error?: string;
}> {
  const actor = await getActiveUser([Role.SUPER_ADMIN, Role.CELL_MANAGER]);
  if (!actor) {
    return { success: false, error: "Unauthorized: Only Cell Managers can distribute pigs to cooperative members." };
  }

  const pigId = String(formData.get("pigId") || "").trim();
  const cooperativeId = String(formData.get("cooperativeId") || "").trim();
  const memberId = String(formData.get("memberId") || "").trim();
  const momoReference = String(formData.get("momoReference") || "").trim();
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!pigId || !cooperativeId || !memberId) {
    return { success: false, error: "Pig, Cooperative, and Cooperative Member are required." };
  }

  try {
    const pig = await prisma.pig.findUnique({ where: { id: pigId } });
    if (!pig || pig.deletedAt) {
      return { success: false, error: "Selected pig was not found." };
    }

    const member = await prisma.user.findUnique({ where: { id: memberId } });
    if (!member || member.deletedAt || member.cooperativeId !== cooperativeId) {
      return { success: false, error: "Selected member is invalid or does not belong to the cooperative." };
    }

    // Check qualification payment (16,000 RWF + 2,800 RWF tax)
    let payment = await prisma.cooperativeMemberPayment.findFirst({
      where: { memberId },
    });

    if (!payment || payment.status !== "VERIFIED") {
      if (!momoReference) {
        return {
          success: false,
          error: "Member qualification payment required: Member must pay 16,000 RWF (pig value) + 2,800 RWF tax (18,800 RWF total) to the Finance Officer's MoMo merchant code and provide the MoMo transaction reference.",
        };
      }
      // Register and verify payment instantly
      payment = await prisma.cooperativeMemberPayment.create({
        data: {
          memberId,
          cooperativeId,
          pigValueFee: new Prisma.Decimal("16000.00"),
          taxFee: new Prisma.Decimal("2800.00"),
          totalAmount: new Prisma.Decimal("18800.00"),
          momoReference,
          status: "VERIFIED",
          verifiedById: actor.id,
        },
      });
    }

    // Check vet clearance
    const clearance = await checkPigVetClearance(pigId, "DISTRIBUTION");
    if (!clearance.cleared) {
      return {
        success: false,
        error: clearance.reason || "This pig has not passed veterinary health clearance and cannot be distributed.",
      };
    }

    await prisma.$transaction(async (tx) => {
      // Update pig ownership
      await tx.pig.update({
        where: { id: pig.id },
        data: {
          cooperativeId,
          ownerMemberId: memberId,
          ownerMemberName: member.name,
          status: PigStatus.DISTRIBUTED,
        },
      });

      // Record distribution
      const distribution = await tx.pigDistribution.create({
        data: {
          pigId: pig.id,
          beneficiaryId: memberId, // Map cooperative member as beneficiary for audit/distribution records
          distributedById: actor.id,
          distributionDate: new Date(),
          notes: notes || `Distributed by Cell Manager ${actor.name} to Cooperative Member ${member.name}`,
        },
      });

      // Create revolving cycle expecting minimum 2 piglets return
      const cycleNumber = (await tx.revolvingCycle.count({ where: { beneficiaryId: memberId } })) + 1;
      await tx.revolvingCycle.create({
        data: {
          beneficiaryId: memberId,
          cycleNumber,
          startDate: new Date(),
          expectedReturn: 2,
          notes: `Cooperative revolving return requirement: minimum 2 piglets upon birth. Distribution ID: ${distribution.id}`,
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
            memberId,
            memberName: member.name,
            cellManagerName: actor.name,
            paymentVerified: true,
          },
        },
      });
    });

    revalidateAllCooperativePaths();
    revalidatePath("/dashboard/finance");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: getFriendlyActionError(err, "Failed to distribute pig to member."),
    };
  }
}
