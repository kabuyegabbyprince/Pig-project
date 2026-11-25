"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { PigHealthStatus, PigSex, PigStatus, Role } from "@prisma/client";
import { getActiveUser } from "@/lib/active-user";

export type SerializedPigInventoryItem = {
  id: string;
  tagNumber: string;
  healthStatus: PigHealthStatus;
  sex: PigSex | null;
  purchasePrice: number;
  status: PigStatus;
  createdAt: string;
  currentBeneficiaryName: string | null;
  currentBeneficiaryNumber: string | null;
};

async function generatePigId(offset = 0) {
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

  if (!lastPig) return `${prefix}${String(1 + offset).padStart(5, "0")}`;

  const parts = lastPig.tagNumber.split("-");
  const lastPart = parts[parts.length - 1];
  const lastSequence = parseInt(lastPart, 10);
  const nextSequence = (Number.isNaN(lastSequence) ? 1 : lastSequence + 1) + offset;
  const sequenceStr = String(nextSequence).padStart(5, "0");

  return `${prefix}${sequenceStr}`;
}

export async function getRegisteredPigs(): Promise<SerializedPigInventoryItem[]> {
  const pigs = await prisma.pig.findMany({
    where: { deletedAt: null },
    include: {
      currentBeneficiary: {
        select: { fullName: true, beneficiaryNumber: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return pigs.map((p) => ({
    id: p.id,
    tagNumber: p.tagNumber,
    healthStatus: p.healthStatus,
    sex: p.sex,
    purchasePrice: p.purchasePrice ? Number(p.purchasePrice) : 80000,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
    currentBeneficiaryName: p.currentBeneficiary?.fullName ?? null,
    currentBeneficiaryNumber: p.currentBeneficiary?.beneficiaryNumber ?? null,
  }));
}

export async function getTotalPigsAvailable(): Promise<number> {
  return await prisma.pig.count({
    where: {
      deletedAt: null,
      currentBeneficiaryId: null,
      status: {
        notIn: [PigStatus.DISTRIBUTED, PigStatus.DECEASED, PigStatus.SOLD, PigStatus.INACTIVE],
      },
    },
  });
}

export async function registerIndividualPig(data: {
  tagNumber?: string;
  healthStatus?: PigHealthStatus;
  sex?: PigSex | string;
  purchasePrice?: number | string;
}): Promise<{ success: boolean; pig: SerializedPigInventoryItem; totalAvailable: number }> {
  const user = await getActiveUser([
    Role.SUPER_ADMIN,
    Role.PROJECT_MANAGER,
    Role.CELL_MANAGER,
    Role.COOPERATIVE_LEADER,
    Role.COOPERATIVE_MEMBER,
  ]);
  if (!user) throw new Error("Unauthorized");

  const rawTag = typeof data.tagNumber === "string" ? data.tagNumber.trim() : "";
  const healthStatus = data.healthStatus && Object.values(PigHealthStatus).includes(data.healthStatus)
    ? data.healthStatus
    : PigHealthStatus.HEALTHY;

  const sexInput = typeof data.sex === "string" ? data.sex.toUpperCase() : data.sex;
  const sex = sexInput === PigSex.MALE || sexInput === "MALE"
    ? PigSex.MALE
    : sexInput === PigSex.FEMALE || sexInput === "FEMALE"
    ? PigSex.FEMALE
    : null;

  const priceNum = Number(data.purchasePrice);
  const purchasePrice = !Number.isNaN(priceNum) && priceNum > 0 ? priceNum : 80000;

  let tagNumber = rawTag;
  if (!tagNumber) {
    tagNumber = await generatePigId();
  }

  const existing = await prisma.pig.findFirst({
    where: { tagNumber, deletedAt: null },
  });
  if (existing) {
    throw new Error(`Pig with tag number "${tagNumber}" already exists in the system.`);
  }

  let createdPig: SerializedPigInventoryItem | null = null;

  await prisma.$transaction(async (tx) => {
    if (rawTag) {
      const conflict = await tx.pig.findFirst({ where: { tagNumber: rawTag, deletedAt: null } });
      if (conflict) {
        throw new Error(`Pig with tag number "${rawTag}" already exists.`);
      }
    }

    const pig = await tx.pig.create({
      data: {
        tagNumber,
        healthStatus,
        sex,
        purchasePrice,
        status: PigStatus.REGISTERED,
        currentBeneficiaryId: null,
      },
      include: {
        currentBeneficiary: { select: { fullName: true, beneficiaryNumber: true } },
      },
    });

    createdPig = {
      id: pig.id,
      tagNumber: pig.tagNumber,
      healthStatus: pig.healthStatus,
      sex: pig.sex,
      purchasePrice: pig.purchasePrice ? Number(pig.purchasePrice) : 80000,
      status: pig.status,
      createdAt: pig.createdAt.toISOString(),
      currentBeneficiaryName: pig.currentBeneficiary?.fullName ?? null,
      currentBeneficiaryNumber: pig.currentBeneficiary?.beneficiaryNumber ?? null,
    };

    await tx.auditLog.create({
      data: {
        userId: user.id,
        role: user.role,
        action: "CREATED",
        entity: "PIG",
        entityId: pig.id,
        newValue: { tagNumber: pig.tagNumber, healthStatus: pig.healthStatus, sex: pig.sex, purchasePrice },
      },
    });
  });

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/pigs");
  revalidatePath("/dashboard/admin/pigs/new");
  revalidatePath("/dashboard/field/pigs");
  revalidatePath("/dashboard/field/pigs/new");
  revalidatePath("/dashboard/field/distributions/new");
  revalidatePath("/dashboard/field/returns/new");
  revalidatePath("/dashboard/vet");
  revalidatePath("/api/pigs/available");

  const totalAvailable = await getTotalPigsAvailable();

  return {
    success: true,
    pig: createdPig!,
    totalAvailable,
  };
}

export async function updateIndividualPig(data: {
  pigId: string;
  tagNumber: string;
  healthStatus: PigHealthStatus;
  sex?: PigSex | string;
  purchasePrice?: number | string;
}): Promise<{ success: boolean; pig: SerializedPigInventoryItem; totalAvailable: number }> {
  const user = await getActiveUser([
    Role.SUPER_ADMIN,
    Role.PROJECT_MANAGER,
    Role.CELL_MANAGER,
    Role.COOPERATIVE_LEADER,
    Role.COOPERATIVE_MEMBER,
  ]);
  if (!user) throw new Error("Unauthorized");

  const pigId = typeof data.pigId === "string" ? data.pigId.trim() : "";
  const tagNumber = typeof data.tagNumber === "string" ? data.tagNumber.trim() : "";
  const healthStatus = data.healthStatus;
  if (!pigId || !tagNumber) throw new Error("Pig ID and unique tag number are required.");

  const sexInput = typeof data.sex === "string" ? data.sex.toUpperCase() : data.sex;
  const sex = sexInput === PigSex.MALE || sexInput === "MALE"
    ? PigSex.MALE
    : sexInput === PigSex.FEMALE || sexInput === "FEMALE"
    ? PigSex.FEMALE
    : null;

  const priceNum = Number(data.purchasePrice);
  const purchasePrice = !Number.isNaN(priceNum) && priceNum > 0 ? priceNum : 80000;

  const pigRecord = await prisma.pig.findUnique({ where: { id: pigId } });
  if (!pigRecord || pigRecord.deletedAt) throw new Error("Pig record not found.");

  if (pigRecord.tagNumber !== tagNumber) {
    const conflict = await prisma.pig.findFirst({
      where: { tagNumber, deletedAt: null, id: { not: pigId } },
    });
    if (conflict) {
      throw new Error(`Tag number "${tagNumber}" is already assigned to another pig.`);
    }
  }

  let updatedPig: SerializedPigInventoryItem | null = null;

  await prisma.$transaction(async (tx) => {
    const pig = await tx.pig.update({
      where: { id: pigId },
      data: {
        tagNumber,
        healthStatus,
        sex,
        purchasePrice,
      },
      include: {
        currentBeneficiary: { select: { fullName: true, beneficiaryNumber: true } },
      },
    });

    updatedPig = {
      id: pig.id,
      tagNumber: pig.tagNumber,
      healthStatus: pig.healthStatus,
      sex: pig.sex,
      purchasePrice: pig.purchasePrice ? Number(pig.purchasePrice) : 80000,
      status: pig.status,
      createdAt: pig.createdAt.toISOString(),
      currentBeneficiaryName: pig.currentBeneficiary?.fullName ?? null,
      currentBeneficiaryNumber: pig.currentBeneficiary?.beneficiaryNumber ?? null,
    };

    await tx.auditLog.create({
      data: {
        userId: user.id,
        role: user.role,
        action: "UPDATED",
        entity: "PIG",
        entityId: pig.id,
        newValue: { tagNumber: pig.tagNumber, healthStatus: pig.healthStatus, sex: pig.sex, purchasePrice },
      },
    });
  });

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/pigs");
  revalidatePath("/dashboard/admin/pigs/new");
  revalidatePath("/dashboard/field/pigs");
  revalidatePath("/dashboard/field/pigs/new");
  revalidatePath("/api/pigs/available");

  const totalAvailable = await getTotalPigsAvailable();

  return {
    success: true,
    pig: updatedPig!,
    totalAvailable,
  };
}

export async function deleteIndividualPig(pigId: string) {
  const user = await getActiveUser([
    Role.SUPER_ADMIN,
    Role.PROJECT_MANAGER,
    Role.CELL_MANAGER,
    Role.COOPERATIVE_LEADER,
    Role.COOPERATIVE_MEMBER,
  ]);
  if (!user) throw new Error("Unauthorized");

  const id = typeof pigId === "string" ? pigId.trim() : "";
  if (!id) throw new Error("Pig ID is required.");

  const pig = await prisma.pig.findUnique({ where: { id } });
  if (!pig || pig.deletedAt) throw new Error("Pig record not found.");

  if (pig.status === PigStatus.DISTRIBUTED || pig.currentBeneficiaryId) {
    throw new Error(`Cannot delete: Pig ${pig.tagNumber} has already been distributed to a beneficiary.`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.pig.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        role: user.role,
        action: "DELETED",
        entity: "PIG",
        entityId: id,
        newValue: { tagNumber: pig.tagNumber },
      },
    });
  });

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/pigs");
  revalidatePath("/dashboard/admin/pigs/new");
  revalidatePath("/dashboard/field/pigs");
  revalidatePath("/dashboard/field/pigs/new");
  revalidatePath("/api/pigs/available");

  const totalAvailable = await getTotalPigsAvailable();

  return { success: true, totalAvailable };
}
