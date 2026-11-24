import Link from "next/link";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveUser } from "@/lib/active-user";
import { getEcommerceOverview } from "@/app/actions/ecommerce";
import { ECOMMERCE_SQL_MIGRATION } from "@/lib/constants/ecommerce";
import { EcommerceManager } from "@/components/admin/EcommerceManager";

export const dynamic = "force-dynamic";

export default async function GebyianAnimalFoodOrderAndStockPage() {
  const actor = await getActiveUser([Role.SUPER_ADMIN, Role.PROJECT_MANAGER]);
  if (!actor) {
    redirect("/dashboard");
  }

  const [overview, notificationRows] = await Promise.all([
    getEcommerceOverview({ includeClearedPigs: false }),
    prisma.notification.findMany({
      where: {
        userId: actor.id,
        relatedEntity: { in: ["STORE_ORDER", "STORE_PRODUCT", "CELL_FEED_SALE"] },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
  ]);

  const alerts = notificationRows.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    relatedEntity: n.relatedEntity ?? null,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#FF8A00]">
            Order &amp; Stock Alerts &bull; Animal Food Division
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Animal Foods Stock &amp; Order Alerts
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Monitor stocked-out animal feed SKUs, Cell Manager field feed sales, and Animal Food buyer orders.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/admin/ecommerce/animal-food"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#101827] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1f2937]"
          >
            <span>Manage Animal Food Stock</span>
          </Link>
          <Link
            href={actor.role === Role.PROJECT_MANAGER ? "/dashboard/gebyian" : "/dashboard/admin"}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-[#101827] hover:border-[#FF8A00]"
          >
            <span>{actor.role === Role.PROJECT_MANAGER ? "Back to Dashboard" : "Back to Admin"}</span>
          </Link>
        </div>
      </div>

      <EcommerceManager
        initialData={overview}
        sqlMigration={ECOMMERCE_SQL_MIGRATION}
        fixedDivision="ANIMAL_FOOD"
        viewMode="ALERTS_ORDERS"
        alerts={alerts}
      />
    </div>
  );
}
