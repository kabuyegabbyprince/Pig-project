"use server";

import { revalidatePath } from "next/cache";
import {
  BeneficiaryStatus,
  NotificationType,
  PigHealthStatus,
  PigStatus,
  Prisma,
  RevolvingStatus,
  Role,
} from "@prisma/client";
import { prisma, isSupabaseTableMissingError } from "@/lib/prisma";
import { getActiveUser } from "@/lib/active-user";
import { checkPigVetClearance } from "@/lib/vet-clearance";

export type SerializedCycleRow = {
  id: string;
  beneficiaryId: string;
  beneficiaryName: string;
  beneficiaryNumber: string;
  cycleNumber: number;
  startDate: string;
  dueDate: string | null;
  expectedReturn: number;
  returnedCount: number;
  status: RevolvingStatus;
  isPastDue: boolean;
};

export type SerializedReturnedPigletStock = {
  id: string;
  tagNumber: string;
  source: string | null;
  healthStatus: PigHealthStatus;
  status: PigStatus;
  dateReceived: string | null;
};

export type SerializedWaitingBeneficiary = {
  id: string;
  fullName: string;
  beneficiaryNumber: string;
  status: BeneficiaryStatus;
  districtStr: string | null;
};

export async function getRevolvingManagementOverview() {
  const [cycles, returnSums, stockPigs, waitingBeneficiaries] = await Promise.all([
    prisma.revolvingCycle.findMany({
      orderBy: [{ status: "asc" }, { startDate: "asc" }],
    }),
    prisma.pigReturn.groupBy({
      by: ["beneficiaryId"],
      _sum: { quantity: true },
    }),
    prisma.pig.findMany({
      where: {
        deletedAt: null,
        currentBeneficiaryId: null,
        healthStatus: PigHealthStatus.HEALTHY,
        status: { in: [PigStatus.ACTIVE, PigStatus.REGISTERED, PigStatus.RETURNED] },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        tagNumber: true,
        source: true,
        healthStatus: true,
        status: true,
        dateReceived: true,
      },
    }),
    prisma.beneficiary.findMany({
      where: {
        deletedAt: null,
        status: { in: [BeneficiaryStatus.AWAITING_PIGLET, BeneficiaryStatus.ACTIVE] },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        fullName: true,
        beneficiaryNumber: true,
        status: true,
        districtStr: true,
      },
    }),
  ]);

  const beneficiaryIds = Array.from(new Set(cycles.map((c) => c.beneficiaryId)));
  const benList = beneficiaryIds.length
    ? await prisma.beneficiary.findMany({
        where: { id: { in: beneficiaryIds } },
        select: { id: true, fullName: true, beneficiaryNumber: true },
      })
    : [];
  const benMap = new Map(benList.map((b) => [b.id, b]));
  const returnMap = new Map(returnSums.map((r) => [r.beneficiaryId, r._sum.quantity ?? 0]));

  const now = new Date();
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;

  const serializedCycles: SerializedCycleRow[] = cycles.map((c) => {
    const ben = benMap.get(c.beneficiaryId);
    const effectiveDue = c.dueDate ? new Date(c.dueDate) : new Date(new Date(c.startDate).getTime() + oneYearMs);
    const isPastDue =
      c.status !== RevolvingStatus.COMPLETED &&
      c.status !== RevolvingStatus.CANCELLED &&
      effectiveDue.getTime() < now.getTime();

    return {
      id: c.id,
      beneficiaryId: c.beneficiaryId,
      beneficiaryName: ben?.fullName ?? "Beneficiary",
      beneficiaryNumber: ben?.beneficiaryNumber ?? "—",
      cycleNumber: c.cycleNumber,
      startDate: new Date(c.startDate).toISOString(),
      dueDate: c.dueDate ? new Date(c.dueDate).toISOString() : effectiveDue.toISOString(),
      expectedReturn: c.expectedReturn,
      returnedCount: returnMap.get(c.beneficiaryId) ?? 0,
      status: c.status,
      isPastDue,
    };
  });

  const clearedStock: SerializedReturnedPigletStock[] = [];
  for (const p of stockPigs) {
    const clearance = await checkPigVetClearance(p.id, "DISTRIBUTION");
    if (clearance.cleared) {
      clearedStock.push({
        id: p.id,
        tagNumber: p.tagNumber,
        source: p.source,
        healthStatus: p.healthStatus,
        status: p.status,
        dateReceived: p.dateReceived ? new Date(p.dateReceived).toISOString() : null,
      });
    }
  }

  return {
    cycles: serializedCycles,
    clearedStock,
    waitingBeneficiaries,
  };
}

export async function checkOverdueRevolvingCycles() {
  const actor = await getActiveUser([Role.SUPER_ADMIN, Role.PROJECT_MANAGER, Role.CELL_MANAGER, Role.COOPERATIVE_LEADER]);
  if (!actor) return { success: false, error: "Unauthorized" };

  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  const activeCycles = await prisma.revolvingCycle.findMany({
    where: {
      status: { in: [RevolvingStatus.ACTIVE, RevolvingStatus.PARTIALLY_COMPLETED] },
    },
  });

  const overdueCycles = activeCycles.filter((c) => {
    if (c.dueDate) return new Date(c.dueDate).getTime() < now.getTime();
    return new Date(c.startDate).getTime() < oneYearAgo.getTime();
  });

  if (overdueCycles.length === 0) {
    return { success: true, updatedCount: 0, notifiedUsers: 0 };
  }

  for (const cycle of overdueCycles) {
    await prisma.revolvingCycle.update({
      where: { id: cycle.id },
      data: {
        status: RevolvingStatus.OVERDUE,
        dueDate: cycle.dueDate ?? new Date(new Date(cycle.startDate).getTime() + 365 * 24 * 60 * 60 * 1000),
      },
    });
  }

  const staffToNotify = await prisma.user.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      role: { in: [Role.SUPER_ADMIN, Role.CELL_MANAGER, Role.COOPERATIVE_LEADER] },
    },
    select: { id: true },
  });

  if (staffToNotify.length > 0) {
    await prisma.notification.createMany({
      data: staffToNotify.map((u) => ({
        userId: u.id,
        type: NotificationType.REVOLVING,
        title: `${overdueCycles.length} Revolving Cycle(s) Marked OVERDUE`,
        message: `Automated revolving check flagged ${overdueCycles.length} beneficiary cycle(s) past their 2-piglet return due date. Follow up with field teams.`,
        relatedEntity: "REVOLVING_CYCLE",
        relatedEntityId: overdueCycles[0].id,
      })),
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      role: actor.role,
      action: "REVOLVING_OVERDUE_CHECK",
      entity: "REVOLVING_CYCLE",
      entityId: overdueCycles[0].id,
      newValue: {
        markedOverdueCount: overdueCycles.length,
        cycleIds: overdueCycles.map((c) => c.id),
      },
    },
  });

  revalidatePath("/dashboard/admin/revolving");
  revalidatePath("/dashboard/admin/distributions");
  revalidatePath("/dashboard/admin");

  return {
    success: true,
    updatedCount: overdueCycles.length,
    notifiedUsers: staffToNotify.length,
  };
}

export async function allocateClearedPiglet(formData: FormData) {
  const actor = await getActiveUser([Role.SUPER_ADMIN, Role.PROJECT_MANAGER]);
  if (!actor) return { success: false, error: "Unauthorized" };

  const pigId = String(formData.get("pigId") || "").trim();
  const destination = String(formData.get("destination") || "").trim(); // "BENEFICIARY" | "ECOMMERCE"
  const beneficiaryId = String(formData.get("beneficiaryId") || "").trim();
  const priceStr = String(formData.get("price") || "").trim();
  const productName = String(formData.get("productName") || "").trim();

  if (!pigId) return { success: false, error: "Select a cleared pig/piglet." };

  if (destination === "BENEFICIARY") {
    if (!beneficiaryId) {
      return { success: false, error: "Select a waiting beneficiary." };
    }
    const clearance = await checkPigVetClearance(pigId, "DISTRIBUTION");
    if (!clearance.cleared || !clearance.pig) {
      return { success: false, error: clearance.reason || "Pig is not vet-cleared for distribution." };
    }

    const beneficiary = await prisma.beneficiary.findFirst({
      where: { id: beneficiaryId, deletedAt: null },
      select: {
        id: true,
        fullName: true,
        districtId: true,
        sectorId: true,
        cellId: true,
        villageId: true,
      },
    });
    if (!beneficiary) return { success: false, error: "Beneficiary not found." };

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.pig.update({
        where: { id: pigId },
        data: {
          currentBeneficiaryId: beneficiary.id,
          status: PigStatus.DISTRIBUTED,
        },
      });

      await tx.beneficiary.update({
        where: { id: beneficiary.id },
        data: { status: BeneficiaryStatus.PIGLET_RECEIVED },
      });

      const dist = await tx.pigDistribution.create({
        data: {
          pigId,
          beneficiaryId: beneficiary.id,
          distributedById: actor.id,
          distributionDate: now,
          districtId: beneficiary.districtId,
          sectorId: beneficiary.sectorId,
          cellId: beneficiary.cellId,
          villageId: beneficiary.villageId,
          notes: "Allocated from cleared revolving stock",
        },
      });

      const cycleCount = await tx.revolvingCycle.count({ where: { beneficiaryId: beneficiary.id } });
      await tx.revolvingCycle.create({
        data: {
          beneficiaryId: beneficiary.id,
          cycleNumber: cycleCount + 1,
          startDate: now,
          dueDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
          expectedReturn: 2,
          notes: `Allocated via distribution ${dist.id}`,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actor.id,
          role: actor.role,
          action: "ALLOCATED_TO_BENEFICIARY",
          entity: "PIG",
          entityId: pigId,
          newValue: {
            tagNumber: clearance.pig!.tagNumber,
            beneficiaryId: beneficiary.id,
            beneficiaryName: beneficiary.fullName,
          },
        },
      });
    });

    revalidatePath("/dashboard/admin/revolving");
    revalidatePath("/dashboard/admin/distributions");
    revalidatePath("/dashboard/admin/pigs");
    revalidatePath("/dashboard/admin");
    return {
      success: true,
      message: `Pig ${clearance.pig.tagNumber} allocated to ${beneficiary.fullName}.`,
    };
  }

  if (destination === "ECOMMERCE") {
    if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(priceStr) || Number(priceStr) <= 0) {
      return { success: false, error: "Enter a valid positive RWF price for the E-Commerce listing." };
    }
    const clearance = await checkPigVetClearance(pigId, "SALE");
    if (!clearance.cleared || !clearance.pig) {
      return { success: false, error: clearance.reason || "Pig is not vet-cleared for sale." };
    }

    try {
      const product = await prisma.storeProduct.create({
        data: {
          name: productName || `Vet-Cleared Piglet (${clearance.pig.tagNumber})`,
          description: `Healthy vet-cleared revolving surplus animal (${clearance.pig.tagNumber}).`,
          price: new Prisma.Decimal(priceStr),
          stock: 1,
          category: "Livestock",
          isAvailable: true,
          pigId: clearance.pig.id,
          sourcePigTag: clearance.pig.tagNumber,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: actor.id,
          role: actor.role,
          action: "ALLOCATED_TO_ECOMMERCE",
          entity: "STORE_PRODUCT",
          entityId: product.id,
          newValue: {
            pigId: clearance.pig.id,
            sourcePigTag: clearance.pig.tagNumber,
            price: priceStr,
          },
        },
      });

      revalidatePath("/dashboard/admin/revolving");
      revalidatePath("/dashboard/admin/ecommerce");
      revalidatePath("/store");
      return {
        success: true,
        message: `Pig ${clearance.pig.tagNumber} listed on E-Commerce storefront.`,
      };
    } catch (err) {
      if (isSupabaseTableMissingError(err)) {
        return {
          success: false,
          error: "Create the E-Commerce tables in Supabase SQL Editor first (/dashboard/admin/ecommerce).",
        };
      }
      throw err;
    }
  }

  return { success: false, error: "Select a valid allocation destination." };
}
