import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Prisma } from "@prisma/client";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  FileText,
  PiggyBank,
  PlusCircle,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { prisma, isSupabaseTableMissingError } from "@/lib/prisma";
import { getFinanceUser } from "@/lib/finance-access";
import { formatRwf } from "@/lib/format-rwf";
import { approveTransaction } from "@/app/actions/finance";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FeedSalesVerificationClient } from "@/components/finance/FeedSalesVerificationClient";
import { getFinanceWorkspaceData } from "@/app/actions/livestock-finance";
import { FinanceMoMoSettingsCard } from "@/components/finance/FinanceMoMoSettingsCard";
import type { SerializedCellFeedSale } from "@/app/actions/ecommerce";

export const dynamic = "force-dynamic";

export default async function FinanceDashboard() {
  const user = await getFinanceUser();
  if (!user) {
    redirect("/dashboard");
  }

  let feedSalesTableMissing = false;
  let feedSales: SerializedCellFeedSale[] = [];

  const [incomeAggr, expenseAggr, allIncome, allExpenses, pendingTxs, livestockData] = await Promise.all([
    prisma.financeTransaction.aggregate({
      _sum: { amount: true },
      where: { type: "INCOME", status: "APPROVED", deletedAt: null },
    }),
    prisma.financeTransaction.aggregate({
      _sum: { amount: true },
      where: { type: "EXPENSE", status: "APPROVED", deletedAt: null },
    }),
    prisma.financeTransaction.findMany({
      where: { type: "INCOME", deletedAt: null },
      orderBy: { transactionDate: "desc" },
      take: 10,
      include: { recordedBy: true },
    }),
    prisma.financeTransaction.findMany({
      where: { type: "EXPENSE", deletedAt: null },
      orderBy: { transactionDate: "desc" },
      take: 10,
      include: { recordedBy: true },
    }),
    prisma.financeTransaction.findMany({
      where: { status: "SUBMITTED", deletedAt: null },
      orderBy: { transactionDate: "desc" },
      take: 25,
      include: { recordedBy: true },
    }),
    getFinanceWorkspaceData(),
  ]);

  try {
    const feedRows = await prisma.cellFeedSale.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    feedSales = feedRows.map((s) => ({
      id: s.id,
      saleNumber: s.saleNumber,
      productId: s.productId ?? null,
      productName: s.productName,
      buyerName: s.buyerName,
      buyerPhone: s.buyerPhone ?? null,
      quantity: s.quantity,
      unitPrice: s.unitPrice.toString(),
      totalAmount: s.totalAmount.toString(),
      paymentMethod: s.paymentMethod,
      soldByName: s.soldByName,
      cellName: s.cellName ?? null,
      financeTransactionId: s.financeTransactionId ?? null,
      verificationStatus: s.verificationStatus,
      notes: s.notes ?? null,
      createdAt: s.createdAt.toISOString(),
    }));
  } catch (err) {
    if (isSupabaseTableMissingError(err)) {
      feedSalesTableMissing = true;
    } else {
      throw err;
    }
  }

  const totalIncome = incomeAggr._sum.amount ?? new Prisma.Decimal(0);
  const totalExpenses = expenseAggr._sum.amount ?? new Prisma.Decimal(0);
  const balance = totalIncome.minus(totalExpenses);
  const totalLivestockInvestment = new Prisma.Decimal(
    livestockData?.totalLivestockInvestment ?? "0"
  );

  const quickActions = [
    {
      label: "Pig Stock & Cycles",
      description: "Manage pig batches, 80,000 RWF investment, recipients & cycles",
      href: "/dashboard/finance/pigs",
      icon: PiggyBank,
    },
    {
      label: "Record Income",
      description: "Log donor funding, grants, or verified sales income",
      href: "/dashboard/finance/new?type=INCOME",
      icon: PlusCircle,
    },
    {
      label: "Record Expense",
      description: "Record operational expenses, transport, or supplies",
      href: "/dashboard/finance/new?type=EXPENSE",
      icon: PlusCircle,
    },
    {
      label: "Finance Reports",
      description: "Review income, expenditure, and ledger summaries",
      href: "/dashboard/finance/reports",
      icon: FileText,
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FF8A00]">
            Finance Officer Verification &amp; Accounting
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#101827]">
            Welcome back, {user.name}
          </h1>
        </div>
        <Link
          href="/dashboard/finance/pigs"
          prefetch={false}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#101827] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1f2937] transition-colors shrink-0"
        >
          <PiggyBank className="h-4 w-4 text-[#FF8A00]" />
          <span>Pig Stock &amp; Cycles</span>
          <ArrowRight className="h-4 w-4 text-[#FF8A00]" />
        </Link>
      </div>

      {livestockData?.schemaMissing && livestockData.schemaWarning && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900 flex items-center gap-2.5">
          <AlertTriangle className="h-4 w-4 text-[#FF8A00] shrink-0" />
          <span>{livestockData.schemaWarning}</span>
        </div>
      )}

      {/* 4 Real-DB KPI Cards */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#FF8A00]">
            <TrendingUp className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-500">Total Approved Income</p>
          <p className="mt-2 break-words text-2xl font-bold leading-tight text-[#101827]">
            {formatRwf(totalIncome)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <TrendingDown className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-500">Total Approved Expenses</p>
          <p className="mt-2 break-words text-2xl font-bold leading-tight text-[#101827]">
            {formatRwf(totalExpenses)}
          </p>
        </div>

        <Link
          href="/dashboard/finance/pigs"
          prefetch={false}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-[#FF8A00] transition-colors block"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#FF8A00]">
            <PiggyBank className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-500">Total Livestock Investment</p>
          <p className="mt-2 break-words text-2xl font-bold leading-tight text-[#101827]">
            {formatRwf(totalLivestockInvestment)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {livestockData?.totalPigsCount ?? 0} pig(s) · {livestockData?.totalBatchesCount ?? 0} batch(es)
          </p>
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-[#101827]">
            <Wallet className="h-5 w-5 text-[#FF8A00]" />
          </div>
          <p className="text-sm font-medium text-slate-500">Current Fund Balance</p>
          <p className="mt-2 break-words text-2xl font-bold leading-tight text-[#101827]">
            {formatRwf(balance)}
          </p>
        </div>
      </div>

      {/* MoMo Merchant Code Configuration */}
      {livestockData && (
        <FinanceMoMoSettingsCard momoMerchantCode={livestockData.momoMerchantCode} />
      )}

      {/* Quick Actions */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <h2 className="text-xl font-bold text-[#101827]">Quick actions</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map(({ label, description, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              prefetch={false}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:border-[#FF8A00] hover:bg-orange-50/40 transition-colors"
            >
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white border border-slate-200 text-[#FF8A00]">
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-sm font-semibold text-[#101827]">{label}</p>
              <p className="mt-1 text-xs text-slate-500">{description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Cell Manager Animal Food Sales Verification */}
      <FeedSalesVerificationClient sales={feedSales} tableMissing={feedSalesTableMissing} />

      {/* Pending Cell Manager / Submitted Finance Transactions */}
      {pendingTxs.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 bg-orange-50/60 px-5 py-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#FF8A00]" />
              <h2 className="text-base font-bold text-[#101827]">
                Transactions Awaiting Finance Officer Verification ({pendingTxs.length})
              </h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date &amp; Ref</th>
                  <th className="px-4 py-3">Category / Description</th>
                  <th className="px-4 py-3">Recorded By</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3 text-right">Verify</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-[#101827]">
                {pendingTxs.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <p className="font-mono font-bold text-[#101827]">{tx.transactionId}</p>
                      <p className="text-[11px] text-slate-500">
                        {format(new Date(tx.transactionDate), "MMM d, yyyy")}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{tx.reference || "General"}</p>
                      {tx.description && (
                        <p className="text-[11px] text-slate-500 max-w-md truncate">{tx.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{tx.recordedBy.name}</td>
                    <td className="px-4 py-3 font-bold text-[#FF8A00]">
                      {tx.type === "INCOME" ? "+" : "-"}
                      {formatRwf(tx.amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={approveTransaction}>
                        <input type="hidden" name="transactionId" value={tx.id} />
                        <SubmitButton
                          pendingText="Verifying..."
                          className="inline-flex items-center gap-1 rounded-lg bg-[#101827] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1f2937] cursor-pointer"
                        >
                          <CheckCircle className="h-3.5 w-3.5 text-[#FF8A00]" />
                          Approve
                        </SubmitButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* INCOME TABLE */}
        <div className="bg-white shadow-xs rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <h2 className="text-lg font-bold text-[#101827] flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-[#FF8A00]" /> Recent Income
            </h2>
            <Link
              href="/dashboard/finance/new?type=INCOME"
              className="text-sm text-[#FF8A00] hover:underline font-semibold"
            >
              Add Income
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[680px] divide-y divide-slate-200">
              <thead className="bg-slate-50/70">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                    Date
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                    Source
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                    Amount
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                    Status / By
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {allIncome.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-[#101827]">
                      {format(new Date(tx.transactionDate), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-[#101827] font-medium">
                      {tx.reference || "General"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-[#FF8A00]">
                      +{formatRwf(tx.amount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                      <span className="font-semibold text-[#101827]">{tx.status}</span> · {tx.recordedBy.name}
                    </td>
                  </tr>
                ))}
                {allIncome.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                      No recent income records.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* EXPENSE TABLE */}
        <div className="bg-white shadow-xs rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-slate-200 bg-rose-50/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <h2 className="text-lg font-bold text-[#101827] flex items-center">
              <TrendingDown className="h-5 w-5 mr-2 text-rose-600" /> Recent Expenses
            </h2>
            <Link
              href="/dashboard/finance/new?type=EXPENSE"
              className="text-sm text-rose-600 hover:underline font-semibold"
            >
              Add Expense
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[680px] divide-y divide-slate-200">
              <thead className="bg-slate-50/70">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                    Date
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                    Category
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                    Amount
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                    Status / By
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {allExpenses.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-[#101827]">
                      {format(new Date(tx.transactionDate), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-[#101827] font-medium">
                      {tx.reference || "General"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-rose-600">
                      {formatRwf(tx.amount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                      <span className="font-semibold text-[#101827]">{tx.status}</span> · {tx.recordedBy.name}
                    </td>
                  </tr>
                ))}
                {allExpenses.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                      No recent expense records.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
