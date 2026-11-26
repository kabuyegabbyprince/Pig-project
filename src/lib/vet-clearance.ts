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

  const isHealthyOrRecovered =
    pig.healthStatus === PigHealthStatus.HEALTHY ||
    pig.healthStatus === PigHealthStatus.RECOVERED;

  if (!isHealthyOrRecovered) {
    return {
      cleared: false,
      pig,
      reason: `Veterinary clearance blocked: Pig ${pig.tagNumber} has health status ${pig.healthStatus} (must be HEALTHY or RECOVERED).`,
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

  const hasExplicitClearance =
    pig.status === PigStatus.ACTIVE || Boolean(latestExam) || Boolean(latestVetRecord);
  if (!hasExplicitClearance) {
    return {
      cleared: false,
      pig,
      reason:
        mode === "SALE"
          ? `Veterinary clearance required before listing ${pig.tagNumber} on E-Commerce. Complete a veterinary check first.`
          : `Veterinary clearance required before distributing ${pig.tagNumber}. Complete a veterinary examination first.`,
    };
  }

  return { cleared: true, pig };
}

export type ClearedPigSummary = {
  id: string;
  tagNumber: string;
  breed: string | null;
  currentWeight: number | null;
};

/**
 * Bulk-loads vet-cleared pigs eligible for Gebyian Network SALE in 4 parallel queries
 * instead of N+1 sequential queries per pig.
 */
export async function getClearedPigsForSale(
  excludePigIds?: Set<string>
): Promise<ClearedPigSummary[]> {
  const healthyPigs = await prisma.pig.findMany({
    where: {
      deletedAt: null,
      currentBeneficiaryId: null,
      healthStatus: PigHealthStatus.HEALTHY,
      status: { in: [PigStatus.ACTIVE, PigStatus.REGISTERED] },
    },
    orderBy: { tagNumber: "asc" },
    take: 60,
    select: {
      id: true,
      tagNumber: true,
      breed: true,
      currentWeight: true,
      status: true,
    },
  });

  const candidatePigs = excludePigIds
    ? healthyPigs.filter((p) => !excludePigIds.has(p.id))
    : healthyPigs;

  if (candidatePigs.length === 0) return [];

  const candidateIds = candidatePigs.map((p) => p.id);

  const [unverifiedReturns, exams, vetRecords] = await Promise.all([
    prisma.pigReturn.findMany({
      where: { pigId: { in: candidateIds }, veterinaryVerified: false },
      select: { pigId: true },
    }),
    prisma.veterinaryExamination.findMany({
      where: { pigId: { in: candidateIds } },
      orderBy: { examinationDate: "desc" },
      select: { pigId: true, verificationStatus: true },
    }),
    prisma.veterinaryRecord.findMany({
      where: { pigId: { in: candidateIds } },
      orderBy: { date: "desc" },
      select: { pigId: true, status: true },
    }),
  ]);

  const unverifiedReturnSet = new Set(unverifiedReturns.map((r) => r.pigId));
  const latestExamByPig = new Map<string, string>();
  for (const e of exams) {
    if (!latestExamByPig.has(e.pigId)) {
      latestExamByPig.set(e.pigId, e.verificationStatus);
    }
  }
  const latestRecordByPig = new Map<string, string>();
  for (const r of vetRecords) {
    if (!latestRecordByPig.has(r.pigId)) {
      latestRecordByPig.set(r.pigId, r.status);
    }
  }

  const cleared: ClearedPigSummary[] = [];
  for (const p of candidatePigs) {
    if (unverifiedReturnSet.has(p.id)) continue;

    const examStatus = latestExamByPig.get(p.id);
    if (examStatus && !CLEARED_EXAM_STATUSES.has(examStatus)) continue;

    const recStatus = latestRecordByPig.get(p.id);
    if (recStatus && BLOCKED_RECORD_STATUSES.has(recStatus.toUpperCase())) continue;

    const hasExplicitClearance =
      p.status === PigStatus.ACTIVE || Boolean(examStatus) || Boolean(recStatus);
    if (!hasExplicitClearance) continue;

    cleared.push({
      id: p.id,
      tagNumber: p.tagNumber,
      breed: p.breed,
      currentWeight: p.currentWeight,
    });
  }

  return cleared;
}
