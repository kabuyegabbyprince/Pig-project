"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Wheat,
  XCircle,
} from "lucide-react";
import { verifyCellFeedSale, type SerializedCellFeedSale } from "@/app/actions/ecommerce";
import { formatRwf } from "@/lib/format-rwf";

export function FeedSalesVerificationClient({
  sales,
  tableMissing,
}: {
  sales: SerializedCellFeedSale[];
  tableMissing: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "VERIFIED" | "REJECTED">("ALL");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const summary = useMemo(() => {
    let pendingAmount = 0;
    let pendingCount = 0;
    let verifiedAmount = 0;
    let verifiedCount = 0;
    for (const s of sales) {
      const amt = Number(s.totalAmount || 0);
      if (s.verificationStatus === "PENDING") {
        pendingAmount += amt;
        pendingCount += 1;
      } else if (s.verificationStatus === "VERIFIED") {
        verifiedAmount += amt;
        verifiedCount += 1;
      }
    }
    return { pendingAmount, pendingCount, verifiedAmount, verifiedCount };
  }, [sales]);

  const filteredSales = useMemo(() => {
    if (filterStatus === "ALL") return sales;
    return sales.filter((s) => s.verificationStatus === filterStatus);
  }, [sales, filterStatus]);

  const handleDecision = (saleId: string, decision: "VERIFIED" | "REJECTED") => {
    setMessage(null);
    startTransition(async () => {
      const res = await verifyCellFeedSale(saleId, decision);
      if (!res.success) {
        setMessage({ type: "err", text: res.error || "Could not update sale status." });
        return;
      }
      setMessage({
        type: "ok",
        text:
          decision === "VERIFIED"
            ? "Feed sale verified and linked FinanceTransaction approved."
            : "Feed sale rejected and animal food stock restored.",
      });
      router.refresh();
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-[#FF8A00]">
            <Wheat className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#101827]">
              Cell Manager Animal Food Sales Report &amp; Verification
            </h2>
            <p className="text-xs text-slate-500">
              Verify Cell Manager feed sales before revenue is posted as approved income.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1 font-bold text-[#FF8A00]">
            Pending: {summary.pendingCount} ({formatRwf(summary.pendingAmount)})
          </span>
          <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-bold text-[#101827]">
            Verified: {summary.verifiedCount} ({formatRwf(summary.verifiedAmount)})
          </span>
        </div>
      </div>

      {tableMissing ? (
        <div className="p-5 text-xs text-amber-900 bg-amber-50 flex items-center gap-2.5">
          <AlertTriangle className="h-4 w-4 text-[#FF8A00] shrink-0" />
          <span>
            Run <span className="font-mono font-semibold">update.sql</span> in Supabase SQL Editor to activate{" "}
            <span className="font-mono">cell_feed_sales</span> reporting.
          </span>
        </div>
      ) : (
        <div className="p-5 space-y-4">
          {message && (
            <div
              className={`rounded-xl px-4 py-2.5 text-xs font-medium ${
                message.type === "ok"
                  ? "border border-orange-200 bg-orange-50 text-[#101827]"
                  : "border border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {(["ALL", "PENDING", "VERIFIED", "REJECTED"] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilterStatus(status)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  filterStatus === status
                    ? "bg-[#101827] text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-[#FF8A00]"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2.5">Sale ID</th>
                  <th className="px-3 py-2.5">Cell Manager / Cell</th>
                  <th className="px-3 py-2.5">Product &amp; Qty</th>
                  <th className="px-3 py-2.5">Buyer</th>
                  <th className="px-3 py-2.5">Total Amount</th>
                  <th className="px-3 py-2.5">Payment</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-right">Finance Officer Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-[#101827]">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                      No Cell Manager animal food sales match this filter.
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70">
                      <td className="px-3 py-3">
                        <p className="font-mono font-bold text-[#FF8A00]">{s.saleNumber}</p>
                        <p className="text-[11px] text-slate-500">
                          {new Date(s.createdAt).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-semibold">{s.soldByName}</p>
                        <p className="text-[11px] text-slate-500">{s.cellName || "Cell not set"}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-semibold">{s.productName}</p>
                        <p className="text-[11px] text-slate-500">
                          {s.quantity} units @ {formatRwf(s.unitPrice)}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <p>{s.buyerName}</p>
                        {s.buyerPhone && <p className="text-[11px] text-slate-500">{s.buyerPhone}</p>}
                      </td>
                      <td className="px-3 py-3 font-bold">{formatRwf(s.totalAmount)}</td>
                      <td className="px-3 py-3 text-slate-600">{s.paymentMethod}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold ${
                            s.verificationStatus === "VERIFIED"
                              ? "bg-slate-100 text-[#101827]"
                              : s.verificationStatus === "REJECTED"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-orange-50 text-[#FF8A00]"
                          }`}
                        >
                          {s.verificationStatus}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        {s.verificationStatus === "PENDING" ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleDecision(s.id, "VERIFIED")}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#101827] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#1f2937] disabled:opacity-50 cursor-pointer"
                            >
                              {isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin text-[#FF8A00]" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3 text-[#FF8A00]" />
                              )}
                              Verify
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleDecision(s.id, "REJECTED")}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 cursor-pointer"
                            >
                              <XCircle className="h-3 w-3" />
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Processed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
