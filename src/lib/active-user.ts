import "server-only";

import { cache } from "react";
import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const getCurrentSessionUser = cache(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, role: true, isActive: true, deletedAt: true },
  });
});

export async function getActiveUser(allowedRoles: readonly Role[]) {
  const user = await getCurrentSessionUser();

  if (
    !user ||
    !user.isActive ||
    user.deletedAt ||
    !allowedRoles.includes(user.role)
  ) {
    return null;
  }

  return user;
}
