"use server";

import { prisma, isSupabaseSchemaMissingError } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getFinanceUser } from "@/lib/finance-access";
import {
  FinanceStatus,
  FinanceType,
  PigHealthStatus,
  PigSex,
  PigStatus,
  Prisma,
  RevolvingStatus,
} from "@prisma/client";
import { randomUUID } from "crypto";
import {
  DEFAULT_MOMO_CODE,
  DEFAULT_PIG_PRICE_RWF,
  MOMO_SETTING_KEY,
  type SerializedBatchSummary,
  type SerializedDistributionAuditRow,
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
      .findMany()
      .catch(catchSchemaMissing([], "cooperatives")),
    prisma.user
      .findMany({ where: { deletedAt: null } })
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
  for (const c of coopsRaw) coopMap.set(String(c.id), c.name);

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

  const latestVetByPigId = new Map<string, (typeof vetExamsRaw)[number]>();
  for (const v of vetExamsRaw) {
    if (!latestVetByPigId.has(v.pigId)) {
      latestVetByPigId.set(v.pigId, v);
    }
  }

  const returnsByBeneficiaryId = new Map<string, number>();
  for (const r of returnsRaw) {
    returnsByBeneficiaryId.set(
      r.beneficiaryId,
      (returnsByBeneficiaryId.get(r.beneficiaryId) ?? 0) + Number(r.quantity || 0)
    );
  }

  const distByBeneficiaryId = new Map<string, (typeof distributionsRaw)[number]>();
  for (const d of distributionsRaw) {
    if (!distByBeneficiaryId.has(d.beneficiaryId)) {
      distByBeneficiaryId.set(d.beneficiaryId, d);
    }
  }

  const pigByBeneficiaryId = new Map<string, (typeof pigsRaw)[number]>();
  for (const p of pigsRaw) {
    if (p.currentBeneficiaryId && !pigByBeneficiaryId.has(p.currentBeneficiaryId)) {
      pigByBeneficiaryId.set(p.currentBeneficiaryId, p);
    }
  }

  let totalLivestockInvestmentNum = 0;

  const stockedPigs: SerializedFinancePigStock[] = pigsRaw.map((p) => {
    const priceNum = p.purchasePrice !== null && p.purchasePrice !== undefined ? Number(p.purchasePrice.toString()) : 0;
    if (!Number.isNaN(priceNum) && priceNum > 0) {
      totalLivestockInvestmentNum += priceNum;
    }

    const latestVet = latestVetByPigId.get(p.id);
    const ben = p.currentBeneficiaryId ? benMap.get(p.currentBeneficiaryId) : undefined;
    const vetParts = [
      latestVet?.diagnosis ? `Dx: ${latestVet.diagnosis}` : null,
      latestVet?.treatment ? `Tx: ${latestVet.treatment}` : null,
      latestVet?.verificationStatus ? `Status: ${latestVet.verificationStatus}` : null,
    ].filter(Boolean);

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
      latestVetExamSummary: vetParts.length > 0 ? vetParts.join(" · ") : null,
      latestVetExamDate: latestVet?.examinationDate ? toIsoString(latestVet.examinationDate) : null,
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
    return {
      id: pm.id,
      memberId: String(pm.memberId),
      memberName: mem?.name ?? "Unknown Member",
      memberEmail: mem?.email ?? "",
      cooperativeId: String(pm.cooperativeId),
      cooperativeName: coopMap.get(String(pm.cooperativeId)) ?? "Cooperative",
      pigValueFee: pm.pigValueFee.toString(),
      taxFee: pm.taxFee.toString(),
      totalAmount: pm.totalAmount.toString(),
      momoReference: pm.momoReference,
      status: pm.status,
      createdAt: toIsoString(pm.createdAt),
    };
  });

  const distributedPigIds = new Set<string>();
  const auditRows: SerializedDistributionAuditRow[] = distributionsRaw.map((d) => {
    if (d.pigId) distributedPigIds.add(d.pigId);
    const memberUser = userMap.get(d.beneficiaryId);
    const benRecord = d.beneficiary ?? benMap.get(d.beneficiaryId);
    const coopId = d.pig?.cooperativeId ?? memberUser?.cooperativeId ?? null;
    const payment = paymentByMemberId.get(d.beneficiaryId);

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
      memberRoleOrType: memberUser ? "Cooperative Member" : "Beneficiary",
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
  batchCode?: string;
  count?: number;
  totalInvestment?: number;
}> {
  const user = await getFinanceUser();
  if (!user) {
    return { success: false, error: "Unauthorized: Only Finance Officers can stock in pigs." };
  }

  const quantityRaw = String(formData.get("quantity") || "1").trim();
  const quantity = parseInt(quantityRaw, 10);
  if (Number.isNaN(quantity) || quantity < 1 || quantity > 100) {
    return { success: false, error: "Batch quantity must be between 1 and 100 pigs." };
  }

  const unitPriceRaw = String(formData.get("unitPrice") || String(DEFAULT_PIG_PRICE_RWF)).trim();
  const unitPrice = Number(unitPriceRaw);
  if (Number.isNaN(unitPrice) || unitPrice < 0 || unitPrice > 10000000) {
    return { success: false, error: "Unit price per pig must be a valid RWF amount." };
  }

  const customBatchCode = String(formData.get("batchCode") || "").trim().toUpperCase();
  const customTag = String(formData.get("tagNumber") || "").trim().toUpperCase();
  const pigType = String(formData.get("pigType") || "").trim() || "Gilt / Breeder";
  const daysAgeRaw = String(formData.get("daysAge") || "").trim();
  const breed = String(formData.get("breed") || "").trim() || null;
  const sexRaw = String(formData.get("sex") || "").trim().toUpperCase();
  const weightRaw = String(formData.get("currentWeight") || "").trim();
  const healthRaw = String(formData.get("healthStatus") || "HEALTHY").trim().toUpperCase();
  const source = String(formData.get("source") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  let daysAge: number | null = null;
  if (daysAgeRaw !== "") {
    const parsedDays = parseInt(daysAgeRaw, 10);
    if (Number.isNaN(parsedDays) || parsedDays < 0) {
      return { success: false, error: "Days / age must be a valid non-negative number." };
    }
    daysAge = parsedDays;
  }

  let currentWeight: number | null = null;
  if (weightRaw !== "") {
    const parsedWeight = Number(weightRaw);
    if (Number.isNaN(parsedWeight) || parsedWeight < 0) {
      return { success: false, error: "Weight must be a valid non-negative number." };
    }
    currentWeight = parsedWeight;
  }

  const sex: PigSex | null =
    sexRaw === PigSex.MALE ? PigSex.MALE : sexRaw === PigSex.FEMALE ? PigSex.FEMALE : null;

  const healthStatus = Object.values(PigHealthStatus).includes(healthRaw as PigHealthStatus)
    ? (healthRaw as PigHealthStatus)
    : PigHealthStatus.HEALTHY;

  try {
    const year = new Date().getFullYear();
    const finalBatchCode =
      customBatchCode || `BATCH-${year}-${randomUUID().slice(0, 6).toUpperCase()}`;

    const prefix = `PF-RW-${year}-`;
    const existingPigs = await prisma.pig.findMany({
      select: { tagNumber: true },
    });
    const existingTags = new Set(existingPigs.map((p) => p.tagNumber.toUpperCase()));

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

    const tagsToCreate: string[] = [];
    if (quantity === 1 && customTag) {
      if (existingTags.has(customTag)) {
        return { success: false, error: `Pig tag "${customTag}" already exists in inventory.` };
      }
      tagsToCreate.push(customTag);
    } else {
      for (let i = 0; i < quantity; i++) {
        let candidate = "";
        if (customTag) {
          candidate = `${customTag}-${String(i + 1).padStart(3, "0")}`;
          while (existingTags.has(candidate)) {
            nextSeq += 1;
            candidate = `${customTag}-${String(nextSeq).padStart(3, "0")}`;
          }
        } else {
          candidate = `${prefix}${String(nextSeq).padStart(5, "0")}`;
          while (existingTags.has(candidate)) {
            nextSeq += 1;
            candidate = `${prefix}${String(nextSeq).padStart(5, "0")}`;
          }
          nextSeq += 1;
        }
        existingTags.add(candidate);
        tagsToCreate.push(candidate);
      }
    }

    const createdPigs: { id: string; tagNumber: string }[] = [];
    const now = new Date();

    for (const tagNumber of tagsToCreate) {
      const pig = await prisma.pig.create({
        data: {
          tagNumber,
          batchCode: finalBatchCode,
          pigType,
          daysAge,
          breed,
          sex,
          currentWeight,
          purchasePrice: new Prisma.Decimal(unitPrice.toFixed(2)),
          healthStatus,
          status: PigStatus.REGISTERED,
          stockedByFinanceId: user.id,
          source: source ?? `Batch Collection ${finalBatchCode}`,
          notes,
          dateReceived: now,
        },
        select: { id: true, tagNumber: true },
      });
      createdPigs.push(pig);
    }

    const totalInvestment = Number((unitPrice * createdPigs.length).toFixed(2));

    if (totalInvestment > 0) {
      const txCode = `FIN-${year}-${randomUUID().slice(0, 8).toUpperCase()}`;
      await prisma.financeTransaction.create({
        data: {
          transactionId: txCode,
          type: FinanceType.EXPENSE,
          reference: "Pig Purchase",
          amount: new Prisma.Decimal(totalInvestment.toFixed(2)),
          pigId: createdPigs[0]?.id ?? null,
          paymentMethod: "Finance Batch Stock-In",
          description: `Batch ${finalBatchCode}: ${createdPigs.length} pig(s) (${pigType}) @ ${unitPrice.toLocaleString("en-US")} RWF/pig${source ? ` · Source: ${source}` : ""}`,
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
        action: "CREATED_BATCH",
        entity: "PIG",
        entityId: createdPigs[0]?.id ?? finalBatchCode,
        newValue: {
          batchCode: finalBatchCode,
          quantity: createdPigs.length,
          unitPriceRwf: unitPrice,
          totalInvestmentRwf: totalInvestment,
          pigTags: createdPigs.map((p) => p.tagNumber),
          pigType,
          daysAge,
          healthStatus,
          stockedByFinance: user.name,
        },
      },
    });

    revalidatePath("/dashboard/finance");
    revalidatePath("/dashboard/finance/pigs");
    revalidatePath("/dashboard/vet");
    revalidatePath("/dashboard/field");
    revalidatePath("/dashboard/admin/finance");
    revalidatePath("/dashboard/admin/pigs");

    return {
      success: true,
      batchCode: finalBatchCode,
      count: createdPigs.length,
      totalInvestment,
    };
  } catch (err) {
    if (isSupabaseSchemaMissingError(err)) {
      return {
        success: false,
        error:
          "Database schema update required: please run update.sql in your Supabase SQL Editor so the Pig columns (batch_code, days_age, pig_type, stocked_by_finance_id) exist and PostgREST reloads its schema cache.",
      };
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to stock in pig batch.",
    };
  }
}

export async function financeStockInPig(formData: FormData): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!formData.get("quantity")) {
    formData.set("quantity", "1");
  }
  if (!formData.get("unitPrice")) {
    formData.set("unitPrice", String(DEFAULT_PIG_PRICE_RWF));
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
  const batchCode = String(formData.get("batchCode") || "").trim().toUpperCase() || null;
  const pigType = String(formData.get("pigType") || "").trim() || null;
  const daysAgeRaw = String(formData.get("daysAge") || "").trim();
  const breed = String(formData.get("breed") || "").trim() || null;
  const sexRaw = String(formData.get("sex") || "").trim().toUpperCase();
  const weightRaw = String(formData.get("currentWeight") || "").trim();
  const priceRaw = String(formData.get("purchasePrice") || "").trim();
  const healthRaw = String(formData.get("healthStatus") || "").trim().toUpperCase();
  const statusRaw = String(formData.get("status") || "").trim().toUpperCase();
  const source = String(formData.get("source") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!pigId || !tagNumber) {
    return { success: false, error: "Pig ID and Tag Number are required." };
  }

  let daysAge: number | null = null;
  if (daysAgeRaw !== "") {
    const parsed = parseInt(daysAgeRaw, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      return { success: false, error: "Days / age must be a valid non-negative integer." };
    }
    daysAge = parsed;
  }

  let currentWeight: number | null = null;
  if (weightRaw !== "") {
    const parsed = Number(weightRaw);
    if (Number.isNaN(parsed) || parsed < 0) {
      return { success: false, error: "Weight must be a valid non-negative number." };
    }
    currentWeight = parsed;
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
        batchCode,
        pigType,
        daysAge,
        breed,
        sex,
        currentWeight,
        purchasePrice,
        healthStatus,
        status,
        source,
        notes,
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
          batchCode: existing.batchCode ?? null,
          purchasePrice: existing.purchasePrice?.toString() ?? null,
          status: existing.status,
          healthStatus: existing.healthStatus,
        },
        newValue: {
          tagNumber,
          batchCode,
          purchasePrice: purchasePrice?.toString() ?? null,
          status,
          healthStatus,
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
        error:
          "Database schema update required: please run update.sql in Supabase SQL Editor and reload schema cache.",
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

  const memberId = String(formData.get("memberId") || "").trim();
  const cooperativeId = String(formData.get("cooperativeId") || "").trim();
  const momoReference = String(formData.get("momoReference") || "").trim();

  if (!memberId || !cooperativeId || !momoReference) {
    return { success: false, error: "Member, Cooperative, and MoMo Reference code are required." };
  }

  try {
    const existing = await prisma.cooperativeMemberPayment.findFirst({
      where: { memberId },
    });

    if (existing) {
      await prisma.cooperativeMemberPayment.update({
        where: { id: existing.id },
        data: {
          momoReference,
          status: "VERIFIED",
          verifiedById: user.id,
        },
      });
    } else {
      await prisma.cooperativeMemberPayment.create({
        data: {
          memberId,
          cooperativeId,
          pigValueFee: new Prisma.Decimal("16000.00"),
          taxFee: new Prisma.Decimal("2800.00"),
          totalAmount: new Prisma.Decimal("18800.00"),
          momoReference,
          status: "VERIFIED",
          verifiedById: user.id,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        role: user.role,
        action: "VERIFIED",
        entity: "COOPERATIVE_MEMBER_PAYMENT",
        entityId: memberId,
        newValue: { memberId, cooperativeId, momoReference, amount: "18800 RWF" },
      },
    });

    revalidatePath("/dashboard/finance");
    revalidatePath("/dashboard/finance/pigs");
    revalidatePath("/dashboard/field");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to verify payment." };
  }
}
