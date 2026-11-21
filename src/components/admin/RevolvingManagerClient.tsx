"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, BellRing, CheckCircle2, Loader2, RefreshCw, ShoppingBag, Users } from "lucide-react";
import { format } from "date-fns";
import {
  allocateClearedPiglet,
  checkOverdueRevolvingCycles,
  type SerializedCycleRow,
  type SerializedReturnedPigletStock,
  type SerializedWaitingBeneficiary,
} from "@/app/actions/revolving";

export function RevolvingManagerClient({
  cycles,
  clearedStock,
  waitingBeneficiaries,
}: {
  cycles: SerializedCycleRow[];
  clearedStock: SerializedReturnedPigletStock[];
  waitingBeneficiaries: SerializedWaitingBeneficiary[];
}) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [destination, setDestination] = useState<"BENEFICIARY" | "ECOMMERCE">("BENEFICIARY");

  const handleOverdueScan = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await checkOverdueRevolvingCycles();
      if (res.success) {
        setFeedback({
          type: "ok",
          text:
            res.updatedCount === 0
              ? "All active revolving cycles are within their due window."
              : `Marked ${res.updatedCount} cycle(s) OVERDUE and notified ${res.notifiedUsers} staff account(s).`,
        });
      } else {
        setFeedback({ type: "err", text: res.error || "Check failed." });
      }
    });
  };

  const handleAllocate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await allocateClearedPiglet(formData);
      if (res.success) {
        setFeedback({ type: "ok", text: res.message || "Allocation completed." });
      } else {
        setFeedback({ type: "err", text: res.error || "Allocation failed." });
      }
    });
  };

  const overdueCount = cycles.filter((c) => c.status === "OVERDUE" || c.isPastDue).length;

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs font-medium ${
            feedback.type === "ok"
              ? "border-orange-200 bg-orange-50 text-[#101827]"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Overdue Alert Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-[#FF8A00]">
            <BellRing className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#101827]">
              Due-Date Enforcement &amp; Cell Manager Notifications
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {overdueCount} cycle(s) currently overdue or past due date. Trigger scan to transition past-due cycles to OVERDUE and alert Cell Managers &amp; Super Admins.
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={handleOverdueScan}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#101827] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#1f2937] disabled:opacity-50 transition"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FF8A00]" /> : <RefreshCw className="h-3.5 w-3.5 text-[#FF8A00]" />}
          <span>Check Overdue Cycles</span>
        </button>
      </div>

      {/* Allocate Vet-Cleared Returned Piglets */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-[#FF8A00]">
            <CheckCircle2 className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Allocate Vet-Cleared Piglets ({clearedStock.length} Ready)
            </h2>
            <p className="text-xs text-slate-500">
              Assign vet-cleared returned piglets or healthy stock either to a waiting beneficiary or to the E-Commerce storefront surplus.
            </p>
          </div>
        </div>

        <form onSubmit={handleAllocate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Vet-Cleared Pig / Piglet *
            </label>
            <select
              name="pigId"
              required
              disabled={clearedStock.length === 0}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900"
            >
              <option value="">
                {clearedStock.length === 0 ? "No cleared stock available" : "-- Select Pig Tag --"}
              </option>
              {clearedStock.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.tagNumber} ({p.status}) {p.source ? `- ${p.source.slice(0, 28)}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Allocation Target *
            </label>
            <select
              name="destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value as "BENEFICIARY" | "ECOMMERCE")}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900"
            >
              <option value="BENEFICIARY">Next Waiting Beneficiary</option>
              <option value="ECOMMERCE">E-Commerce Storefront Surplus</option>
            </select>
          </div>

          {destination === "BENEFICIARY" ? (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Target Beneficiary *
              </label>
              <select
                name="beneficiaryId"
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900"
              >
                <option value="">-- Select Family --</option>
                {waitingBeneficiaries.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.fullName} ({b.beneficiaryNumber}) [{b.status}]
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Listing Price (RWF) *
                </label>
                <input
                  name="price"
                  type="number"
                  min="1"
                  required
                  placeholder="45000"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Product Title (Optional)
                </label>
                <input
                  name="productName"
                  placeholder="Healthy Revolving Piglet"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900"
                />
              </div>
            </>
          )}

          <div>
            <button
              type="submit"
              disabled={isPending || clearedStock.length === 0}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#101827] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1f2937] disabled:opacity-50 transition"
            >
              {destination === "BENEFICIARY" ? (
                <Users className="h-3.5 w-3.5 text-[#FF8A00]" />
              ) : (
                <ShoppingBag className="h-3.5 w-3.5 text-[#FF8A00]" />
              )}
              <span>Allocate Now</span>
            </button>
          </div>
        </form>
      </section>

      {/* Revolving Cycles Table */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
        <h2 className="text-base font-bold text-[#101827] mb-3">Revolving Fund Cycles</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-2.5">Beneficiary</th>
                <th className="px-3 py-2.5">Cycle</th>
                <th className="px-3 py-2.5">Start Date</th>
                <th className="px-3 py-2.5">Due Date</th>
                <th className="px-3 py-2.5">Progress</th>
                <th className="px-3 py-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cycles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                    No revolving fund cycles recorded yet.
                  </td>
                </tr>
              ) : (
                cycles.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-slate-900">{c.beneficiaryName}</p>
                      <p className="text-[11px] text-slate-500">{c.beneficiaryNumber}</p>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-700">Cycle #{c.cycleNumber}</td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {format(new Date(c.startDate), "MMM d, yyyy")}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {c.dueDate ? format(new Date(c.dueDate), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-slate-800">
                      {Math.min(c.returnedCount, c.expectedReturn)} / {c.expectedReturn} piglets
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          c.status === "COMPLETED"
                            ? "bg-orange-50 text-[#FF8A00]"
                            : c.status === "OVERDUE" || c.isPastDue
                              ? "bg-rose-50 text-rose-700"
                              : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {(c.status === "OVERDUE" || c.isPastDue) && (
                          <AlertTriangle className="h-3 w-3" />
                        )}
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
