"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { NotificationType, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getActiveUser } from "@/lib/active-user";
import { normalizePhone } from "@/lib/phone-utils";
import { syncSupabaseAuthUser } from "@/lib/supabase-auth";
import { normalizeRoleValue } from "@/lib/roles";
import { getUserAddressProfile } from "@/lib/user-profile-address";
import { syncBeneficiaryRecordForCoopUser } from "@/app/actions/cooperative";

const MAX_COOPERATIVE_MEMBERS = 15;

export async function enrollCooperativeBeneficiary(formData: FormData): Promise<{
  success: boolean;
  error?: string;
  redirectUrl?: string;
}> {
  const actor = await getActiveUser([Role.SUPER_ADMIN, Role.CELL_MANAGER]);
  if (!actor) {
    return {
      success: false,
      error: "Unauthorized: Only Cell Managers or Super Admins can enroll cooperative beneficiaries.",
    };
  }

  const actorRole = normalizeRoleValue(actor.role) || actor.role;
  const cooperativeId = String(formData.get("cooperativeId") || "").trim();
  const fullName = String(formData.get("fullName") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const rawPhone = String(formData.get("phone") || "").trim();
  const nationalId = String(formData.get("nationalId") || "").trim() || null;
  const requestedRoleRaw = String(formData.get("role") || Role.COOPERATIVE_MEMBER).trim();
  const staticPassword = String(formData.get("staticPassword") || "").trim();

  if (!cooperativeId || !fullName || !email || !staticPassword) {
    return {
      success: false,
      error:
        "Pig receivers (beneficiaries) must belong to a cooperative. Cooperative, Full Name, Email, and Static Initial Password are required.",
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
    if (actorRole === Role.CELL_MANAGER && String(coop.createdById) !== String(actor.id)) {
      return {
        success: false,
        error: "Access denied: You can only enroll beneficiaries into cooperatives you created.",
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
        error: `Cooperative "${coop.name}" is already at maximum capacity of ${MAX_COOPERATIVE_MEMBERS} members (including Cooperative Leader).`,
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
    const actorAddress = await getUserAddressProfile(actor.id);

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
      await syncBeneficiaryRecordForCoopUser({
        userId: String(previousLeader.id),
        name: previousLeader.name,
        phone: previousLeader.phone ?? null,
        role: Role.COOPERATIVE_MEMBER,
        isActive: Boolean(previousLeader.isActive),
        cooperativeName: coop.name,
        cellName: coop.cellName,
        createdById: actor.id,
      });
    }

    const createdUser = await prisma.user.create({
      data: {
        name: fullName,
        email,
        phone: normalizedPhone,
        password: hashedPassword,
        role: assignedRole,
        cooperativeId,
        mustChangePassword: true,
        isActive: true,
        districtName: actorAddress.districtName || null,
        sectorName: actorAddress.sectorName || null,
        cellName: actorAddress.cellName || coop.cellName,
        villageName: actorAddress.villageName || null,
      },
    });

    await syncSupabaseAuthUser({
      email,
      password: staticPassword,
      name: fullName,
      role: assignedRole,
      phone: normalizedPhone,
      publicUserId: String(createdUser.id),
      isActive: true,
    });

    const beneficiary = await syncBeneficiaryRecordForCoopUser({
      userId: String(createdUser.id),
      name: fullName,
      phone: normalizedPhone,
      nationalId,
      role: assignedRole,
      isActive: true,
      cooperativeName: coop.name,
      cellName: actorAddress.cellName || coop.cellName,
      districtName: actorAddress.districtName || null,
      sectorName: actorAddress.sectorName || null,
      villageName: actorAddress.villageName || null,
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

    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        role: actor.role,
        action: "CREATED",
        entity: "BENEFICIARY",
        entityId: beneficiary.id,
        newValue: {
          beneficiaryNumber: beneficiary.beneficiaryNumber,
          fullName: beneficiary.fullName,
          userId: String(createdUser.id),
          role: assignedRole,
          cooperativeId,
          cooperativeName: coop.name,
        },
      },
    });

    try {
      await prisma.notification.create({
        data: {
          userId: String(createdUser.id),
          type: NotificationType.INFO,
          title: `Enrolled in ${coop.name}`,
          message: `You have been registered as a ${assignedRole === Role.COOPERATIVE_LEADER ? "Cooperative Leader" : "Cooperative Member"} and eligible beneficiary in ${coop.name} (${coop.cellName}).`,
          relatedEntity: "BENEFICIARY",
          relatedEntityId: beneficiary.id,
        },
      });
    } catch {
      // Non-blocking
    }

    revalidatePath("/dashboard/admin/beneficiaries");
    revalidatePath("/dashboard/field/beneficiaries");
    revalidatePath("/dashboard/field/cooperative");
    revalidatePath("/dashboard/field/distributions/new");
    revalidatePath("/");

    return {
      success: true,
      redirectUrl:
        actorRole === Role.SUPER_ADMIN
          ? "/dashboard/admin/beneficiaries"
          : "/dashboard/field/beneficiaries",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to enroll cooperative beneficiary.";
    return { success: false, error: message };
  }
}
