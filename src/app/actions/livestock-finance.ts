"use server";

import { prisma, isSupabaseSchemaMissingError } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getFinanceUser } from "@/lib/finance-access";
import {
  FinanceStatus,
  FinanceType,
  NotificationType,
  PigHealthStatus,
  PigSex,
  PigStatus,
  Prisma,
  RevolvingStatus,
  Role,
} from "@prisma/client";
import { randomUUID } from "crypto";
import {
  DEFAULT_MOMO_CODE,
  DEFAULT_PIG_PRICE_RWF,
  MOMO_SETTING_KEY,
  type SerializedBatchSummary,
  type SerializedDistributionAuditRow,
  type SerializedFinanceCooperativeMemberRow,
  type SerializedFinanceCooperativeOverview,
  type SerializedFinancePigStock,
  type SerializedFinanceWorkspaceData,
  type SerializedMemberPaymentRecord,
  type SerializedPigCycleRow,
} from "@/lib/finance-types";

function toIsoString(val: unknown): string {
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "string" || typeof val === "number") {
    const parsed = new Date(val);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}

export async function getFinanceWorkspaceData(): Promise<SerializedFinanceWorkspaceData | null> {
  const user = await getFinanceUser();
  if (!user) return null;

  let schemaMissing = false;
  let schemaWarning: string | null = null;

  const catchSchemaMissing = <T,>(fallback: T, label: string) => (err: unknown): T => {
    if (isSupabaseSchemaMissingError(err)) {
      schemaMissing = true;
      schemaWarning = `Database schema update needed (${label}): run update.sql in your Supabase SQL Editor and reload schema cache.`;
      return fallback;
    }
    throw err;
  };

  const [
    momoSetting,
    pigsRaw,
    paymentsRaw,
    distributionsRaw,
    coopsRaw,
    usersRaw,
    cyclesRaw,
    returnsRaw,
    vetExamsRaw,
    vetRecordsRaw,
    beneficiariesRaw,
    expenseTxsRaw,
  ] = await Promise.all([
    prisma.systemSetting
      .findUnique({ where: { key: MOMO_SETTING_KEY } })
      .catch(catchSchemaMissing(null, "SystemSetting")),
    prisma.pig
      .findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
      })
      .catch(catchSchemaMissing([], "Pig")),
    prisma.cooperativeMemberPayment
      .findMany({ orderBy: { createdAt: "desc" } })
      .catch(catchSchemaMissing([], "cooperative_member_payments")),
    prisma.pigDistribution
      .findMany({
        orderBy: { distributionDate: "desc" },
        include: {
          pig: true,
          beneficiary: true,
          distributedBy: true,
        },
      })
      .catch(catchSchemaMissing([], "PigDistribution")),
    prisma.cooperative
      .findMany({ orderBy: { createdAt: "desc" } })
      .catch(catchSchemaMissing([], "cooperatives")),
    prisma.user
      .findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          cooperativeId: true,
          isActive: true,
          createdAt: true,
        },
      })
      .catch(catchSchemaMissing([], "users")),
    prisma.revolvingCycle
      .findMany({ orderBy: [{ status: "asc" }, { startDate: "desc" }] })
      .catch(catchSchemaMissing([], "RevolvingCycle")),
    prisma.pigReturn
      .findMany()
      .catch(catchSchemaMissing([], "PigReturn")),
    prisma.veterinaryExamination
      .findMany({ orderBy: { examinationDate: "desc" } })
      .catch(catchSchemaMissing([], "VeterinaryExamination")),
    prisma.veterinaryRecord
      .findMany({ orderBy: { date: "desc" } })
      .catch(catchSchemaMissing([], "VeterinaryRecord")),
    prisma.beneficiary
      .findMany({ where: { deletedAt: null } })
      .catch(catchSchemaMissing([], "Beneficiary")),
    prisma.financeTransaction
      .findMany({
        where: { deletedAt: null, type: FinanceType.EXPENSE, status: FinanceStatus.APPROVED },
      })
      .catch(catchSchemaMissing([], "FinanceTransaction")),
  ]);

  const coopMap = new Map<string, string>();
  const coopOwnerNameMap = new Map<string, string | null>();
  for (const c of coopsRaw) {
    coopMap.set(String(c.id), c.name);
    coopOwnerNameMap.set(String(c.id), c.createdByName ?? null);
  }

  const userMap = new Map<string, (typeof usersRaw)[number]>();
  for (const u of usersRaw) userMap.set(String(u.id), u);

  const benMap = new Map<string, (typeof beneficiariesRaw)[number]>();
  for (const b of beneficiariesRaw) benMap.set(String(b.id), b);

  const paymentByMemberId = new Map<string, (typeof paymentsRaw)[number]>();
  for (const p of paymentsRaw) {
    if (!paymentByMemberId.has(String(p.memberId))) {
      paymentByMemberId.set(String(p.memberId), p);
    }
  }

  const latestVetExamByPigId = new Map<string, (typeof vetExamsRaw)[number]>();
  for (const v of vetExamsRaw) {
    if (!latestVetExamByPigId.has(v.pigId)) {
      latestVetExamByPigId.set(v.pigId, v);
    }
  }

  const latestVetRecordByPigId = new Map<string, (typeof vetRecordsRaw)[number]>();
  for (const r of vetRecordsRaw) {
    if (!latestVetRecordByPigId.has(r.pigId)) {
      latestVetRecordByPigId.set(r.pigId, r);
    }
  }

  const benByCoopMemberId = new Map<string, (typeof beneficiariesRaw)[number]>();
  for (const b of beneficiariesRaw) {
    if (b.beneficiaryNumber.startsWith("COOP-")) {
      benByCoopMemberId.set(b.beneficiaryNumber.slice(5), b);
    }
  }

  const returnsByBeneficiaryId = new Map<string, number>();
  const lastReturnDateByBeneficiaryId = new Map<string, string>();
  for (const r of returnsRaw) {
    returnsByBeneficiaryId.set(
      r.beneficiaryId,
      (returnsByBeneficiaryId.get(r.beneficiaryId) ?? 0) + Number(r.quantity || 0)
    );
    const iso = toIsoString(r.returnDate ?? r.createdAt);
    const prev = lastReturnDateByBeneficiaryId.get(r.beneficiaryId);
    if (!prev || iso > prev) {
      lastReturnDateByBeneficiaryId.set(r.beneficiaryId, iso);
    }
  }

  const cycleByBeneficiaryId = new Map<string, (typeof cyclesRaw)[number]>();
  for (const c of cyclesRaw) {
    if (!cycleByBeneficiaryId.has(c.beneficiaryId)) {
      cycleByBeneficiaryId.set(c.beneficiaryId, c);
    }
  }

  const distByBeneficiaryId = new Map<string, (typeof distributionsRaw)[number]>();
  for (const d of distributionsRaw) {
    if (!distByBeneficiaryId.has(d.beneficiaryId)) {
      distByBeneficiaryId.set(d.beneficiaryId, d);
    }
  }

  const pigByBeneficiaryId = new Map<string, (typeof pigsRaw)[number]>();
  const pigByOwnerMemberId = new Map<string, (typeof pigsRaw)[number]>();
  for (const p of pigsRaw) {
    if (p.currentBeneficiaryId && !pigByBeneficiaryId.has(p.currentBeneficiaryId)) {
      pigByBeneficiaryId.set(p.currentBeneficiaryId, p);
    }
    if (p.ownerMemberId && !pigByOwnerMemberId.has(String(p.ownerMemberId))) {
      pigByOwnerMemberId.set(String(p.ownerMemberId), p);
    }
  }

  let totalLivestockInvestmentNum = 0;

  const stockedPigs: SerializedFinancePigStock[] = pigsRaw.map((p) => {
    const priceNum = p.purchasePrice !== null && p.purchasePrice !== undefined ? Number(p.purchasePrice.toString()) : 0;
    if (!Number.isNaN(priceNum) && priceNum > 0) {
      totalLivestockInvestmentNum += priceNum;
    }

    const latestVetExam = latestVetExamByPigId.get(p.id);
    const latestVetRecord = latestVetRecordByPigId.get(p.id);
    const ben = p.currentBeneficiaryId ? benMap.get(p.currentBeneficiaryId) : undefined;

    const recordParts = latestVetRecord
      ? [
          latestVetRecord.diagnosis ? `Test: ${latestVetRecord.diagnosis}` : null,
          latestVetRecord.medication
            ? `Meds: ${latestVetRecord.medication}`
            : latestVetRecord.treatment
              ? `Tx: ${latestVetRecord.treatment}`
              : null,
        ].filter(Boolean)
      : [];

    const examParts = latestVetExam
      ? [
          latestVetExam.diagnosis ? `Test: ${latestVetExam.diagnosis}` : null,
          latestVetExam.treatment ? `Tx: ${latestVetExam.treatment}` : null,
          latestVetExam.verificationStatus ? `Status: ${latestVetExam.verificationStatus}` : null,
        ].filter(Boolean)
      : [];

    const combinedVetParts = recordParts.length > 0 ? recordParts : examParts;
    const latestVetExamDate = latestVetRecord?.date
      ? toIsoString(latestVetRecord.date)
      : latestVetExam?.examinationDate
        ? toIsoString(latestVetExam.examinationDate)
        : null;
    const hasVetInspection = Boolean(
      latestVetRecord || latestVetExam || p.status === PigStatus.ACTIVE
    );

    return {
      id: p.id,
      tagNumber: p.tagNumber,
      batchCode: p.batchCode ?? null,
      pigType: p.pigType ?? null,
      daysAge: p.daysAge ?? p.estimatedAge ?? null,
      breed: p.breed ?? null,
      sex: p.sex ? String(p.sex) : p.sexString ?? null,
      currentWeight: p.currentWeight ?? null,
      purchasePrice:
        p.purchasePrice !== null && p.purchasePrice !== undefined
          ? p.purchasePrice.toString()
          : null,
      source: p.source ?? null,
      notes: p.notes ?? null,
      healthStatus: p.healthStatus,
      status: p.status,
      stockedByFinanceId: p.stockedByFinanceId ?? null,
      cooperativeId: p.cooperativeId ?? null,
      cooperativeName: p.cooperativeId ? coopMap.get(p.cooperativeId) ?? null : null,
      ownerMemberName: p.ownerMemberName ?? null,
      beneficiaryId: p.currentBeneficiaryId ?? null,
      beneficiaryName: ben?.fullName ?? p.ownerMemberName ?? null,
      latestVetExamSummary: combinedVetParts.length > 0 ? combinedVetParts.join(" · ") : null,
      latestVetExamDate,
      hasVetInspection,
      dateReceived: p.dateReceived ? toIsoString(p.dateReceived) : null,
      createdAt: toIsoString(p.createdAt),
    };
  });

  // Group into collection batches (exclude unassigned or explicitly group by batchCode)
  const batchGroupMap = new Map<
    string,
    {
      pigs: SerializedFinancePigStock[];
      totalInvestment: number;
      source: string | null;
      earliestCreatedAt: string;
    }
  >();

  for (const pig of stockedPigs) {
    if (!pig.batchCode) continue;
    const existing = batchGroupMap.get(pig.batchCode);
    const price = pig.purchasePrice ? Number(pig.purchasePrice) : 0;
    if (!existing) {
      batchGroupMap.set(pig.batchCode, {
        pigs: [pig],
        totalInvestment: Number.isNaN(price) ? 0 : price,
        source: pig.source,
        earliestCreatedAt: pig.createdAt,
      });
    } else {
      existing.pigs.push(pig);
      existing.totalInvestment += Number.isNaN(price) ? 0 : price;
      if (!existing.source && pig.source) existing.source = pig.source;
      if (pig.createdAt > existing.earliestCreatedAt) existing.earliestCreatedAt = pig.createdAt;
    }
  }

  const batches: SerializedBatchSummary[] = Array.from(batchGroupMap.entries())
    .map(([batchCode, grp]) => {
      const pigCount = grp.pigs.length;
      const availableCount = grp.pigs.filter(
        (p) => p.status === PigStatus.REGISTERED || p.status === PigStatus.ACTIVE
      ).length;
      const distributedCount = grp.pigs.filter(
        (p) => p.status === PigStatus.DISTRIBUTED || p.status === PigStatus.REDISTRIBUTED
      ).length;
      const healthyCount = grp.pigs.filter((p) => p.healthStatus === PigHealthStatus.HEALTHY).length;
      const sickOrTreatmentCount = grp.pigs.filter(
        (p) =>
          p.healthStatus === PigHealthStatus.SICK ||
          p.healthStatus === PigHealthStatus.UNDER_TREATMENT ||
          p.healthStatus === PigHealthStatus.CRITICAL
      ).length;

      return {
        batchCode,
        pigCount,
        totalInvestment: grp.totalInvestment.toFixed(2),
        unitPriceAvg: pigCount > 0 ? (grp.totalInvestment / pigCount).toFixed(2) : "0.00",
        availableCount,
        distributedCount,
        healthyCount,
        sickOrTreatmentCount,
        source: grp.source,
        createdAt: grp.earliestCreatedAt,
      };
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  // Total Pig Purchase Expenses from FinanceTransaction
  let totalPigPurchaseExpensesNum = 0;
  for (const tx of expenseTxsRaw) {
    const ref = String(tx.reference || "").toLowerCase();
    if (ref === "pig purchase" || ref === "pig_purchase") {
      totalPigPurchaseExpensesNum += Number(tx.amount?.toString() || 0);
    }
  }

  const memberPayments: SerializedMemberPaymentRecord[] = paymentsRaw.map((pm) => {
    const mem = userMap.get(String(pm.memberId));
    const verifier = pm.verifiedById ? userMap.get(String(pm.verifiedById)) : undefined;
    return {
      id: pm.id,
      memberId: String(pm.memberId),
      memberName: mem?.name ?? "Unknown Member",
      memberEmail: mem?.email ?? "",
      cooperativeId: String(pm.cooperativeId),
      cooperativeName: coopMap.get(String(pm.cooperativeId)) ?? "Cooperative",
      cellManagerName: coopOwnerNameMap.get(String(pm.cooperativeId)) ?? null,
      pigValueFee: pm.pigValueFee.toString(),
      taxFee: pm.taxFee.toString(),
      totalAmount: pm.totalAmount.toString(),
      momoReference: pm.momoReference,
      status: pm.status,
      verifiedByName: verifier?.name ?? null,
      createdAt: toIsoString(pm.createdAt),
    };
  });

  const distributedPigIds = new Set<string>();
  const auditRows: SerializedDistributionAuditRow[] = distributionsRaw.map((d) => {
    if (d.pigId) distributedPigIds.add(d.pigId);
    const benRecord = d.beneficiary ?? benMap.get(d.beneficiaryId);
    const derivedMemberId =
      d.pig?.ownerMemberId ??
      (benRecord?.beneficiaryNumber?.startsWith("COOP-")
        ? benRecord.beneficiaryNumber.slice(5)
        : d.beneficiaryId);
    const memberUser = userMap.get(derivedMemberId) ?? userMap.get(d.beneficiaryId);
    const coopId = d.pig?.cooperativeId ?? memberUser?.cooperativeId ?? null;
    const payment =
      (d.pig?.ownerMemberId ? paymentByMemberId.get(d.pig.ownerMemberId) : undefined) ??
      paymentByMemberId.get(derivedMemberId) ??
      paymentByMemberId.get(d.beneficiaryId);

    return {
      id: d.id,
      pigId: d.pigId,
      pigTag: d.pig?.tagNumber ?? "Unlinked",
      batchCode: d.pig?.batchCode ?? null,
      pigType: d.pig?.pigType ?? d.pig?.breed ?? null,
      pigValueRwf:
        d.pig?.purchasePrice !== null && d.pig?.purchasePrice !== undefined
          ? d.pig.purchasePrice.toString()
          : null,
      cellManagerName: d.distributedBy?.name ?? null,
      cooperativeName: coopId ? coopMap.get(coopId) ?? null : null,
      memberName: benRecord?.fullName ?? memberUser?.name ?? d.pig?.ownerMemberName ?? "Unknown Recipient",
      memberPhone: benRecord?.phone ?? memberUser?.phone ?? null,
      memberRoleOrType: memberUser || d.pig?.ownerMemberId ? "Cooperative Member" : "Beneficiary",
      paymentVerified: Boolean(payment && payment.status === "VERIFIED"),
      paymentAmount: payment ? payment.totalAmount.toString() : null,
      momoReference: payment?.momoReference ?? null,
      distributionDate: toIsoString(d.distributionDate),
      notes: d.notes ?? null,
    };
  });

  // Also include pigs assigned directly to a beneficiary or cooperative member without a PigDistribution row
  for (const p of pigsRaw) {
    if (distributedPigIds.has(p.id)) continue;
    if (!p.currentBeneficiaryId && !p.ownerMemberId && !p.ownerMemberName) continue;

    const ben = p.currentBeneficiaryId ? benMap.get(p.currentBeneficiaryId) : undefined;
    const memberUser = p.ownerMemberId ? userMap.get(p.ownerMemberId) : undefined;
    const payment = p.ownerMemberId
      ? paymentByMemberId.get(p.ownerMemberId)
      : p.currentBeneficiaryId
      ? paymentByMemberId.get(p.currentBeneficiaryId)
      : undefined;
    const coopId = p.cooperativeId ?? memberUser?.cooperativeId ?? null;

    auditRows.push({
      id: `pig-assigned-${p.id}`,
      pigId: p.id,
      pigTag: p.tagNumber,
      batchCode: p.batchCode ?? null,
      pigType: p.pigType ?? p.breed ?? null,
      pigValueRwf:
        p.purchasePrice !== null && p.purchasePrice !== undefined
          ? p.purchasePrice.toString()
          : null,
      cellManagerName: null,
      cooperativeName: coopId ? coopMap.get(coopId) ?? null : null,
      memberName: ben?.fullName ?? memberUser?.name ?? p.ownerMemberName ?? "Assigned Recipient",
      memberPhone: ben?.phone ?? memberUser?.phone ?? null,
      memberRoleOrType: p.ownerMemberId || p.ownerMemberName ? "Cooperative Member" : "Beneficiary",
      paymentVerified: Boolean(payment && payment.status === "VERIFIED"),
      paymentAmount: payment ? payment.totalAmount.toString() : null,
      momoReference: payment?.momoReference ?? null,
      distributionDate: toIsoString(p.dateReceived ?? p.createdAt),
      notes: p.notes ?? null,
    });
  }

  const nowMs = Date.now();
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;

  const pigCycles: SerializedPigCycleRow[] = cyclesRaw.map((c) => {
    const ben = benMap.get(c.beneficiaryId);
    const memberUser = userMap.get(c.beneficiaryId);
    const dist = distByBeneficiaryId.get(c.beneficiaryId);
    const linkedPig = dist?.pig ?? pigByBeneficiaryId.get(c.beneficiaryId) ?? null;
    const coopId = linkedPig?.cooperativeId ?? memberUser?.cooperativeId ?? null;

    const startDateIso = toIsoString(c.startDate);
    const effectiveDue = c.dueDate
      ? new Date(c.dueDate)
      : new Date(new Date(startDateIso).getTime() + oneYearMs);
    const isPastDue =
      c.status !== RevolvingStatus.COMPLETED &&
      c.status !== RevolvingStatus.CANCELLED &&
      effectiveDue.getTime() < nowMs;

    return {
      id: c.id,
      beneficiaryId: c.beneficiaryId,
      beneficiaryName: ben?.fullName ?? memberUser?.name ?? "Unknown Recipient",
      beneficiaryPhone: ben?.phone ?? memberUser?.phone ?? null,
      cooperativeName: coopId ? coopMap.get(coopId) ?? null : null,
      pigId: linkedPig?.id ?? null,
      pigTag: linkedPig?.tagNumber ?? null,
      batchCode: linkedPig?.batchCode ?? null,
      pigValueRwf:
        linkedPig?.purchasePrice !== null && linkedPig?.purchasePrice !== undefined
          ? linkedPig.purchasePrice.toString()
          : null,
      pigStatus: linkedPig?.status ? String(linkedPig.status) : null,
      pigHealthStatus: linkedPig?.healthStatus ? String(linkedPig.healthStatus) : null,
      cycleNumber: c.cycleNumber,
      startDate: startDateIso,
      dueDate: c.dueDate ? toIsoString(c.dueDate) : effectiveDue.toISOString(),
      expectedReturn: c.expectedReturn,
      returnedCount: returnsByBeneficiaryId.get(c.beneficiaryId) ?? 0,
      status: String(c.status),
      isPastDue,
      notes: c.notes ?? null,
    };
  });

  const cooperativesOverview: SerializedFinanceCooperativeOverview[] = coopsRaw.map((coop) => {
    const coopId = String(coop.id);
    const coopMembersRaw = usersRaw.filter((u) => {
      const uRole = String(u.role || "").toUpperCase();
      const isCoopAccount =
        uRole === Role.COOPERATIVE_LEADER || uRole === Role.COOPERATIVE_MEMBER;
      if (!isCoopAccount) return false;
      return (
        String(u.cooperativeId ?? "") === coopId ||
        (coop.leaderUserId ? String(u.id) === String(coop.leaderUserId) : false)
      );
    });

    coopMembersRaw.sort((a, b) => {
      const aLeader = String(a.role).toUpperCase() === Role.COOPERATIVE_LEADER;
      const bLeader = String(b.role).toUpperCase() === Role.COOPERATIVE_LEADER;
      if (aLeader && !bLeader) return -1;
      if (!aLeader && bLeader) return 1;
      return a.name.localeCompare(b.name);
    });

    let paidCount = 0;
    let pendingPaymentCount = 0;
    let unpaidCount = 0;
    let receivedPigCount = 0;
    let returnedMembersCount = 0;
    let totalReturnedPiglets = 0;

    const members: SerializedFinanceCooperativeMemberRow[] = coopMembersRaw.map((member) => {
      const memberId = String(member.id);
      const payment = paymentByMemberId.get(memberId);
      const rawPayStatus = payment ? String(payment.status || "").toUpperCase() : "UNPAID";
      const paymentStatus: SerializedFinanceCooperativeMemberRow["paymentStatus"] =
        rawPayStatus === "VERIFIED"
          ? "VERIFIED"
          : rawPayStatus === "PENDING"
            ? "PENDING"
            : rawPayStatus === "REJECTED"
              ? "REJECTED"
              : "UNPAID";

      if (paymentStatus === "VERIFIED") paidCount += 1;
      else if (paymentStatus === "PENDING") pendingPaymentCount += 1;
      else unpaidCount += 1;

      const linkedBen = benByCoopMemberId.get(memberId);
      const benId = linkedBen ? String(linkedBen.id) : null;
      const dist = benId ? distByBeneficiaryId.get(benId) : undefined;
      const directPig =
        pigByOwnerMemberId.get(memberId) ??
        (benId ? pigByBeneficiaryId.get(benId) : undefined) ??
        dist?.pig ??
        null;

      const receivedPig = Boolean(dist || directPig);
      if (receivedPig) receivedPigCount += 1;

      const returnedCount = benId ? returnsByBeneficiaryId.get(benId) ?? 0 : 0;
      const hasReturned = returnedCount > 0;
      if (hasReturned) {
        returnedMembersCount += 1;
        totalReturnedPiglets += returnedCount;
      }

      const cycle = benId ? cycleByBeneficiaryId.get(benId) : undefined;
      const expectedReturn = cycle?.expectedReturn ?? 2;
      const lastReturnDate = benId ? lastReturnDateByBeneficiaryId.get(benId) ?? null : null;

      return {
        memberId,
        memberName: member.name,
        memberEmail: member.email,
        memberPhone: member.phone ?? null,
        memberRole: String(member.role),
        cooperativeId: coopId,
        cooperativeName: coop.name,
        cellManagerName: coop.createdByName ?? null,
        paymentStatus,
        paymentAmount: payment ? payment.totalAmount.toString() : null,
        momoReference: payment?.momoReference ?? null,
        paymentDate: payment ? toIsoString(payment.createdAt) : null,
        receivedPig,
        pigTag: directPig?.tagNumber ?? null,
        pigStatus: directPig?.status ? String(directPig.status) : null,
        pigHealthStatus: directPig?.healthStatus ? String(directPig.healthStatus) : null,
        pigReceivedDate: dist
          ? toIsoString(dist.distributionDate)
          : directPig
            ? toIsoString(directPig.dateReceived ?? directPig.createdAt)
            : null,
        hasReturned,
        returnedCount,
        expectedReturn,
        revolvingStatus: cycle ? String(cycle.status) : null,
        lastReturnDate,
      };
    });

    return {
      id: coopId,
      name: coop.name,
      code: coop.code ?? null,
      cellName: coop.cellName,
      cellManagerName: coop.createdByName ?? null,
      leaderName: coop.leaderName ?? null,
      maxMembers: coop.maxMembers || 15,
      memberCount: members.length,
      paidCount,
      pendingPaymentCount,
      unpaidCount,
      receivedPigCount,
      returnedMembersCount,
      totalReturnedPiglets,
      members,
    };
  });

  return {
    schemaMissing,
    schemaWarning,
    momoMerchantCode: momoSetting?.value ?? DEFAULT_MOMO_CODE,
    totalLivestockInvestment: totalLivestockInvestmentNum.toFixed(2),
    totalPigPurchaseExpenses: totalPigPurchaseExpensesNum.toFixed(2),
    totalBatchesCount: batches.length,
    totalPigsCount: stockedPigs.length,
    stockedPigs,
    batches,
    memberPayments,
    auditRows,
    pigCycles,
    cooperativesOverview,
  };
}

export async function updateFinanceMoMoMerchantCode(formData: FormData): Promise<{
  success: boolean;
  error?: string;
}> {
  const user = await getFinanceUser();
  if (!user) {
    return { success: false, error: "Unauthorized: Only Finance Officers can update MoMo Merchant Code." };
  }

  const momoCode = String(formData.get("momoMerchantCode") || "").trim();
  if (!momoCode) {
    return { success: false, error: "MoMo Merchant Code is required." };
  }

  try {
    await prisma.systemSetting.upsert({
      where: { key: MOMO_SETTING_KEY },
      create: {
        key: MOMO_SETTING_KEY,
        value: momoCode,
        description: "Finance Officer MoMo Merchant Code for member qualification payments (16k RWF + 2.8k tax).",
        updatedById: user.id,
      },
      update: {
        value: momoCode,
        updatedById: user.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        role: user.role,
        action: "UPDATED",
        entity: "SYSTEM_SETTING",
        entityId: MOMO_SETTING_KEY,
        newValue: { momoMerchantCode: momoCode },
      },
    });

    revalidatePath("/dashboard/finance");
    revalidatePath("/dashboard/finance/pigs");
    revalidatePath("/dashboard/field");
    revalidatePath("/dashboard/field/distributions/new");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update MoMo code." };
  }
}

export async function financeStockInPigBatch(formData: FormData): Promise<{
  success: boolean;
  error?: string;
  pigId?: string;
  tagNumber?: string;
}> {
  const user = await getFinanceUser();
  if (!user) {
    return { success: false, error: "Unauthorized: Only Finance Officers can stock in pigs." };
  }

  const customTag = String(formData.get("tagNumber") || "").trim().toUpperCase();
  const healthRaw = String(formData.get("healthStatus") || "HEALTHY").trim().toUpperCase();
  const sexRaw = String(formData.get("sex") || "FEMALE").trim().toUpperCase();
  const priceRaw = String(formData.get("purchasePrice") || String(DEFAULT_PIG_PRICE_RWF)).trim();

  const unitPrice = Number(priceRaw);
  const purchasePrice = !Number.isNaN(unitPrice) && unitPrice >= 0 ? unitPrice : DEFAULT_PIG_PRICE_RWF;

  const sex: PigSex | null =
    sexRaw === PigSex.MALE ? PigSex.MALE : sexRaw === PigSex.FEMALE ? PigSex.FEMALE : null;

  const healthStatus = Object.values(PigHealthStatus).includes(healthRaw as PigHealthStatus)
    ? (healthRaw as PigHealthStatus)
    : PigHealthStatus.HEALTHY;

  try {
    const year = new Date().getFullYear();
    const prefix = `PF-RW-${year}-`;
    const existingPigs = await prisma.pig.findMany({
      select: { tagNumber: true },
    });
    const existingTags = new Set(existingPigs.map((p) => p.tagNumber.toUpperCase()));

    let tagNumber = customTag;
    if (!tagNumber) {
      let nextSeq = 1;
      for (const p of existingPigs) {
        if (p.tagNumber.startsWith(prefix) || p.tagNumber.startsWith(`PIG-${year}-`)) {
          const lastPart = p.tagNumber.split("-").pop() ?? "";
          const parsed = parseInt(lastPart, 10);
          if (!Number.isNaN(parsed) && parsed >= nextSeq) {
            nextSeq = parsed + 1;
          }
        }
      }
      tagNumber = `${prefix}${String(nextSeq).padStart(5, "0")}`;
      while (existingTags.has(tagNumber)) {
        nextSeq += 1;
        tagNumber = `${prefix}${String(nextSeq).padStart(5, "0")}`;
      }
    } else if (existingTags.has(tagNumber)) {
      return { success: false, error: `Pig tag "${tagNumber}" already exists in inventory.` };
    }

    const now = new Date();
    const pig = await prisma.pig.create({
      data: {
        tagNumber,
        sex,
        purchasePrice: new Prisma.Decimal(purchasePrice.toFixed(2)),
        healthStatus,
        status: PigStatus.REGISTERED,
        stockedByFinanceId: user.id,
        source: "Finance Direct Stock-In",
        dateReceived: now,
      },
      select: { id: true, tagNumber: true },
    });

    if (purchasePrice > 0) {
      const txCode = `FIN-${year}-${randomUUID().slice(0, 8).toUpperCase()}`;
      await prisma.financeTransaction.create({
        data: {
          transactionId: txCode,
          type: FinanceType.EXPENSE,
          reference: "Pig Purchase",
          amount: new Prisma.Decimal(purchasePrice.toFixed(2)),
          pigId: pig.id,
          paymentMethod: "Finance Stock-In",
          description: `Individual Pig Purchase: ${pig.tagNumber} @ ${purchasePrice.toLocaleString("en-US")} RWF`,
          transactionDate: now,
          recordedById: user.id,
          status: FinanceStatus.APPROVED,
          approvedById: user.id,
          approvedAt: now,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        role: user.role,
        action: "CREATED",
        entity: "PIG",
        entityId: pig.id,
        newValue: {
          tagNumber: pig.tagNumber,
          purchasePrice,
          healthStatus,
          sex,
          stockedByFinance: user.name,
        },
      },
    });

    revalidatePath("/dashboard/finance");
    revalidatePath("/dashboard/finance/pigs");
    revalidatePath("/dashboard/vet");
    revalidatePath("/dashboard/field");
    revalidatePath("/dashboard/admin/pigs");

    return {
      success: true,
      pigId: pig.id,
      tagNumber: pig.tagNumber,
    };
  } catch (err) {
    if (isSupabaseSchemaMissingError(err)) {
      return {
        success: false,
        error: "Database schema update required: please run update.sql in your Supabase SQL Editor.",
      };
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to stock in pig.",
    };
  }
}

export async function financeStockInPig(formData: FormData): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!formData.get("purchasePrice")) {
    formData.set("purchasePrice", String(DEFAULT_PIG_PRICE_RWF));
  }
  return financeStockInPigBatch(formData);
}

export async function financeUpdatePig(formData: FormData): Promise<{
  success: boolean;
  error?: string;
}> {
  const user = await getFinanceUser();
  if (!user) {
    return { success: false, error: "Unauthorized: Only Finance Officers can update pig records." };
  }

  const pigId = String(formData.get("id") || "").trim();
  const tagNumber = String(formData.get("tagNumber") || "").trim().toUpperCase();
  const sexRaw = String(formData.get("sex") || "").trim().toUpperCase();
  const priceRaw = String(formData.get("purchasePrice") || "").trim();
  const healthRaw = String(formData.get("healthStatus") || "").trim().toUpperCase();
  const statusRaw = String(formData.get("status") || "").trim().toUpperCase();

  if (!pigId || !tagNumber) {
    return { success: false, error: "Pig ID and Tag Number are required." };
  }

  let purchasePrice: Prisma.Decimal | null = null;
  if (priceRaw !== "") {
    const parsed = Number(priceRaw);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 10000000) {
      return { success: false, error: "Purchase price must be a valid RWF amount." };
    }
    purchasePrice = new Prisma.Decimal(parsed.toFixed(2));
  }

  try {
    const existing = await prisma.pig.findFirst({
      where: { id: pigId, deletedAt: null },
    });
    if (!existing) {
      return { success: false, error: "Pig record not found or already deleted." };
    }

    if (tagNumber !== existing.tagNumber.toUpperCase()) {
      const dup = await prisma.pig.findFirst({ where: { tagNumber } });
      if (dup && dup.id !== pigId) {
        return { success: false, error: `Tag number "${tagNumber}" is already assigned to another pig.` };
      }
    }

    const healthStatus = Object.values(PigHealthStatus).includes(healthRaw as PigHealthStatus)
      ? (healthRaw as PigHealthStatus)
      : existing.healthStatus;

    const status = Object.values(PigStatus).includes(statusRaw as PigStatus)
      ? (statusRaw as PigStatus)
      : existing.status;

    const sex: PigSex | null =
      sexRaw === PigSex.MALE ? PigSex.MALE : sexRaw === PigSex.FEMALE ? PigSex.FEMALE : null;

    await prisma.pig.update({
      where: { id: pigId },
      data: {
        tagNumber,
        sex,
        purchasePrice,
        healthStatus,
        status,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        role: user.role,
        action: "UPDATED",
        entity: "PIG",
        entityId: pigId,
        previousValue: {
          tagNumber: existing.tagNumber,
          purchasePrice: existing.purchasePrice?.toString() ?? null,
          status: existing.status,
          healthStatus: existing.healthStatus,
        },
        newValue: {
          tagNumber,
          purchasePrice: purchasePrice?.toString() ?? null,
          status,
          healthStatus,
          sex,
        },
      },
    });

    revalidatePath("/dashboard/finance");
    revalidatePath("/dashboard/finance/pigs");
    revalidatePath("/dashboard/vet");
    revalidatePath("/dashboard/field");
    revalidatePath("/dashboard/admin/pigs");
    return { success: true };
  } catch (err) {
    if (isSupabaseSchemaMissingError(err)) {
      return {
        success: false,
        error: "Database schema update required: please run update.sql in Supabase SQL Editor.",
      };
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update pig record.",
    };
  }
}



export async function financeDeletePig(pigId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const user = await getFinanceUser();
  if (!user) {
    return { success: false, error: "Unauthorized: Only Finance Officers can remove pig records." };
  }

  if (!pigId) {
    return { success: false, error: "Pig ID is required." };
  }

  try {
    const existing = await prisma.pig.findFirst({
      where: { id: pigId, deletedAt: null },
    });
    if (!existing) {
      return { success: false, error: "Pig record not found." };
    }

    if (
      existing.status === PigStatus.DISTRIBUTED ||
      existing.status === PigStatus.REDISTRIBUTED ||
      existing.status === PigStatus.SOLD
    ) {
      return {
        success: false,
        error:
          "Cannot delete a pig that has already been distributed or sold. Edit its status instead.",
      };
    }

    await prisma.pig.update({
      where: { id: pigId },
      data: {
        deletedAt: new Date(),
        status: PigStatus.INACTIVE,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        role: user.role,
        action: "SOFT_DELETED",
        entity: "PIG",
        entityId: pigId,
        previousValue: {
          tagNumber: existing.tagNumber,
          batchCode: existing.batchCode ?? null,
          status: existing.status,
        },
      },
    });

    revalidatePath("/dashboard/finance");
    revalidatePath("/dashboard/finance/pigs");
    revalidatePath("/dashboard/vet");
    revalidatePath("/dashboard/field");
    revalidatePath("/dashboard/admin/pigs");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete pig record.",
    };
  }
}

export async function verifyMemberQualificationPayment(formData: FormData): Promise<{
  success: boolean;
  error?: string;
}> {
  const user = await getFinanceUser();
  if (!user) {
    return { success: false, error: "Unauthorized." };
  }

  const paymentId = String(formData.get("paymentId") || "").trim();
  const memberId = String(formData.get("memberId") || "").trim();
  const cooperativeId = String(formData.get("cooperativeId") || "").trim();
  const momoReference = String(formData.get("momoReference") || "").trim();

  if (!paymentId && (!memberId || !cooperativeId || !momoReference)) {
    return { success: false, error: "Payment record or Member, Cooperative, and MoMo Reference code are required." };
  }

  try {
    const existing = paymentId
      ? await prisma.cooperativeMemberPayment.findUnique({ where: { id: paymentId } })
      : await prisma.cooperativeMemberPayment.findFirst({ where: { memberId } });

    const finalMemberId = existing?.memberId ?? memberId;
    const finalCoopId = existing?.cooperativeId ?? cooperativeId;
    const finalMomoRef = momoReference || existing?.momoReference || "";

    if (!finalMemberId || !finalCoopId || !finalMomoRef) {
      return { success: false, error: "Member, Cooperative, and MoMo Reference code are required." };
    }

    const wasAlreadyVerified = existing?.status === "VERIFIED";
    const now = new Date();
    let savedPaymentId = existing?.id ?? "";

    if (existing) {
      await prisma.cooperativeMemberPayment.update({
        where: { id: existing.id },
        data: {
          momoReference: finalMomoRef,
          status: "VERIFIED",
          verifiedById: user.id,
        },
      });
    } else {
      const created = await prisma.cooperativeMemberPayment.create({
        data: {
          memberId: finalMemberId,
          cooperativeId: finalCoopId,
          pigValueFee: new Prisma.Decimal("16000.00"),
          taxFee: new Prisma.Decimal("2800.00"),
          totalAmount: new Prisma.Decimal("18800.00"),
          momoReference: finalMomoRef,
          status: "VERIFIED",
          verifiedById: user.id,
        },
      });
      savedPaymentId = created.id;
    }

    const [memberUser, coop] = await Promise.all([
      prisma.user.findUnique({ where: { id: finalMemberId } }),
      prisma.cooperative.findUnique({ where: { id: finalCoopId } }),
    ]);

    if (!wasAlreadyVerified) {
      const year = now.getFullYear();
      const txCode = `FIN-FEE-${year}-${randomUUID().slice(0, 8).toUpperCase()}`;
      await prisma.financeTransaction.create({
        data: {
          transactionId: txCode,
          type: FinanceType.INCOME,
          reference: "Member Qualification Fee & Tax",
          amount: new Prisma.Decimal("18800.00"),
          paymentMethod: `MoMo (${finalMomoRef})`,
          description: `Verified cooperative member qualification payment: 16,000 RWF pig value + 2,800 RWF tax = 18,800 RWF from ${memberUser?.name ?? finalMemberId} (${coop?.name ?? finalCoopId}).`,
          transactionDate: now,
          recordedById: user.id,
          status: FinanceStatus.APPROVED,
          approvedById: user.id,
          approvedAt: now,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        role: user.role,
        action: "VERIFIED",
        entity: "COOPERATIVE_MEMBER_PAYMENT",
        entityId: savedPaymentId || finalMemberId,
        newValue: {
          memberId: finalMemberId,
          memberName: memberUser?.name ?? null,
          cooperativeId: finalCoopId,
          cooperativeName: coop?.name ?? null,
          momoReference: finalMomoRef,
          amount: "18800 RWF",
          verifiedBy: user.name,
        },
      },
    });

    // Notify the Cell Manager who created the cooperative AND the member
    try {
      if (coop?.createdById) {
        await prisma.notification.create({
          data: {
            userId: String(coop.createdById),
            type: NotificationType.SUCCESS,
            title: `Payment Approved: ${memberUser?.name ?? "Member"}`,
            message: `Finance Officer ${user.name} verified 18,800 RWF (MoMo: ${finalMomoRef}) for ${memberUser?.name ?? "member"} in ${coop.name}. You can now distribute a pig to this member.`,
            relatedEntity: "COOPERATIVE_MEMBER_PAYMENT",
            relatedEntityId: savedPaymentId || finalMemberId,
          },
        });
      }
      if (memberUser && String(memberUser.id) !== String(coop?.createdById)) {
        await prisma.notification.create({
          data: {
            userId: String(memberUser.id),
            type: NotificationType.SUCCESS,
            title: "Qualification Payment Verified",
            message: `Your 18,800 RWF (16,000 + 2,800 RWF tax) MoMo payment (${finalMomoRef}) was verified by Finance Officer ${user.name}. Your Cell Manager can now hand over your pig.`,
            relatedEntity: "COOPERATIVE_MEMBER_PAYMENT",
            relatedEntityId: savedPaymentId || finalMemberId,
          },
        });
      }
    } catch {
      // Non-blocking notification
    }

    revalidatePath("/dashboard/finance");
    revalidatePath("/dashboard/finance/pigs");
    revalidatePath("/dashboard/field");
    revalidatePath("/dashboard/field/distributions");
    revalidatePath("/dashboard/field/distributions/new");
    revalidatePath("/dashboard/history");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to verify payment." };
  }
}

export async function rejectMemberQualificationPayment(formData: FormData): Promise<{
  success: boolean;
  error?: string;
}> {
  const user = await getFinanceUser();
  if (!user) {
    return { success: false, error: "Unauthorized." };
  }

  const paymentId = String(formData.get("paymentId") || "").trim();
  const rejectionReason =
    String(formData.get("rejectionReason") || "").trim() ||
    "MoMo reference could not be matched to a completed 18,800 RWF receipt.";

  if (!paymentId) {
    return { success: false, error: "Payment ID is required." };
  }

  try {
    const existing = await prisma.cooperativeMemberPayment.findUnique({
      where: { id: paymentId },
    });
    if (!existing) {
      return { success: false, error: "Payment submission was not found." };
    }

    await prisma.cooperativeMemberPayment.update({
      where: { id: existing.id },
      data: {
        status: "REJECTED",
        verifiedById: user.id,
      },
    });

    const [memberUser, coop] = await Promise.all([
      prisma.user.findUnique({ where: { id: existing.memberId } }),
      prisma.cooperative.findUnique({ where: { id: existing.cooperativeId } }),
    ]);

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        role: user.role,
        action: "REJECTED",
        entity: "COOPERATIVE_MEMBER_PAYMENT",
        entityId: existing.id,
        previousValue: { status: existing.status, momoReference: existing.momoReference },
        newValue: {
          status: "REJECTED",
          memberId: existing.memberId,
          memberName: memberUser?.name ?? null,
          cooperativeId: existing.cooperativeId,
          cooperativeName: coop?.name ?? null,
          rejectionReason,
          rejectedBy: user.name,
        },
      },
    });

    try {
      if (coop?.createdById) {
        await prisma.notification.create({
          data: {
            userId: String(coop.createdById),
            type: NotificationType.ALERT,
            title: `Payment Rejected: ${memberUser?.name ?? "Member"}`,
            message: `Finance Officer ${user.name} rejected the payment submission (MoMo: ${existing.momoReference}) for ${memberUser?.name ?? "member"} in ${coop.name}. Reason: ${rejectionReason}`,
            relatedEntity: "COOPERATIVE_MEMBER_PAYMENT",
            relatedEntityId: existing.id,
          },
        });
      }
    } catch {
      // Non-blocking notification
    }

    revalidatePath("/dashboard/finance");
    revalidatePath("/dashboard/finance/pigs");
    revalidatePath("/dashboard/field");
    revalidatePath("/dashboard/field/distributions");
    revalidatePath("/dashboard/field/distributions/new");
    revalidatePath("/dashboard/history");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to reject payment submission.",
    };
  }
}
