"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { Prisma, Role } from "@prisma/client";
import { getActiveUser } from "@/lib/active-user";
import { getCachedSession } from "@/lib/session";
import { invalidateAuthUserCache } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone-utils";
import {
  deleteSupabaseAuthUserByEmail,
  syncSupabaseAuthUser,
} from "@/lib/supabase-auth";

import {
  ALL_ROLE_VALUES,
  ADMIN_STAFF_ROLE_OPTIONS,
  CELL_MANAGER_COOP_ROLE_OPTIONS,
} from "@/lib/roles";

const assignableRoles = ALL_ROLE_VALUES;

type AssignableRole = Role;

function isAssignableRole(value: string): value is AssignableRole {
  return assignableRoles.some((role) => role === value);
}

export async function createUser(formData: FormData) {
  const actor = await getActiveUser([
    Role.SUPER_ADMIN,
    Role.CELL_MANAGER,
    Role.COOPERATIVE_LEADER,
  ]);
  if (!actor) throw new Error("Unauthorized");

  const nameValue = formData.get("name");
  const emailValue = formData.get("email");
  const phoneValue = formData.get("phone");
  const passwordValue = formData.get("password");
  const roleValue = formData.get("role");
  const returnToValue = formData.get("returnTo");
  const name = typeof nameValue === "string" ? nameValue.trim() : "";
  const email = typeof emailValue === "string" ? emailValue.trim().toLowerCase() : "";
  const phone = typeof phoneValue === "string" ? phoneValue.trim() : "";
  const password = typeof passwordValue === "string" ? passwordValue : "";
  const requestedRole = typeof roleValue === "string" ? roleValue : "";

  const defaultListPath =
    actor.role === Role.SUPER_ADMIN
      ? "/dashboard/admin/users"
      : "/dashboard/field/cooperative";
  const safeReturnTo =
    typeof returnToValue === "string" &&
    (returnToValue === "/dashboard/admin/users" ||
      returnToValue === "/dashboard/field/cooperative")
      ? returnToValue
      : defaultListPath;
  const formErrorPath =
    safeReturnTo === "/dashboard/field/cooperative" && actor.role !== Role.SUPER_ADMIN
      ? "/dashboard/field/cooperative"
      : "/dashboard/admin/users/new";

  if (!name || !email || !password.trim() || !requestedRole) {
    redirect(`${formErrorPath}?error=Missing+required+fields`);
  }
  if (!isAssignableRole(requestedRole)) {
    redirect(`${formErrorPath}?error=Select+a+valid+user+role`);
  }

  // Enforce hierarchical role assignment permissions
  if (actor.role === Role.CELL_MANAGER) {
    const allowed = CELL_MANAGER_COOP_ROLE_OPTIONS.map((r) => r.value);
    if (!allowed.includes(requestedRole)) {
      redirect(`${formErrorPath}?error=Cell+Managers+can+only+register+Cooperative+Leaders+and+Members`);
    }
  } else if (actor.role === Role.COOPERATIVE_LEADER) {
    if (requestedRole !== Role.COOPERATIVE_MEMBER) {
      redirect(`${formErrorPath}?error=Cooperative+Leaders+can+only+register+Cooperative+Members`);
    }
  } else if (actor.role === Role.SUPER_ADMIN) {
    const staffAllowed = ADMIN_STAFF_ROLE_OPTIONS.map((r) => r.value);
    if (!staffAllowed.includes(requestedRole) && !CELL_MANAGER_COOP_ROLE_OPTIONS.some((r) => r.value === requestedRole)) {
      redirect(`${formErrorPath}?error=Select+a+valid+user+role`);
    }
  }

  const role = requestedRole;

  const normalizedPhone = phone ? normalizePhone(phone) : null;

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
      redirect(`${formErrorPath}?error=User+with+this+email+already+exists`);
    }

    if (normalizedPhone && existingUser.phone === normalizedPhone) {
      redirect(`${formErrorPath}?error=A+user+with+this+phone+number+already+exists`);
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    let createdUserId = "";
    await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          phone: normalizedPhone,
          password: hashedPassword,
          role,
          isActive: true,
        },
      });
      createdUserId = newUser.id;

      await tx.auditLog.create({
        data: {
          action: "CREATED",
          entity: "USER",
          entityId: newUser.id,
          userId: actor.id,
          role: actor.role,
          newValue: { name, email, role },
        },
      });
    });

    await syncSupabaseAuthUser({
      email,
      password,
      name,
      role,
      phone: normalizedPhone,
      publicUserId: createdUserId,
      isActive: true,
    });

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/admin/users");
    revalidatePath("/dashboard/field/cooperative");
    redirect(safeReturnTo);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(", ") : "";

      if (target.includes("phone")) {
        redirect(`${formErrorPath}?error=A+user+with+this+phone+number+already+exists`);
      }

      if (target.includes("email")) {
        redirect(`${formErrorPath}?error=User+with+this+email+already+exists`);
      }
    }

    throw error;
  }
}

export async function updatePersonalProfile(formData: FormData) {
  const { saveUserAddressProfile, getUserAddressProfile } = await import(
    "@/lib/user-profile-address"
  );
  const session = await getCachedSession();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const returnToRaw = String(formData.get("returnTo") || "").trim();
  const safeReturnTo =
    returnToRaw === "/dashboard/field" ? "/dashboard/field" : "/dashboard/settings";

  const name = String(formData.get("name") || "").trim();
  const rawPhone = String(formData.get("phone") || "").trim();
  const phone = rawPhone ? normalizePhone(rawPhone) : "";
  const submittedNationalId = String(formData.get("nationalId") || "").trim();

  const districtName = String(formData.get("district") || "").trim();
  const sectorName = String(formData.get("sector") || "").trim();
  const cellName = String(formData.get("cell") || "").trim();
  const villageName = String(formData.get("village") || "").trim();
  const districtId = String(formData.get("districtId") || "").trim() || districtName;
  const sectorId = String(formData.get("sectorId") || "").trim() || sectorName;
  const cellId = String(formData.get("cellId") || "").trim() || cellName;
  const villageId = String(formData.get("villageId") || "").trim() || villageName;
  const address = String(formData.get("address") || "").trim();

  if (!name) {
    redirect(`${safeReturnTo}?profileError=${encodeURIComponent("Full Name is required")}`);
  }

  try {
    const prevUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, name: true, phone: true, role: true, nationalId: true },
    });

    const finalNationalId = prevUser?.nationalId || submittedNationalId || null;

    if (prevUser?.role === Role.CELL_MANAGER || prevUser?.role === Role.COOPERATIVE_LEADER || prevUser?.role === Role.COOPERATIVE_MEMBER) {
      if (!phone) {
        redirect(
          `${safeReturnTo}?profileError=${encodeURIComponent("Phone number is required.")}`
        );
      }
      if (!districtName || !sectorName || !cellName) {
        redirect(
          `${safeReturnTo}?profileError=${encodeURIComponent("Please enter your District, Sector, and Cell address.")}`
        );
      }
      if (!finalNationalId) {
        redirect(
          `${safeReturnTo}?profileError=${encodeURIComponent("National ID (Irangamuntu) is required.")}`
        );
      }
    }

    if (phone) {
      const existingWithPhone = await prisma.user.findFirst({
        where: {
          phone,
          NOT: { id: session.user.id },
        },
      });
      if (existingWithPhone) {
        redirect(
          `${safeReturnTo}?profileError=${encodeURIComponent("Phone number is already registered to another user")}`
        );
      }
    }

    if (!prevUser?.nationalId && submittedNationalId) {
      const existingWithNid = await prisma.user.findFirst({
        where: {
          nationalId: submittedNationalId,
          NOT: { id: session.user.id },
        },
      });
      if (existingWithNid) {
        redirect(
          `${safeReturnTo}?profileError=${encodeURIComponent("National ID is already registered to another user")}`
        );
      }
    }

    const prevAddress = await getUserAddressProfile(session.user.id);

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name,
        phone: phone || null,
        nationalId: finalNationalId,
        districtName: districtName || null,
        sectorName: sectorName || null,
        cellName: cellName || null,
        villageName: villageName || null,
        address: address || null,
      },
    });

    const nextAddress = {
      districtId,
      districtName,
      sectorId,
      sectorName,
      cellId,
      cellName,
      villageId,
      villageName,
      address,
    };

    await saveUserAddressProfile(
      session.user.id,
      name,
      prevUser?.role || "USER",
      nextAddress
    );

    if (prevUser?.email) {
      await syncSupabaseAuthUser({
        email: prevUser.email,
        name,
        phone: phone || null,
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        role: prevUser?.role || null,
        action: "UPDATED",
        entity: "USER_PROFILE",
        entityId: session.user.id,
        previousValue: {
          name: prevUser?.name,
          phone: prevUser?.phone,
          address: prevAddress,
        },
        newValue: {
          name,
          phone: phone || null,
          address: nextAddress,
        },
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update profile";
    if (message.includes("NEXT_REDIRECT")) throw err;
    redirect(`${safeReturnTo}?profileError=${encodeURIComponent(message)}`);
  }

  invalidateAuthUserCache(session.user.id);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/field");
  revalidatePath("/dashboard/field/cooperative");
  revalidatePath("/dashboard/field/stock-reports");
  revalidatePath("/dashboard/history");
  redirect(`${safeReturnTo}?profileSuccess=1`);
}

export async function changeUserPassword(formData: FormData) {
  const session = await getCachedSession();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!currentPassword || !newPassword) {
    redirect("/dashboard/settings?passwordError=Missing+required+fields");
  }
  if (newPassword.length < 6) {
    redirect("/dashboard/settings?passwordError=Password+must+be+at+least+6+characters");
  }
  if (newPassword !== confirmPassword) {
    redirect("/dashboard/settings?passwordError=Passwords+do+not+match");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) throw new Error("User not found");

  const matches = await bcrypt.compare(currentPassword, user.password);
  if (!matches) {
    redirect("/dashboard/settings?passwordError=Current+password+is+incorrect");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, mustChangePassword: false },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err ?? "");
    if (msg.includes("42703") || msg.includes("PGRST204") || msg.includes("does not exist")) {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });
    } else {
      throw err;
    }
  }
  await syncSupabaseAuthUser({
    email: user.email,
    password: newPassword,
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      role: user.role,
      action: "PASSWORD_CHANGED",
      entity: "USER_SECURITY",
      entityId: user.id,
      newValue: { changedAt: new Date().toISOString() },
    },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/field");
  revalidatePath("/dashboard/history");
  redirect("/dashboard/settings?passwordSuccess=1");
}

export async function deleteUser(userId: string) {
  const actor = await getActiveUser([Role.SUPER_ADMIN]);
  if (!actor) {
    return { success: false, error: "Unauthorized" };
  }

  if (actor.id === userId) {
    return { success: false, error: "You cannot delete your own account" };
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!targetUser) {
    return { success: false, error: "User not found" };
  }

  try {
    try {
      await prisma.user.delete({ where: { id: userId } });
      await deleteSupabaseAuthUserByEmail(targetUser.email);
    } catch {
      await prisma.user.update({
        where: { id: userId },
        data: {
          deletedAt: new Date(),
          isActive: false,
        },
      });
      await syncSupabaseAuthUser({
        email: targetUser.email,
        isActive: false,
      });
    }

    await prisma.auditLog.create({
      data: {
        action: "DELETED",
        entity: "USER",
        entityId: userId,
        userId: actor.id,
        role: actor.role,
        newValue: { name: targetUser.name, email: targetUser.email, role: targetUser.role },
      },
    });

    invalidateAuthUserCache(userId);
    revalidatePath("/dashboard/admin/users");
    revalidatePath("/dashboard/admin");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete user:", error);
    return { success: false, error: "Failed to delete user" };
  }
}

export async function updateUserRole(userId: string, newRole: string) {
  const actor = await getActiveUser([Role.SUPER_ADMIN]);
  if (!actor) {
    return { success: false, error: "Unauthorized: Only Super Admins can change user roles." };
  }

  if (actor.id === userId) {
    return { success: false, error: "You cannot change your own role." };
  }

  if (!isAssignableRole(newRole)) {
    return { success: false, error: "Invalid role selected." };
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, deletedAt: true },
  });

  if (!targetUser || targetUser.deletedAt) {
    return { success: false, error: "User not found." };
  }

  if (targetUser.role === newRole) {
    return { success: true };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    });
    await syncSupabaseAuthUser({
      email: targetUser.email,
      role: newRole,
    });

    await prisma.auditLog.create({
      data: {
        action: "ROLE_UPDATED",
        entity: "USER",
        entityId: userId,
        userId: actor.id,
        role: actor.role,
        previousValue: { role: targetUser.role },
        newValue: { name: targetUser.name, email: targetUser.email, role: newRole },
      },
    });

    try {
      await prisma.notification.create({
        data: {
          userId,
          title: "Role Updated",
          message: `Your workspace role was updated from ${targetUser.role} to ${newRole} by ${actor.name}.`,
          relatedEntity: "USER",
          relatedEntityId: userId,
        },
      });
    } catch {
      // Non-blocking notification failure
    }

    invalidateAuthUserCache(userId);
    revalidatePath("/dashboard/admin/users");
    revalidatePath("/dashboard/admin");
    return { success: true };
  } catch (error) {
    console.error("Failed to update user role:", error);
    return { success: false, error: "Failed to update user role." };
  }
}

export async function toggleUserActive(userId: string) {
  const actor = await getActiveUser([Role.SUPER_ADMIN]);
  if (!actor) {
    return { success: false, error: "Unauthorized: Only Super Admins can manage user status." };
  }

  if (actor.id === userId) {
    return { success: false, error: "You cannot suspend your own account." };
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, isActive: true, deletedAt: true },
  });

  if (!targetUser || targetUser.deletedAt) {
    return { success: false, error: "User not found." };
  }

  const nextActive = !targetUser.isActive;

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: nextActive },
    });
    await syncSupabaseAuthUser({
      email: targetUser.email,
      isActive: nextActive,
    });

    await prisma.auditLog.create({
      data: {
        action: nextActive ? "ACTIVATED" : "SUSPENDED",
        entity: "USER",
        entityId: userId,
        userId: actor.id,
        role: actor.role,
        previousValue: { isActive: targetUser.isActive },
        newValue: { name: targetUser.name, email: targetUser.email, isActive: nextActive },
      },
    });

    invalidateAuthUserCache(userId);
    revalidatePath("/dashboard/admin/users");
    revalidatePath("/dashboard/admin");
    return { success: true, isActive: nextActive };
  } catch (error) {
    console.error("Failed to toggle user status:", error);
    return { success: false, error: "Failed to update user status." };
  }
}

