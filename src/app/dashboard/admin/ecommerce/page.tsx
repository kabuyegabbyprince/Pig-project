import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { getActiveUser } from "@/lib/active-user";
import { getEcommerceOverview } from "@/app/actions/ecommerce";
import { ECOMMERCE_SQL_MIGRATION } from "@/lib/constants/ecommerce";
import { EcommerceManager } from "@/components/admin/EcommerceManager";

export const dynamic = "force-dynamic";

export default async function AdminEcommercePage() {
  const actor = await getActiveUser([Role.SUPER_ADMIN, Role.PROJECT_MANAGER]);
  if (!actor) {
    redirect("/dashboard");
  }

  const overview = await getEcommerceOverview();

  return (
    <div className="space-y-6 pb-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Shared Database Storefront Control
        </p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          E-Commerce Order &amp; Catalog Control
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Centralized command center for products, stock levels, customer orders, and automatic finance revenue reconciliation.
        </p>
      </div>

      <EcommerceManager initialData={overview} sqlMigration={ECOMMERCE_SQL_MIGRATION} />
    </div>
  );
}
