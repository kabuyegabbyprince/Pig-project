import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getActiveUser } from "@/lib/active-user";
import { prisma, isSupabaseTableMissingError } from "@/lib/prisma";
import { getClearedPigsForSale } from "@/lib/vet-clearance";
import { CellStockReportClient } from "@/components/field/CellStockReportClient";
import type { SerializedStockReport } from "@/app/actions/ecommerce";

export const dynamic = "force-dynamic";

export default async function FieldStockReportsPage() {
  const actor = await getActiveUser([Role.CELL_MANAGER, Role.SUPER_ADMIN]);
  if (!actor) redirect("/dashboard");

  let tableMissing = false;
  let reports: SerializedStockReport[] = [];
  let clearedPigs: Awaited<ReturnType<typeof getClearedPigsForSale>> = [];

  try {
    const [reportRows, cleared] = await Promise.all([
      prisma.cooperativeStockReport.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      getClearedPigsForSale(),
    ]);

    clearedPigs = cleared;
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
