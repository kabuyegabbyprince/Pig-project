"use server";

import { prisma } from "@/lib/prisma";
import { getActiveUser } from "@/lib/active-user";
import { BeneficiaryStatus, Prisma, Role, PigHealthStatus, PigStatus, RevolvingStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { checkPigVetClearance } from "@/lib/vet-clearance";
import { normalizeRoleValue } from "@/lib/roles";

export async function transferPig(data: {
  pigId: string;
  toBeneficiaryId: string;
  reason: string;
}) {
  const user = await getActiveUser([Role.SUPER_ADMIN]);
  if (!user) throw new Error("Unauthorized");

  const pigId = typeof data?.pigId === "string" ? data.pigId.trim() : "";
  const toBeneficiaryId = typeof data?.toBeneficiaryId === "string" ? data.toBeneficiaryId.trim() : "";
  const reason = typeof data?.reason === "string" ? data.reason.trim() : "";
  if (!pigId || !toBeneficiaryId || !reason) throw new Error("Pig, beneficiary, and transfer reason are required.");
  if (reason.length > 2000) throw new Error("Transfer reason is too long.");

  const pig = await prisma.pig.findFirst({
    where: { id: pigId, deletedAt: null },
    include: { currentBeneficiary: true },
  });
  if (!pig) throw new Error("Pig not found");

  const fromLocation = pig.currentLocation || "Unknown";
  const toBeneficiary = await prisma.beneficiary.findFirst({
    where: { id: toBeneficiaryId, status: { notIn: [BeneficiaryStatus.INACTIVE, BeneficiaryStatus.SUSPENDED, BeneficiaryStatus.WITHDRAWN] }, deletedAt: null },
  });
  if (!toBeneficiary) throw new Error("Target beneficiary not found");
  if (!toBeneficiary.beneficiaryNumber.startsWith("COOP-")) {
    throw new Error("Pig receivers (beneficiaries) must be enrolled Cooperative Members or Cooperative Leaders.");
  }

  const targetMemberId = toBeneficiary.beneficiaryNumber.replace(/^COOP-/, "");
  const targetMember = await prisma.user.findUnique({ where: { id: targetMemberId } });
  const targetMemberRole = normalizeRoleValue(targetMember?.role);
  if (
    !targetMember ||
    targetMember.deletedAt ||
    !targetMember.isActive ||
    !targetMember.cooperativeId ||
    (targetMemberRole !== Role.COOPERATIVE_MEMBER && targetMemberRole !== Role.COOPERATIVE_LEADER)
  ) {
    throw new Error("Target beneficiary must be an active Cooperative Member or Cooperative Leader.");
  }

  const targetCoop = await prisma.cooperative.findUnique({ where: { id: targetMember.cooperativeId } });
  if (!targetCoop) throw new Error("Target beneficiary cooperative not found.");

  const toLocation =
    `${targetCoop.name} (${targetCoop.cellName})` ||
    `${toBeneficiary.districtStr ?? ""}, ${toBeneficiary.sectorStr ?? ""}, ${toBeneficiary.cellStr ?? ""}`
      .replace(/,\s*,/g, ",")
      .replace(/^,\s*|,\s*$/g, "") ||
    "Unknown";

  await prisma.$transaction(async (tx) => {
    await tx.pigTransfer.create({
      data: {
        pigId: pig.id,
        previousBeneficiaryId: pig.currentBeneficiaryId,
        newBeneficiaryId: toBeneficiaryId,
        fromLocation,
        toLocation,
        transferDate: new Date(),
        reason,
        requestedById: user.id,
        approvedById: user.id,
        status: "COMPLETED",
      }
    });

    await tx.beneficiary.update({
      where: { id: toBeneficiaryId },
      data: {
        status: BeneficiaryStatus.PIGLET_RECEIVED,
        savingsGroup: targetCoop.name,
        cellStr: targetCoop.cellName,
      },
    });

    await tx.pig.update({
      where: { id: pig.id },
      data: {
        currentBeneficiaryId: toBeneficiaryId,
        cooperativeId: targetCoop.id,
        ownerMemberId: targetMember.id,
        ownerMemberName: targetMember.name,
        currentLocation: toLocation,
        status: "REDISTRIBUTED"
      }
    });
  });

  revalidatePath("/dashboard/admin/pigs");
  revalidatePath("/dashboard/admin/transfers");
}

export async function recordMortality(data: {
  pigId: string;
  reportedCause: string;
}) {
  const user = await getActiveUser([Role.SUPER_ADMIN, Role.PROJECT_MANAGER, Role.CELL_MANAGER, Role.COOPERATIVE_LEADER, Role.VETERINARIAN]);
  if (!user) throw new Error("Unauthorized");

  const pigId = typeof data?.pigId === "string" ? data.pigId.trim() : "";
  const reportedCause = typeof data?.reportedCause === "string" ? data.reportedCause.trim() : "";
  if (!pigId || !reportedCause) throw new Error("Pig and reported cause are required.");
  if (reportedCause.length > 2000) throw new Error("Reported cause is too long.");

  const pig = await prisma.pig.findFirst({ where: { id: pigId, deletedAt: null } });
  if (!pig) throw new Error("Pig not found");

  await prisma.$transaction(async (tx) => {
    await tx.mortalityRecord.create({
      data: {
        pigId: pig.id,
        beneficiaryId: pig.currentBeneficiaryId,
        deathDate: new Date(),
        reportedCause,
        reportedById: user.id,
        legacyStatus: "PENDING",
      }
    });

    await tx.pig.update({
      where: { id: pig.id },
      data: { status: "DECEASED" }
    });
  });

  const admins = await prisma.user.findMany({
    where: { role: Role.SUPER_ADMIN, isActive: true, deletedAt: null },
  });
  if (admins.length > 0) {
    await prisma.notification.createMany({
      data: admins.map(a => ({
        userId: a.id,
        type: "MORTALITY_ALERT",
        title: "Pig Death Reported",
        message: `Mortality reported for Pig ID: ${pig.tagNumber}`,
        relatedEntity: "PIG",
        relatedEntityId: pig.id,
      }))
    });
  }

  revalidatePath("/dashboard/admin/pigs");
}

export async function distributePig(data: {
  pigId?: string;
  beneficiaryId?: string;
  toBeneficiaryId?: string;
  nationalId?: string;
  district?: string;
  sector?: string;
  cell?: string;
  village?: string;
  districtId?: string;
  sectorId?: string;
  cellId?: string;
  villageId?: string;
  pigReceived?: boolean | string;
  notes?: string;
  reason?: string;
  recordedAt?: string;
}) {
  const user = await getActiveUser([Role.SUPER_ADMIN, Role.PROJECT_MANAGER, Role.CELL_MANAGER, Role.COOPERATIVE_LEADER]);
  if (!user) throw new Error("Unauthorized");

  const beneficiaryId = data.beneficiaryId ?? data.toBeneficiaryId;
  if (!beneficiaryId) throw new Error("Please select a registered beneficiary.");

  // Confirm that pig was actually received
  const isReceived = data.pigReceived === true || data.pigReceived === "true" || data.pigReceived === "yes" || data.pigReceived === "on";
  if (!isReceived) {
    throw new Error("Distribution can only be completed when the pig has actually been received and confirmed.");
  }

  const notes = data.notes?.trim() || null;
  if (notes && notes.length > 2000) throw new Error("Distribution notes are too long.");
  const distributionDate = new Date();

  const actorRole = normalizeRoleValue(user.role) || user.role;

  await prisma.$transaction(async (tx) => {
    const beneficiary = await tx.beneficiary.findFirst({
      where: { id: beneficiaryId, deletedAt: null },
      select: {
        id: true,
        fullName: true,
        beneficiaryNumber: true,
        nationalId: true,
        districtId: true,
        sectorId: true,
        cellId: true,
        villageId: true,
      },
    });
    if (!beneficiary) throw new Error("Selected beneficiary does not exist.");
    if (!beneficiary.beneficiaryNumber.startsWith("COOP-")) {
      throw new Error(
        "Pig receivers (beneficiaries) must be enrolled Cooperative Members or Cooperative Leaders."
      );
    }

    const memberId = beneficiary.beneficiaryNumber.replace(/^COOP-/, "");
    const member = await tx.user.findUnique({ where: { id: memberId } });
    const memberRole = normalizeRoleValue(member?.role);
    if (
      !member ||
      member.deletedAt ||
      !member.isActive ||
      !member.cooperativeId ||
      (memberRole !== Role.COOPERATIVE_MEMBER && memberRole !== Role.COOPERATIVE_LEADER)
    ) {
      throw new Error(
        "Pig receivers (beneficiaries) must be active Cooperative Members or Cooperative Leaders in a cooperative."
      );
    }

    const coop = await tx.cooperative.findUnique({ where: { id: member.cooperativeId } });
    if (!coop) {
      throw new Error("Cooperative for this member/leader was not found.");
    }

    if (actorRole === Role.CELL_MANAGER && String(coop.createdById) !== String(user.id)) {
      throw new Error(
        "Access denied: Only the Cell Manager who added this cooperative and member can distribute a pig to them."
      );
    }
    if (actorRole === Role.COOPERATIVE_LEADER) {
      const fullActor = await tx.user.findUnique({
        where: { id: user.id },
        select: { cooperativeId: true },
      });
      if (
        String(fullActor?.cooperativeId ?? "") !== String(coop.id) &&
        String(coop.leaderUserId ?? "") !== String(user.id)
      ) {
        throw new Error(
          "Access denied: Cooperative Leaders can only distribute within their own cooperative."
        );
      }
    }

    const payment = await tx.cooperativeMemberPayment.findFirst({
      where: { memberId, cooperativeId: coop.id },
    });
    if (!payment || payment.status !== "VERIFIED") {
      throw new Error(
        payment?.status === "PENDING"
          ? "Payment is still PENDING Finance Officer verification. Finance must verify this member's 18,800 RWF payment before pig distribution."
          : payment?.status === "REJECTED"
            ? "This member's 18,800 RWF payment submission was REJECTED by Finance. Resubmit a valid MoMo reference first."
            : "This member has not been verified by Finance for the 18,800 RWF (16,000 + 2,800 RWF) qualification payment yet."
      );
    }

    // Update beneficiary with nationalId, cooperative link, and location if provided
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateBeneficiaryData: Record<string, any> = {
      status: BeneficiaryStatus.PIGLET_RECEIVED,
      savingsGroup: coop.name,
      cellStr: data.cell || coop.cellName,
    };
    if (data.nationalId?.trim()) {
      updateBeneficiaryData.nationalId = data.nationalId.trim();
    }
    if (data.districtId) updateBeneficiaryData.districtId = data.districtId;
    if (data.sectorId) updateBeneficiaryData.sectorId = data.sectorId;
    if (data.cellId) updateBeneficiaryData.cellId = data.cellId;
    if (data.villageId) updateBeneficiaryData.villageId = data.villageId;
    if (data.district) updateBeneficiaryData.districtStr = data.district;
    if (data.sector) updateBeneficiaryData.sectorStr = data.sector;
    if (data.village) updateBeneficiaryData.villageStr = data.village;

    await tx.beneficiary.update({
      where: { id: beneficiaryId },
      data: updateBeneficiaryData,
    });

    // Determine the pig asset for distribution (with Phase 6.1 Veterinary Clearance Guardrail)
    let targetPigId = data.pigId?.trim();
    if (targetPigId) {
      const clearance = await checkPigVetClearance(targetPigId, "DISTRIBUTION");
      if (!clearance.cleared) {
        throw new Error(clearance.reason || "The selected pig has not passed veterinary clearance.");
      }
      await tx.pig.update({
        where: { id: targetPigId },
        data: {
          currentBeneficiaryId: beneficiaryId,
          cooperativeId: coop.id,
          ownerMemberId: member.id,
          ownerMemberName: member.name,
          currentLocation: `${coop.name} (${coop.cellName})`,
          status: PigStatus.DISTRIBUTED,
        },
      });
    } else {
      // Find an existing healthy, vet-cleared pig in stock that is not distributed
      const candidatePigs = await tx.pig.findMany({
        where: {
          currentBeneficiaryId: null,
          healthStatus: PigHealthStatus.HEALTHY,
          status: { notIn: [PigStatus.DISTRIBUTED, PigStatus.DECEASED, PigStatus.SOLD, PigStatus.INACTIVE] },
          deletedAt: null,
        },
        orderBy: { createdAt: "asc" },
      });

      let availablePig: (typeof candidatePigs)[number] | null = null;
      for (const candidate of candidatePigs) {
        const clearance = await checkPigVetClearance(candidate.id, "DISTRIBUTION");
        if (clearance.cleared) {
          availablePig = candidate;
          break;
        }
      }

      if (!availablePig) {
        throw new Error(
          "No healthy, vet-cleared pigs are currently available in stock for distribution. Please register and clear pigs first."
        );
      }

      targetPigId = availablePig.id;
      await tx.pig.update({
        where: { id: availablePig.id },
        data: {
          currentBeneficiaryId: beneficiaryId,
          cooperativeId: coop.id,
          ownerMemberId: member.id,
          ownerMemberName: member.name,
          currentLocation: `${coop.name} (${coop.cellName})`,
          status: PigStatus.DISTRIBUTED,
        },
      });
    }

    // Record completed distribution
    const distribution = await tx.pigDistribution.create({
      data: {
        pigId: targetPigId,
        beneficiaryId,
        distributionDate,
        distributedById: user.id,
        districtId: data.districtId || beneficiary.districtId,
        sectorId: data.sectorId || beneficiary.sectorId,
        cellId: data.cellId || beneficiary.cellId,
        villageId: data.villageId || beneficiary.villageId,
        notes,
      },
    });

    // Create the required obligation to return two piglets
    const cycleNumber = (await tx.revolvingCycle.count({ where: { beneficiaryId } })) + 1;
    await tx.revolvingCycle.create({
      data: {
        beneficiaryId,
        cycleNumber,
        startDate: distributionDate,
        expectedReturn: 2,
        notes: `Created for distribution ${distribution.id}`,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        role: user.role,
        action: "DISTRIBUTED",
        entity: "PIG_DISTRIBUTION",
        entityId: distribution.id,
        newValue: {
          pigId: targetPigId,
          beneficiaryId,
          pigReceived: true,
          expectedPigletReturns: 2,
        },
      },
    });
  });

  revalidatePath("/dashboard/admin/pigs");
  revalidatePath("/dashboard/field/pigs");
  revalidatePath("/dashboard/field/distributions");
  revalidatePath("/dashboard/admin/distributions");
  revalidatePath("/dashboard/admin/revolving");
  revalidatePath("/dashboard/admin");
  revalidatePath(`/dashboard/admin/beneficiaries/${beneficiaryId}`);
  revalidatePath(`/dashboard/field/beneficiaries/${beneficiaryId}`);
}

export async function returnPig(data: {
  beneficiaryId?: string;
  quantity?: number;
  returnDate?: string;
  pigletsReceived?: boolean | string;
  notes?: string;
}) {
  const user = await getActiveUser([Role.SUPER_ADMIN, Role.PROJECT_MANAGER, Role.CELL_MANAGER, Role.COOPERATIVE_LEADER, Role.COOPERATIVE_MEMBER]);
  if (!user) throw new Error("Unauthorized");

  const beneficiaryId = typeof data?.beneficiaryId === "string" ? data.beneficiaryId.trim() : "";
  if (!beneficiaryId) throw new Error("Select a beneficiary.");

  // Confirm that piglets were physically received
  const isReceived =
    data?.pigletsReceived === true ||
    data?.pigletsReceived === "true" ||
    data?.pigletsReceived === "yes" ||
    data?.pigletsReceived === "on";
  if (!isReceived) {
    throw new Error("Piglet return can only be completed when piglets have physically been received and confirmed.");
  }

  const quantity = Number(data?.quantity);
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Number of piglets returned must be a valid number of at least 1.");
  }

  const returnDate = data?.returnDate ? new Date(data.returnDate) : new Date();
  if (isNaN(returnDate.getTime())) {
    throw new Error("Invalid return date.");
  }

  const notesValue = data?.notes;
  if (typeof notesValue !== "undefined" && typeof notesValue !== "string") {
    throw new Error("Invalid return notes.");
  }
  const notes = typeof notesValue === "string" ? notesValue.trim() : "";
  if (notes.length > 2000) throw new Error("Return notes are too long.");

  await prisma.$transaction(async (tx) => {
    const beneficiary = await tx.beneficiary.findFirst({
      where: { id: beneficiaryId, deletedAt: null },
      select: { id: true, fullName: true, beneficiaryNumber: true },
    });
    if (!beneficiary) throw new Error("Beneficiary not found.");

    const [cycles, distributions, priorReturns, legacyPigletReturns] = await Promise.all([
      tx.revolvingCycle.findMany({
        where: { beneficiaryId, status: { not: RevolvingStatus.CANCELLED } },
        orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
        select: { id: true, expectedReturn: true, status: true },
      }),
      tx.pigDistribution.count({ where: { beneficiaryId } }),
      tx.pigReturn.aggregate({ _sum: { quantity: true }, where: { beneficiaryId } }),
      tx.piglet.count({ where: { returnedFromId: beneficiaryId } }),
    ]);

    const cycleObligation = cycles.reduce((sum, cycle) => sum + cycle.expectedReturn, 0);
    // Standard foundation obligation: 2 piglets returned per distribution (or default 2)
    const totalRequired = Math.max(cycleObligation, distributions > 0 ? distributions * 2 : 2);
    const returnedBefore = (priorReturns._sum.quantity ?? 0) + legacyPigletReturns;
    const remainingObligation = Math.max(0, totalRequired - returnedBefore);

    if (remainingObligation < 1) {
      throw new Error("This beneficiary has already fully completed their piglet return obligation.");
    }

    if (quantity > remainingObligation) {
      throw new Error(
        `Cannot record ${quantity} returned piglets. The remaining obligation is ${remainingObligation} piglet(s).`
      );
    }

    const lastDistribution = await tx.pigDistribution.findFirst({
      where: { beneficiaryId },
      orderBy: { distributionDate: "desc" },
      include: { pig: true },
    });
    const parentTag = lastDistribution?.pig?.tagNumber ?? "Distributed Pig";

    const year = returnDate.getFullYear();
    const prefix = `PF-RW-${year}-`;
    let firstPigAssetId: string | null = null;

    const lastPig = await tx.pig.findFirst({
      where: { tagNumber: { startsWith: prefix } },
      orderBy: { tagNumber: "desc" },
    });
    let baseSequence = 0;
    if (lastPig) {
      const parts = lastPig.tagNumber.split("-");
      const lastPart = parts[parts.length - 1];
      const parsed = parseInt(lastPart, 10);
      if (!Number.isNaN(parsed)) {
        baseSequence = parsed;
      }
    }

    // Create a registered pig asset in inventory for each returned piglet
    for (let i = 1; i <= quantity; i++) {
      const tagNumber = `${prefix}${String(baseSequence + i).padStart(5, "0")}`;

      const newPigAsset = await tx.pig.create({
        data: {
          tagNumber,
          status: PigStatus.REGISTERED,
          healthStatus: PigHealthStatus.HEALTHY,
          currentBeneficiaryId: null,
          dateReceived: returnDate,
          source: `Returned from ${beneficiary.fullName} (${beneficiary.beneficiaryNumber}) - Parent: ${parentTag}`,
          notes: notes || "Returned revolving piglet awaiting vet clearance",
        },
      });
      if (!firstPigAssetId) firstPigAssetId = newPigAsset.id;
    }

    const returnedPiglet = await tx.pigReturn.create({
      data: {
        beneficiaryId,
        pigId: firstPigAssetId,
        recordedById: user.id,
        returnDate,
        quantity,
        notes: notes || null,
        veterinaryVerified: false,
      },
      select: { id: true, returnDate: true },
    });

    let remainingReturns = returnedBefore + quantity;
    if (cycles.length > 0) {
      for (const cycle of cycles) {
        const acceptedForCycle = Math.min(cycle.expectedReturn, remainingReturns);
        const nextStatus =
          acceptedForCycle >= cycle.expectedReturn
            ? RevolvingStatus.COMPLETED
            : acceptedForCycle > 0
              ? RevolvingStatus.PARTIALLY_COMPLETED
              : cycle.status;
        remainingReturns = Math.max(0, remainingReturns - cycle.expectedReturn);

        if (nextStatus !== cycle.status) {
          await tx.revolvingCycle.update({
            where: { id: cycle.id },
            data: { status: nextStatus },
          });
        }
      }
    } else {
      await tx.revolvingCycle.create({
        data: {
          beneficiaryId,
          cycleNumber: 1,
          startDate: returnDate,
          expectedReturn: totalRequired,
          status:
            quantity >= totalRequired
              ? RevolvingStatus.COMPLETED
              : RevolvingStatus.PARTIALLY_COMPLETED,
          notes: `Created on return ${returnedPiglet.id}`,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: user.id,
        role: user.role,
        action: "RETURNED",
        entity: "PIG_RETURN",
        entityId: returnedPiglet.id,
        newValue: {
          beneficiaryId,
          returnDate: returnedPiglet.returnDate.toISOString(),
          quantity,
          pigletsReceived: true,
          remainingAfter: Math.max(0, totalRequired - (returnedBefore + quantity)),
        },
      },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  revalidatePath("/dashboard/admin/pigs");
  revalidatePath("/dashboard/field/pigs");
  revalidatePath("/dashboard/admin/returns");
  revalidatePath("/dashboard/field/returns");
  revalidatePath("/dashboard/admin/revolving");
  revalidatePath("/dashboard/admin");
  revalidatePath(`/dashboard/admin/beneficiaries/${beneficiaryId}`);
  revalidatePath(`/dashboard/field/beneficiaries/${beneficiaryId}`);
}
