import Link from "next/link";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { getActiveUser } from "@/lib/active-user";
import { getEcommerceOverview } from "@/app/actions/ecommerce";
import { ECOMMERCE_SQL_MIGRATION } from "@/lib/constants/ecommerce";
import { EcommerceManager } from "@/components/admin/EcommerceManager";

export const dynamic = "force-dynamic";

export default async function GebyianAnimalFoodStockPage() {
  const actor = await getActiveUser([Role.SUPER_ADMIN, Role.PROJECT_MANAGER]);
  if (!actor) {
    redirect("/dashboard");
  }

  const overview = await getEcommerceOverview({ includeClearedPigs: false });

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#FF8A00]">
            Gebyian Stock &bull; Part 2: Animal Food
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Animal Food &amp; Feed Stock Control
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Add animal feed &amp; supplies, upload photos, set unit prices and optional discounts for Cell Manager distribution.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/admin/ecommerce/animal-food-orders"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#101827] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1f2937]"
          >
            <span>Animal Foods Stock &amp; Orders</span>
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
        viewMode="STOCK"
      />
    </div>
  );
}
