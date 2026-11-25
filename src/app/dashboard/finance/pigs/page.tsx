import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getFinanceUser } from "@/lib/finance-access";
import { getFinanceWorkspaceData } from "@/app/actions/livestock-finance";
import { FinancePigsManagerClient } from "@/components/finance/FinancePigsManagerClient";

export const dynamic = "force-dynamic";

export default async function FinancePigsPage() {
  const user = await getFinanceUser();
  if (!user) {
    redirect("/dashboard");
  }

  const workspace = await getFinanceWorkspaceData();
  if (!workspace) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/dashboard/finance"
            prefetch={false}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#101827] mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Finance Dashboard
          </Link>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FF8A00]">
            Accountant Pig Collection, Investment &amp; Lifecycle Registry
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#101827]">
            Pig Stock, Recipients &amp; Cycles
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Register pig collection batches (80,000 RWF default per pig counted as investment), manage pig records, audit people given pigs, and monitor revolving pig cycles.
          </p>
        </div>
      </div>

      <FinancePigsManagerClient data={workspace} />
    </div>
  );
}
