import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatRwf } from "@/lib/format-rwf";
import { Prisma, RevolvingStatus } from "@prisma/client";
import { 
  FileText, Download, Users, PiggyBank, ArrowRightCircle, RefreshCw, 
  Stethoscope, Wallet, HeartPulse, CheckCircle2, Clock
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session || (role !== "SUPER_ADMIN" && role !== "PROJECT_MANAGER" && role !== "FINANCE_OFFICER")) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const period = params.period || "month";

  const now = new Date();
  let startDate: Date | undefined;
  if (period === "today") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === "month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === "year") {
    startDate = new Date(now.getFullYear(), 0, 1);
  }

  const dateFilter = startDate ? { gte: startDate } : undefined;

  const [
    // Livestock
    pigsReceived,
    pigsDistributed,
    pigsAvailable,
    // Beneficiaries
    beneficiariesRegistered,
    totalBeneficiaries,
    // Returns
    pigletsReturnedAggr,
    totalDistributionsCount,
    cyclesCompleted,
    // Veterinary
    vetExamsCount,
    pigsInTreatment,
    healthyPigs,
    followUpsDue,
    // Finance
    incomeAggr,
    expenseAggr,
    ecomIncomeAggr,
    ecomRefundAggr,
  ] = await Promise.all([
    prisma.pig.count({
      where: {
        dateReceived: dateFilter,
        deletedAt: null,
      },
    }),
    prisma.pigDistribution.count({
      where: { distributionDate: dateFilter },
    }),
    prisma.pig.count({
      where: {
        status: "ACTIVE",
        healthStatus: "HEALTHY",
        currentBeneficiaryId: null,
        deletedAt: null,
      },
    }),
    prisma.beneficiary.count({
      where: {
        registrationDate: dateFilter,
        deletedAt: null,
      },
    }),
    prisma.beneficiary.count({ where: { deletedAt: null } }),
    prisma.pigReturn.aggregate({
      _sum: { quantity: true },
      where: { returnDate: dateFilter },
    }),
    prisma.pigDistribution.count(),
    prisma.revolvingCycle.count({
      where: { status: RevolvingStatus.COMPLETED },
    }),
    prisma.veterinaryRecord.count({
      where: { date: dateFilter },
    }),
    prisma.pig.count({
      where: { healthStatus: { in: ["SICK", "UNDER_TREATMENT", "CRITICAL"] }, deletedAt: null },
    }),
    prisma.pig.count({
      where: { healthStatus: "HEALTHY", deletedAt: null },
    }),
    prisma.veterinaryRecord.count({
      where: { followUpDate: { gte: now } },
    }),
    prisma.financeTransaction.aggregate({
      _sum: { amount: true },
      where: {
        type: "INCOME",
        status: "APPROVED",
        transactionDate: dateFilter,
        deletedAt: null,
      },
    }),
    prisma.financeTransaction.aggregate({
      _sum: { amount: true },
      where: {
        type: "EXPENSE",
        status: "APPROVED",
        transactionDate: dateFilter,
        deletedAt: null,
      },
    }),
    prisma.financeTransaction.aggregate({
      _sum: { amount: true },
      where: {
        type: "INCOME",
        status: "APPROVED",
        reference: "E-Commerce Sales",
        transactionDate: dateFilter,
        deletedAt: null,
      },
    }),
    prisma.financeTransaction.aggregate({
      _sum: { amount: true },
      where: {
        type: "EXPENSE",
        status: "APPROVED",
        reference: "E-Commerce Refunds",
        transactionDate: dateFilter,
        deletedAt: null,
      },
    }),
  ]);

  const totalPigletsReturned = pigletsReturnedAggr._sum.quantity ?? 0;
  const totalRequiredObligation = totalDistributionsCount * 2;
  const totalOutstandingObligations = Math.max(0, totalRequiredObligation - totalPigletsReturned);

  const totalIncome = incomeAggr._sum.amount ?? new Prisma.Decimal(0);
  const totalExpenses = expenseAggr._sum.amount ?? new Prisma.Decimal(0);
  const netBalance = totalIncome.minus(totalExpenses);

  const ecomGrossSales = ecomIncomeAggr._sum.amount ?? new Prisma.Decimal(0);
  const ecomRefunds = ecomRefundAggr._sum.amount ?? new Prisma.Decimal(0);
  const ecomNetRevenue = ecomGrossSales.minus(ecomRefunds);
  const fieldIncome = totalIncome.minus(ecomGrossSales);
  const fieldExpenses = totalExpenses.minus(ecomRefunds);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#FF8A00]">Executive Reporting</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#101827]">Project Summary Reports</h1>
          <p className="mt-1 text-sm text-slate-600">
            Official operational and financial summaries computed dynamically from primary database records.
          </p>
        </div>

        {/* Period Filter Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <form method="get" className="flex items-center gap-2">
            <select
              name="period"
              defaultValue={period}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white text-[#101827] font-medium focus:outline-none focus:ring-1 focus:ring-[#FF8A00]"
            >
              <option value="today">Today</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
              <option value="all">All Time</option>
            </select>
            <button
              type="submit"
              className="bg-[#101827] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#1f2937] transition"
            >
              Update Report
            </button>
          </form>

          <a
            href="/api/finance/export"
            download
            className="inline-flex items-center gap-1.5 border border-slate-200 bg-white text-[#101827] px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:bg-orange-50 transition"
          >
            <Download className="w-4 h-4 text-[#FF8A00]" /> Export Financials
          </a>
        </div>
      </div>

      {/* 5-Pillar Comprehensive Summary */}
      <div className="space-y-6">
        {/* Pillar 1: Livestock */}
        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#FF8A00]">
              <PiggyBank className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#101827]">Livestock Dynamics</h2>
              <p className="text-xs text-slate-500">Registry influx, distribution execution, and currently available herd.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <span className="text-xs font-semibold uppercase text-slate-500">Pigs Received in Period</span>
              <p className="mt-2 text-2xl font-bold text-[#101827]">{pigsReceived}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <span className="text-xs font-semibold uppercase text-slate-500">Pigs Distributed to Families</span>
              <p className="mt-2 text-2xl font-bold text-[#FF8A00]">{pigsDistributed}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <span className="text-xs font-semibold uppercase text-slate-500">Available Healthy Herd</span>
              <p className="mt-2 text-2xl font-bold text-[#101827]">{pigsAvailable}</p>
            </div>
          </div>
        </div>

        {/* Pillar 2: Beneficiaries */}
        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#FF8A00]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#101827]">Beneficiary Outreach</h2>
              <p className="text-xs text-slate-500">Vulnerable households enrolled in the livestock fund programme.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <span className="text-xs font-semibold uppercase text-slate-500">New Registrations</span>
              <p className="mt-2 text-2xl font-bold text-[#101827]">{beneficiariesRegistered}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <span className="text-xs font-semibold uppercase text-slate-500">Total Families Enrolled</span>
              <p className="mt-2 text-2xl font-bold text-[#FF8A00]">{totalBeneficiaries}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <span className="text-xs font-semibold uppercase text-slate-500">Families Supported with Pigs</span>
              <p className="mt-2 text-2xl font-bold text-[#101827]">{totalDistributionsCount}</p>
            </div>
          </div>
        </div>

        {/* Pillar 3: Revolving Returns */}
        <div className="rounded-[24px] border border-[#dfe7df] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 border-b border-[#dfe7df] pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e7f0fb] text-[#2d5b78]">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1b2d24]">Revolving Fund & Two-Piglet Returns</h2>
              <p className="text-xs text-[#5d6e64]">Returned piglets re-entering the project to multiply community impact.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[#dfe7df] bg-[#fcfdfc] p-4">
              <span className="text-xs font-semibold uppercase text-[#5d6d64]">Piglets Returned</span>
              <p className="mt-2 text-2xl font-bold text-[#173d2e]">{totalPigletsReturned}</p>
            </div>
            <div className="rounded-xl border border-[#dfe7df] bg-[#fcfdfc] p-4">
              <span className="text-xs font-semibold uppercase text-[#5d6d64]">Outstanding Return Obligations</span>
              <p className="mt-2 text-2xl font-bold text-[#a44d67]">{totalOutstandingObligations}</p>
            </div>
            <div className="rounded-xl border border-[#dfe7df] bg-[#fcfdfc] p-4">
              <span className="text-xs font-semibold uppercase text-[#5d6d64]">Completed 2-Piglet Commitments</span>
              <p className="mt-2 text-2xl font-bold text-[#2d5b78]">{cyclesCompleted}</p>
            </div>
          </div>
        </div>

        {/* Pillar 4: Veterinary */}
        <div className="rounded-[24px] border border-[#dfe7df] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 border-b border-[#dfe7df] pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f7e3ea] text-[#a44d67]">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1b2d24]">Veterinary Care & Clinical Health</h2>
              <p className="text-xs text-[#5d6e64]">Medical assessments, treatment interventions, and follow-up schedules.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-[#dfe7df] bg-[#fcfdfc] p-4">
              <span className="text-xs font-semibold uppercase text-[#5d6d64]">Examinations Conducted</span>
              <p className="mt-2 text-2xl font-bold text-[#1b2d24]">{vetExamsCount}</p>
            </div>
            <div className="rounded-xl border border-[#dfe7df] bg-[#fcfdfc] p-4">
              <span className="text-xs font-semibold uppercase text-[#5d6d64]">Cleared Healthy Pigs</span>
              <p className="mt-2 text-2xl font-bold text-[#173d2e]">{healthyPigs}</p>
            </div>
            <div className="rounded-xl border border-[#dfe7df] bg-[#fcfdfc] p-4">
              <span className="text-xs font-semibold uppercase text-[#5d6d64]">Active Treatment Cases</span>
              <p className="mt-2 text-2xl font-bold text-[#a44d67]">{pigsInTreatment}</p>
            </div>
            <div className="rounded-xl border border-[#dfe7df] bg-[#fcfdfc] p-4">
              <span className="text-xs font-semibold uppercase text-[#5d6d64]">Scheduled Follow-ups</span>
              <p className="mt-2 text-2xl font-bold text-[#2d5b78]">{followUpsDue}</p>
            </div>
          </div>
        </div>

        {/* Pillar 5: Finance */}
        <div className="rounded-[24px] border border-[#dfe7df] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 border-b border-[#dfe7df] pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e3efe7] text-[#173d2e]">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1b2d24]">Financial Standing (RWF)</h2>
              <p className="text-xs text-[#5d6e64]">Approved monetary inflows, operational expenses, and posted fund balance.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[#dfe7df] bg-[#fcfdfc] p-4">
              <span className="text-xs font-semibold uppercase text-[#5d6d64]">Total Approved Income</span>
              <p className="mt-2 text-2xl font-bold text-[#173d2e]">{formatRwf(totalIncome)}</p>
            </div>
            <div className="rounded-xl border border-[#dfe7df] bg-[#fcfdfc] p-4">
              <span className="text-xs font-semibold uppercase text-[#5d6d64]">Total Operational Expenses</span>
              <p className="mt-2 text-2xl font-bold text-[#a44d67]">{formatRwf(totalExpenses)}</p>
            </div>
            <div className="rounded-xl border border-[#dfe7df] bg-[#fcfdfc] p-4">
              <span className="text-xs font-semibold uppercase text-[#5d6d64]">Net Financial Balance</span>
              <p className="mt-2 text-2xl font-bold text-[#1b2d24]">{formatRwf(netBalance)}</p>
            </div>
          </div>

          {/* Store Revenue vs Field Expenses Breakdown */}
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 border-t border-[#dfe7df] pt-4">
            <div className="rounded-xl border border-[#dfe7df] bg-[#f6fbf7] p-3.5">
              <span className="text-[11px] font-semibold uppercase text-[#173d2e]">E-Commerce Net Revenue</span>
              <p className="mt-1 text-lg font-bold text-[#173d2e]">{formatRwf(ecomNetRevenue)}</p>
              <p className="text-[11px] text-[#5d6e64]">Gross {formatRwf(ecomGrossSales)} minus {formatRwf(ecomRefunds)} refunds</p>
            </div>
            <div className="rounded-xl border border-[#dfe7df] bg-[#fcfdfc] p-3.5">
              <span className="text-[11px] font-semibold uppercase text-[#5d6d64]">Field / Grant Income</span>
              <p className="mt-1 text-lg font-bold text-[#1b2d24]">{formatRwf(fieldIncome)}</p>
              <p className="text-[11px] text-[#5d6e64]">Donor, project &amp; field inflows</p>
            </div>
            <div className="rounded-xl border border-[#dfe7df] bg-[#fcfdfc] p-3.5">
              <span className="text-[11px] font-semibold uppercase text-[#a44d67]">Field Program Expenses</span>
              <p className="mt-1 text-lg font-bold text-[#a44d67]">{formatRwf(fieldExpenses)}</p>
              <p className="text-[11px] text-[#5d6e64]">Vet, feed, transport &amp; operations</p>
            </div>
            <div className="rounded-xl border border-[#dfe7df] bg-[#fcfdfc] p-3.5 flex flex-col justify-between">
              <span className="text-[11px] font-semibold uppercase text-[#5d6d64]">CSV Exports</span>
              <div className="mt-2 flex flex-wrap gap-2">
                <a
                  href="/api/finance/export?source=ecommerce"
                  download
                  className="text-xs font-semibold text-[#173d2e] underline"
                >
                  E-Commerce CSV
                </a>
                <a
                  href="/api/finance/export?source=field"
                  download
                  className="text-xs font-semibold text-[#2d5b78] underline"
                >
                  Field CSV
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
