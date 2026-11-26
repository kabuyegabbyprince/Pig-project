import "server-only";

import { prisma, isSupabaseSchemaMissingError } from "@/lib/prisma";

export type UserAddressProfile = {
  districtId: string;
  districtName: string;
  sectorId: string;
  sectorName: string;
  cellId: string;
  cellName: string;
  villageId: string;
  villageName: string;
  address: string;
};

export const EMPTY_USER_ADDRESS: UserAddressProfile = {
  districtId: "",
  districtName: "",
  sectorId: "",
  sectorName: "",
  cellId: "",
  cellName: "",
  villageId: "",
  villageName: "",
  address: "",
};

const USER_ADDRESS_KEY_PREFIX = "user_address:";

function getAddressKey(userId: string) {
  return `${USER_ADDRESS_KEY_PREFIX}${userId}`;
}

export function isCellManagerProfileComplete(
  _phone: string | null | undefined,
  _addr: UserAddressProfile,
  nid?: string | null | undefined
): boolean {
  return Boolean(nid?.trim());
}

export async function getUserAddressProfile(
  userId: string
): Promise<UserAddressProfile> {
  const result: UserAddressProfile = { ...EMPTY_USER_ADDRESS };

  try {
    const userRow = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (userRow) {
      const u = userRow as unknown as {
        districtName?: string | null;
        sectorName?: string | null;
        cellName?: string | null;
        villageName?: string | null;
        address?: string | null;
      };
      if (u.districtName) result.districtName = u.districtName;
      if (u.sectorName) result.sectorName = u.sectorName;
      if (u.cellName) result.cellName = u.cellName;
      if (u.villageName) result.villageName = u.villageName;
      if (u.address) result.address = u.address;
    }
  } catch (err) {
    if (!isSupabaseSchemaMissingError(err)) {
      console.error("Failed reading user address columns:", err);
    }
  }

  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: getAddressKey(userId) },
    });
    if (setting?.value) {
      const parsed = JSON.parse(setting.value) as Partial<UserAddressProfile>;
      if (!result.districtId && parsed.districtId) result.districtId = parsed.districtId;
      if (!result.districtName && parsed.districtName) result.districtName = parsed.districtName;
      if (!result.sectorId && parsed.sectorId) result.sectorId = parsed.sectorId;
      if (!result.sectorName && parsed.sectorName) result.sectorName = parsed.sectorName;
      if (!result.cellId && parsed.cellId) result.cellId = parsed.cellId;
      if (!result.cellName && parsed.cellName) result.cellName = parsed.cellName;
      if (!result.villageId && parsed.villageId) result.villageId = parsed.villageId;
      if (!result.villageName && parsed.villageName) result.villageName = parsed.villageName;
      if (!result.address && parsed.address) result.address = parsed.address;
    }
  } catch (err) {
    console.error("Failed reading user_address setting:", err);
  }

  return result;
}

export async function saveUserAddressProfile(
  userId: string,
  userName: string,
  userRole: string,
  payload: UserAddressProfile
): Promise<void> {
  // 1. Persist directly on users table if address columns have been applied via update.sql
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        districtName: payload.districtName || null,
        sectorName: payload.sectorName || null,
        cellName: payload.cellName || null,
        villageName: payload.villageName || null,
        address: payload.address || null,
      } as Record<string, unknown>,
    });
  } catch (err) {
    if (!isSupabaseSchemaMissingError(err)) {
      throw err;
    }
  }

  // 2. Always persist structured address JSON in SystemSetting (user_address:<id>)
  const key = getAddressKey(userId);
  await prisma.systemSetting.upsert({
    where: { key },
    create: {
      key,
      value: JSON.stringify(payload),
      description: `Profile address for ${userName} (${userRole})`,
      updatedById: userId,
    },
    update: {
      value: JSON.stringify(payload),
      description: `Profile address for ${userName} (${userRole})`,
      updatedById: userId,
    },
  });
}
