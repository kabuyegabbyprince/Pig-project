import { PigHealthStatus, PigStatus, VeterinaryVerificationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type VetClearanceResult = {
  cleared: boolean;
  reason?: string;
  pig?: {
    id: string;
    tagNumber: string;
    status: PigStatus;
    healthStatus: PigHealthStatus;
    currentBeneficiaryId: string | null;
  };
};

const CLEARED_EXAM_STATUSES = new Set<string>([
  VeterinaryVerificationStatus.VERIFIED,
  VeterinaryVerificationStatus.COMPLETED,
]);

const BLOCKED_RECORD_STATUSES = new Set<string>([
  "UNDER_TREATMENT",
  "CRITICAL",
  "PENDING",
  "TREATMENT_REQUIRED",
  "SICK",
]);

/**
 * Verifies Phase 6.1 Veterinary Clearance before a Pig can be distributed
 * to a beneficiary or listed for sale on the E-Commerce storefront.
 */
export async function checkPigVetClearance(
  pigId: string,
  mode: "DISTRIBUTION" | "SALE"
): Promise<VetClearanceResult> {
  const pig = await prisma.pig.findFirst({
    where: { id: pigId, deletedAt: null },
    select: {
      id: true,
      tagNumber: true,
      status: true,
      healthStatus: true,
      currentBeneficiaryId: true,
    },
  });

  if (!pig) {
    return { cleared: false, reason: "Pig record not found." };
  }

  if (
    pig.status === PigStatus.DECEASED ||
    pig.status === PigStatus.SOLD ||
    pig.status === PigStatus.INACTIVE ||
    pig.status === PigStatus.DISTRIBUTED
  ) {
    return {
      cleared: false,
      pig,
      reason: `Pig ${pig.tagNumber} has status ${pig.status} and is not eligible.`,
    };
  }

  if (pig.currentBeneficiaryId) {
    return {
      cleared: false,
      pig,
      reason: `Pig ${pig.tagNumber} is currently assigned to a beneficiary.`,
    };
  }

  if (pig.healthStatus !== PigHealthStatus.HEALTHY) {
    return {
      cleared: false,
      pig,
      reason: `Veterinary clearance blocked: Pig ${pig.tagNumber} has health status ${pig.healthStatus} (must be HEALTHY).`,
    };
  }

  const [unverifiedReturns, latestExam, latestVetRecord] = await Promise.all([
    prisma.pigReturn.count({
      where: { pigId: pig.id, veterinaryVerified: false },
    }),
    prisma.veterinaryExamination.findFirst({
      where: { pigId: pig.id },
      orderBy: { examinationDate: "desc" },
      select: { id: true, verificationStatus: true },
    }),
    prisma.veterinaryRecord.findFirst({
      where: { pigId: pig.id },
      orderBy: { date: "desc" },
      select: { id: true, status: true },
    }),
  ]);

  if (unverifiedReturns > 0) {
    return {
      cleared: false,
      pig,
      reason: `Veterinary clearance blocked: Returned pig ${pig.tagNumber} is still awaiting veterinary inspection clearance.`,
    };
  }

  if (latestExam && !CLEARED_EXAM_STATUSES.has(latestExam.verificationStatus)) {
    return {
      cleared: false,
      pig,
      reason: `Veterinary clearance blocked: Latest examination for ${pig.tagNumber} is ${latestExam.verificationStatus}.`,
    };
  }

  if (latestVetRecord && BLOCKED_RECORD_STATUSES.has(latestVetRecord.status.toUpperCase())) {
    return {
      cleared: false,
      pig,
      reason: `Veterinary clearance blocked: Latest clinical record for ${pig.tagNumber} is ${latestVetRecord.status}.`,
    };
  }

  if (mode === "SALE") {
    const hasExplicitClearance =
      pig.status === PigStatus.ACTIVE || Boolean(latestExam) || Boolean(latestVetRecord);
    if (!hasExplicitClearance) {
      return {
        cleared: false,
        pig,
        reason: `Veterinary clearance required before listing ${pig.tagNumber} on E-Commerce. Complete a veterinary check first.`,
      };
    }
  }

  return { cleared: true, pig };
}
