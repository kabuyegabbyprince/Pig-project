"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  Loader2,
  ShieldCheck,
  Smartphone,
  X,
  XCircle,
} from "lucide-react";
import {
  rejectMemberQualificationPayment,
  verifyMemberQualificationPayment,
} from "@/app/actions/livestock-finance";
import type { SerializedMemberPaymentRecord } from "@/lib/finance-types";
import { formatRwf } from "@/lib/format-rwf";

type StatusFilter = "ALL" | "PENDING" | "VERIFIED" | "REJECTED";

function formatShortDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function MemberPaymentsApprovalCard({
  memberPayments,
}: {
  memberPayments: SerializedMemberPaymentRecord[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("PENDING");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const pendingCount = useMemo(
    () => memberPayments.filter((p) => p.status === "PENDING").length,
    [memberPayments]
  );
  const verifiedCount = useMemo(
    () => memberPayments.filter((p) => p.status === "VERIFIED").length,
    [memberPayments]
  );
  const rejectedCount = useMemo(
    () => memberPayments.filter((p) => p.status === "REJECTED").length,
    [memberPayments]
  );

  const visiblePayments = useMemo(() => {
    const activeFilter =
      statusFilter === "PENDING" && pendingCount === 0 && memberPayments.length > 0
        ? "ALL"
        : statusFilter;
    if (activeFilter === "ALL") return memberPayments;
    return memberPayments.filter((p) => p.status === activeFilter);
  }, [memberPayments, statusFilter, pendingCount]);

  const handleApprove = (pm: SerializedMemberPaymentRecord) => {
    setError("");
    setSuccess("");
    const fd = new FormData();
    fd.append("paymentId", pm.id);
    fd.append("memberId", pm.memberId);
    fd.append("cooperativeId", pm.cooperativeId);
    fd.append("momoReference", pm.momoReference);

    startTransition(async () => {
      const res = await verifyMemberQualificationPayment(fd);
      if (!res.success) {
        setError(res.error || "Could not verify payment.");
        return;
      }
      setSuccess(
        `Approved ${pm.memberName} (${formatRwf(pm.totalAmount)} · MoMo ${pm.momoReference}). Cell Manager ${
          pm.cellManagerName || ""
        } can now distribute their pig.`
      );
      router.refresh();
    });
  };

  const handleReject = (pm: SerializedMemberPaymentRecord) => {
    setError("");
    setSuccess("");
    const fd = new FormData();
    fd.append("paymentId", pm.id);
    fd.append("rejectionReason", rejectionReason);

    startTransition(async () => {
      const res = await rejectMemberQualificationPayment(fd);
      if (!res.success) {
        setError(res.error || "Could not reject payment submission.");
        return;
      }
      setRejectingId(null);
      setRejectionReason("");
      setSuccess(`Rejected MoMo payment submission for ${pm.memberName}. Cell Manager has been notified.`);
      router.refresh();
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#FF8A00] shrink-0">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-[#101827]">
                Cooperative Member Qualification Payments (16,000 + 2,800 RWF)
              </h2>
              {pendingCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                  <Clock className="h-3 w-3" />
                  {pendingCount} Awaiting Approval
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Cell Managers submit cooperative members showing MoMo receipts on-site. Manually verify the MoMo receipt and approve before pig handover is unlocked.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { key: "PENDING", label: `Pending (${pendingCount})` },
              { key: "VERIFIED", label: `Approved (${verifiedCount})` },
              { key: "REJECTED", label: `Rejected (${rejectedCount})` },
              { key: "ALL", label: `All (${memberPayments.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                statusFilter === tab.key
                  ? "bg-[#101827] text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-[#FF8A00]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mx-5 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-800 flex items-center justify-between gap-2">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} className="cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="mx-5 mt-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-xs font-medium text-[#101827] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#FF8A00] shrink-0" />
            <span>{success}</span>
          </div>
          <button type="button" onClick={() => setSuccess("")} className="cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
          <thead className="bg-slate-50/70 uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Member &amp; Cooperative</th>
              <th className="px-4 py-3">Sent By (Cell Manager)</th>
              <th className="px-4 py-3">2-Fee Breakdown</th>
              <th className="px-4 py-3">MoMo Reference &amp; Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Manual Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white text-[#101827]">
            {visiblePayments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                  {memberPayments.length === 0
                    ? "No cooperative member qualification payments submitted yet."
                    : `No ${statusFilter.toLowerCase()} member payment submissions.`}
                </td>
              </tr>
            ) : (
              visiblePayments.map((pm) => (
                <tr key={pm.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <p className="font-bold text-[#101827]">{pm.memberName}</p>
                    <p className="text-[11px] text-slate-500">
                      {pm.cooperativeName}
                      {pm.memberEmail ? ` · ${pm.memberEmail}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-medium">
                    {pm.cellManagerName || "Cell Manager"}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-[#101827]">{formatRwf(pm.totalAmount)}</p>
                    <p className="text-[11px] text-slate-500">
                      {formatRwf(pm.pigValueFee)} pig + {formatRwf(pm.taxFee)} tax
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-mono font-bold text-[#101827]">{pm.momoReference}</p>
                    <p className="text-[11px] text-slate-500">{formatShortDate(pm.createdAt)}</p>
                  </td>
                  <td className="px-4 py-3">
                    {pm.status === "VERIFIED" ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                        <ShieldCheck className="h-3 w-3" />
                        VERIFIED
                      </span>
                    ) : pm.status === "REJECTED" ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                        <XCircle className="h-3 w-3" />
                        REJECTED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                        <Clock className="h-3 w-3" />
                        PENDING VERIFICATION
                      </span>
                    )}
                    {pm.verifiedByName && (
                      <p className="mt-0.5 text-[11px] text-slate-500">By: {pm.verifiedByName}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {rejectingId === pm.id ? (
                      <div className="flex flex-col items-end gap-1.5">
                        <input
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Reason (optional)"
                          className="w-48 rounded-lg border border-rose-200 px-2.5 py-1 text-xs text-[#101827]"
                        />
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleReject(pm)}
                            className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-rose-700 cursor-pointer"
                          >
                            Confirm Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingId(null);
                              setRejectionReason("");
                            }}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : pm.status === "VERIFIED" ? (
                      <span className="text-[11px] font-semibold text-emerald-700">
                        Pig Handover Unlocked
                      </span>
                    ) : (
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleApprove(pm)}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#101827] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#1f2937] disabled:opacity-60 cursor-pointer"
                        >
                          {isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin text-[#FF8A00]" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3 text-[#FF8A00]" />
                          )}
                          Verify &amp; Approve
                        </button>
                        {pm.status !== "REJECTED" && (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => setRejectingId(pm.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer"
                          >
                            <XCircle className="h-3 w-3" />
                            Reject
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
