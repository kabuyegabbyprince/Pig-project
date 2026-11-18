import "server-only";

import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const SUPER_ADMIN_BOOTSTRAPPED_KEY = "super_admin_bootstrapped";

export type BootstrapStatus = {
  isFirstSuperAdminAvailable: boolean;
  totalUsers: number;
};

export async function getBootstrapStatus(): Promise<BootstrapStatus> {
  const [bootstrappedSetting, users] = await Promise.all([
    prisma.systemSetting.findUnique({
      where: { key: SUPER_ADMIN_BOOTSTRAPPED_KEY },
      select: { value: true },
    }),
    prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, role: true },
    }),
  ]);

  const isBootstrapped = bootstrappedSetting?.value === "true";
  const hasRealSuperAdmin = users.some(
    (u) => u.role === Role.SUPER_ADMIN && !u.id.startsWith("usr-")
  );

  const isFirstSuperAdminAvailable =
    users.length === 0 || (!isBootstrapped && !hasRealSuperAdmin);

  return {
    isFirstSuperAdminAvailable,
    totalUsers: users.length,
  };
}
