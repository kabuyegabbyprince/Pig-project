import Link from "next/link";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { ArrowLeft } from "lucide-react";
import { getActiveUser } from "@/lib/active-user";
import { getRevolvingManagementOverview } from "@/app/actions/revolving";
import { RevolvingManagerClient } from "@/components/admin/RevolvingManagerClient";

export const dynamic = "force-dynamic";

export default async function AdminRevolvingPage() {
  const actor = await getActiveUser([Role.SUPER_ADMIN]);
  if (!actor) redirect("/dashboard");

  const data = await getRevolvingManagementOverview();

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Revolving Livestock Enforcement
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Revolving Cycles &amp; Piglet Allocation
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Monitor due-date reminders for 2-piglet returns and route vet-cleared returned piglets to waiting families or E-Commerce surplus.
          </p>
        </div>

        <Link
          href="/dashboard/admin/distributions"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Distributions Ledger</span>
        </Link>
      </div>

      <RevolvingManagerClient
        cycles={data.cycles}
        clearedStock={data.clearedStock}
        waitingBeneficiaries={data.waitingBeneficiaries}
      />
    </div>
  );
}
