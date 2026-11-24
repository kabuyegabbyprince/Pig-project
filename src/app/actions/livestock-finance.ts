"use server";

import { prisma, isSupabaseSchemaMissingError } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getFinanceUser } from "@/lib/finance-access";
import { getActiveUser } from "@/lib/active-user";
import { PigHealthStatus, PigStatus, Role, Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { syncSupabaseAuthUser } from "@/lib/supabase-auth";
import { MOMO_SETTING_KEY, DEFAULT_MOMO_CODE, SerializedFinancePigStock, SerializedMemberPaymentRecord, SerializedDistributionAuditRow } from "@/lib/finance-types";




export async function getFinanceWorkspaceData() {
  const user = await getFinanceUser();
  if (!user) return null;

  try {
    const [momoSetting, pigsRaw, paymentsRaw, distributionsRaw, coopsRaw, usersRaw] = await Promise.all([
      prisma.systemSetting.findUnique({ where: { key: MOMO_SETTING_KEY } }),
      prisma.pig.findMany({
        orderBy: { createdAt: "desc" },
      }),
      prisma.cooperativeMemberPayment.findMany({
        orderBy: { createdAt: "desc" },
      }),
      prisma.pigDistribution.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          pig: true,
          beneficiary: true,
          distributedBy: true,
        },
      }),
      prisma.cooperative.findMany(),
      prisma.user.findMany({
        where: { deletedAt: null },
      }),
    ]);

    const coopMap = new Map<string, string>();
    for (const c of coopsRaw) coopMap.set(c.id, c.name);

    const userMap = new Map<string, (typeof usersRaw)[number]>();
    for (const u of usersRaw) userMap.set(String(u.id), u);

    const paymentByMemberId = new Map<string, (typeof paymentsRaw)[number]>();
    for (const p of paymentsRaw) {
      paymentByMemberId.set(String(p.memberId), p);
    }

    const stockedPigs: SerializedFinancePigStock[] = pigsRaw.map((p) => ({
      id: p.id,
      tagNumber: p.tagNumber,
      pigType: p.pigType ?? "Standard Gilt/Boar",
      daysAge: p.daysAge ?? 90,
      breed: p.breed ?? null,
      sex: p.sex ? String(p.sex) : null,
      currentWeight: p.currentWeight ?? null,
      healthStatus: p.healthStatus,
      status: p.status,
      stockedByFinanceId: p.stockedByFinanceId ?? null,
      createdAt:
        p.createdAt instanceof Date
          ? p.createdAt.toISOString()
          : new Date(p.createdAt).toISOString(),
    }));

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
        createdAt:
          pm.createdAt instanceof Date
            ? pm.createdAt.toISOString()
            : new Date(pm.createdAt).toISOString(),
      };
    });

    const auditRows: SerializedDistributionAuditRow[] = distributionsRaw.map((d) => {
      const memberUser = userMap.get(d.beneficiaryId);
      const coopId = memberUser?.cooperativeId;
      const payment = paymentByMemberId.get(d.beneficiaryId);
      return {
        id: d.id,
        pigTag: d.pig?.tagNumber ?? "PIG-UNKNOWN",
        pigType: d.pig?.pigType ?? "Pig",
        cellManagerName: d.distributedBy?.name ?? "Cell Manager",
        cooperativeName: coopId ? coopMap.get(coopId) ?? "Cooperative" : "Cell Program",
        memberName: d.beneficiary?.fullName ?? memberUser?.name ?? "Member",
        memberPhone: d.beneficiary?.phone ?? memberUser?.phone ?? null,
        paymentVerified: Boolean(payment && payment.status === "VERIFIED"),
        momoReference: payment?.momoReference ?? "MoMo-Verified",
        distributionDate:
          d.distributionDate instanceof Date
            ? d.distributionDate.toISOString()
            : new Date(d.distributionDate).toISOString(),
        notes: d.notes ?? null,
      };
    });

    return {
      schemaMissing: false,
      momoMerchantCode: momoSetting?.value ?? DEFAULT_MOMO_CODE,
      stockedPigs,
      memberPayments,
      auditRows,
    };
  } catch (err) {
    if (isSupabaseSchemaMissingError(err)) {
      return {
        schemaMissing: true,
        momoMerchantCode: DEFAULT_MOMO_CODE,
        stockedPigs: [],
        memberPayments: [],
        auditRows: [],
      };
    }
    throw err;
  }
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
    revalidatePath("/dashboard/field");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update MoMo code." };
  }
}

export async function financeStockInPig(formData: FormData): Promise<{
  success: boolean;
  error?: string;
}> {
  const user = await getFinanceUser();
  if (!user) {
    return { success: false, error: "Unauthorized: Only Finance Officers can stock in pigs." };
  }

  const customTag = String(formData.get("tagNumber") || "").trim().toUpperCase();
  const pigType = String(formData.get("pigType") || "Gilt / Breeder").trim();
  const daysAgeRaw = String(formData.get("daysAge") || "90").trim();
  const healthRaw = String(formData.get("healthStatus") || "HEALTHY").trim().toUpperCase();
  const notes = String(formData.get("notes") || "").trim() || null;

  const daysAge = parseInt(daysAgeRaw, 10);
  if (Number.isNaN(daysAge) || daysAge < 0) {
    return { success: false, error: "Days / age must be a valid number." };
  }

  const healthStatus = Object.values(PigHealthStatus).includes(healthRaw as PigHealthStatus)
    ? (healthRaw as PigHealthStatus)
    : PigHealthStatus.HEALTHY;

  try {
    const year = new Date().getFullYear();
    const prefix = `PF-RW-${year}-`;
    let tagNumber = customTag;

    if (!tagNumber) {
      const lastPig = await prisma.pig.findFirst({
        where: {
          OR: [
            { tagNumber: { startsWith: prefix } },
            { tagNumber: { startsWith: `PIG-${year}-` } },
          ],
        },
        orderBy: { tagNumber: "desc" },
      });
      let nextSeq = 1;
      if (lastPig) {
        const lastPart = lastPig.tagNumber.split("-").pop() ?? "";
        const parsed = parseInt(lastPart, 10);
        if (!Number.isNaN(parsed)) nextSeq = parsed + 1;
      }
      tagNumber = `${prefix}${String(nextSeq).padStart(5, "0")}`;
    } else {
      const dup = await prisma.pig.findFirst({ where: { tagNumber } });
      if (dup) {
        return { success: false, error: `Pig tag "${tagNumber}" already exists in inventory.` };
      }
    }

    const pig = await prisma.pig.create({
      data: {
        tagNumber,
        pigType,
        daysAge,
        healthStatus,
        status: PigStatus.REGISTERED,
        stockedByFinanceId: user.id,
        notes,
        dateReceived: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        role: user.role,
        action: "CREATED",
        entity: "PIG",
        entityId: pig.id,
        newValue: {
          tagNumber,
          pigType,
          daysAge,
          healthStatus,
          stockedByFinance: user.name,
        },
      },
    });

    revalidatePath("/dashboard/finance");
    revalidatePath("/dashboard/vet");
    revalidatePath("/dashboard/field");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to stock in pig." };
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
    revalidatePath("/dashboard/field");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to verify payment." };
  }
}
