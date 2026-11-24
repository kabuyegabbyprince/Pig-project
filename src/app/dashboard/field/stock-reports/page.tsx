import { redirect } from "next/navigation";
import { PigHealthStatus, PigStatus, Role } from "@prisma/client";
import { getActiveUser } from "@/lib/active-user";
import { prisma, isSupabaseTableMissingError } from "@/lib/prisma";
import { checkPigVetClearance } from "@/lib/vet-clearance";
import { CellStockReportClient } from "@/components/field/CellStockReportClient";
import type { SerializedClearedPigOption, SerializedStockReport } from "@/app/actions/ecommerce";

export const dynamic = "force-dynamic";

export default async function FieldStockReportsPage() {
  const actor = await getActiveUser([
    Role.CELL_MANAGER,
    Role.COOPERATIVE_LEADER,
    Role.PROJECT_MANAGER,
    Role.SUPER_ADMIN,
  ]);
  if (!actor) redirect("/dashboard");

  let tableMissing = false;
  let reports: SerializedStockReport[] = [];
  const clearedPigs: SerializedClearedPigOption[] = [];

  try {
    const [reportRows, healthyPigs] = await Promise.all([
      prisma.cooperativeStockReport.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.pig.findMany({
        where: {
          deletedAt: null,
          healthStatus: PigHealthStatus.HEALTHY,
          status: { in: [PigStatus.ACTIVE, PigStatus.REGISTERED] },
        },
        orderBy: { tagNumber: "asc" },
        take: 50,
        select: { id: true, tagNumber: true, breed: true, currentWeight: true },
      }),
    ]);

    reports = reportRows.map((r) => ({
      id: r.id,
      reportedByName: r.reportedByName,
      cooperativeOwnerName: r.cooperativeOwnerName,
      cooperativeOwnerRole: r.cooperativeOwnerRole,
      cellName: r.cellName,
      animalTitle: r.animalTitle,
      pigCount: r.pigCount,
      estimatedWeightKg: r.estimatedWeightKg ? r.estimatedWeightKg.toString() : null,
      suggestedPrice: r.suggestedPrice ? r.suggestedPrice.toString() : null,
      pigId: r.pigId ?? null,
      sourcePigTag: r.sourcePigTag ?? null,
      notes: r.notes ?? null,
      status: r.status,
      listedProductId: r.listedProductId ?? null,
      createdAt: r.createdAt.toISOString(),
    }));

    for (const p of healthyPigs) {
      const clearance = await checkPigVetClearance(p.id, "SALE");
      if (clearance.cleared) {
        clearedPigs.push({
          id: p.id,
          tagNumber: p.tagNumber,
          breed: p.breed,
          currentWeight: p.currentWeight,
        });
      }
    }
  } catch (err) {
    if (isSupabaseTableMissingError(err)) {
      tableMissing = true;
    } else {
      throw err;
    }
  }

  return (
    <CellStockReportClient
      reports={reports}
      clearedPigs={clearedPigs}
      tableMissing={tableMissing}
    />
  );
}
