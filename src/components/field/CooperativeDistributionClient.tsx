"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  PiggyBank,
  Save,
  Send,
  ShieldCheck,
  Smartphone,
  XCircle,
} from "lucide-react";
import {
  distributePigToCooperativeMember,
  submitMemberPaymentForApproval,
  type CooperativesWorkspaceData,
} from "@/app/actions/cooperative";
import { formatRwf } from "@/lib/format-rwf";
import { Role } from "@prisma/client";

function formatShortDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function CooperativeDistributionClient({
  data,
  momoMerchantCode,
}: {
  data: CooperativesWorkspaceData;
  momoMerchantCode: string;
}) {
  const router = useRouter();
  const [isSubmittingPayment, startPaymentTransition] = useTransition();
  const [isDistributing, startDistTransition] = useTransition();

  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState("");
  const [distError, setDistError] = useState("");
  const [distSuccess, setDistSuccess] = useState("");

  // Step 1: Submit Member Payment for Finance Approval
  const [payCoopId, setPayCoopId] = useState(data.cooperatives[0]?.id ?? "");
  const payCoop = data.cooperatives.find((c) => c.id === payCoopId);
  const [payMemberId, setPayMemberId] = useState(payCoop?.members[0]?.id ?? "");
  const [momoReference, setMomoReference] = useState("");

  // Step 2: Distribute Vet-Cleared Pig to Approved Member
  const [distCoopId, setDistCoopId] = useState(data.cooperatives[0]?.id ?? "");
  const distCoop = data.cooperatives.find((c) => c.id === distCoopId);
  const [distMemberId, setDistMemberId] = useState("");
  const [selectedPigId, setSelectedPigId] = useState(data.availableStockPigs[0]?.id ?? "");
  const [notes, setNotes] = useState("");

  const paymentByMemberId = useMemo(() => {
    const map = new Map<string, (typeof data.memberPayments)[number]>();
    for (const pm of data.memberPayments) {
      if (!map.has(pm.memberId)) {
        map.set(pm.memberId, pm);
      }
    }
    return map;
  }, [data.memberPayments]);

  const approvedMembersInSelectedCoop = useMemo(() => {
    return (distCoop?.members ?? []).filter((m) => {
      const pm = paymentByMemberId.get(m.id);
      return pm && pm.cooperativeId === distCoopId && pm.status === "VERIFIED";
    });
  }, [distCoop, distCoopId, paymentByMemberId]);

  const handlePayCoopChange = (coopId: string) => {
    setPayCoopId(coopId);
    const coop = data.cooperatives.find((c) => c.id === coopId);
    setPayMemberId(coop?.members[0]?.id ?? "");
  };

  const handleDistCoopChange = (coopId: string) => {
    setDistCoopId(coopId);
    setDistMemberId("");
  };

  const handleSubmitPaymentForApproval = (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError("");
    setPaymentSuccess("");

    if (!payCoopId || !payMemberId || !momoReference.trim()) {
      setPaymentError("Select a cooperative, cooperative member, and enter the MoMo payment reference.");
      return;
    }

    const fd = new FormData();
    fd.append("cooperativeId", payCoopId);
    fd.append("memberId", payMemberId);
    fd.append("momoReference", momoReference.trim());

    startPaymentTransition(async () => {
      const res = await submitMemberPaymentForApproval(fd);
      if (!res.success) {
        setPaymentError(res.error || "Could not submit member payment for approval.");
        return;
      }
      setPaymentSuccess(
        "Member added to the Finance awaiting-approval list! Once the Finance Officer manually verifies and approves the 18,800 RWF receipt, Step 2 (Pig Distribution) will unlock for that member."
      );
      setMomoReference("");
      router.refresh();
    });
  };

  const handleDistributeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDistError("");
    setDistSuccess("");

    if (!selectedPigId || !distCoopId || !distMemberId) {
      setDistError("Select a vet-cleared pig, cooperative, and Finance-approved member.");
      return;
    }

    const fd = new FormData();
    fd.append("pigId", selectedPigId);
    fd.append("cooperativeId", distCoopId);
    fd.append("memberId", distMemberId);
    fd.append("notes", notes);

    startDistTransition(async () => {
      const res = await distributePigToCooperativeMember(fd);
      if (!res.success) {
        setDistError(res.error || "Could not complete pig distribution.");
        return;
      }
      setDistSuccess(
        "Pig distributed successfully to Finance-approved cooperative member! Revolving obligation (minimum 2 piglets) recorded."
      );
      setNotes("");
      setDistMemberId("");
      setSelectedPigId("");
      router.push("/dashboard/field/distributions");
      router.refresh();
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/field/distributions" className="text-slate-500 hover:text-[#101827]">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FF8A00]">
            Cell Manager Cooperative Workflow
          </p>
          <h1 className="text-2xl font-bold text-[#101827]">
            Payment Approval Submission &amp; Pig Distribution
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            You only manage cooperatives and members you added. Eligible pig receivers (beneficiaries) are Cooperative Members — including Cooperative Leaders — who pay 16,000 RWF (pig value) + 2,800 RWF (tax) = 18,800 RWF, show proof on-site, get approved manually by Finance Officer, then receive their pig from you.
          </p>
        </div>
      </div>

      {/* MoMo Merchant Code Notice */}
      <div className="rounded-2xl border border-orange-200 bg-orange-50/60 p-4 flex items-start gap-3">
        <Smartphone className="h-5 w-5 text-[#FF8A00] shrink-0 mt-0.5" />
        <div className="text-xs text-[#101827] space-y-1">
          <p className="font-bold">Finance Officer MoMo Merchant Code for Member Qualification</p>
          <p>
            Member must pay <span className="font-bold">{formatRwf(18800)}</span> (16,000 RWF pig value fee + 2,800 RWF tax) to MoMo Code:{" "}
            <span className="font-mono font-bold text-[#FF8A00]">{momoMerchantCode}</span> and show their SMS receipt on-site.
          </p>
        </div>
      </div>

      {data.cooperatives.length === 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span>
            You have not created any cooperatives yet. Create your cooperative and add members first before submitting payments or distributing pigs.
          </span>
          <Link
            href="/dashboard/field/cooperative"
            className="inline-flex items-center justify-center rounded-xl bg-[#101827] px-4 py-2 font-semibold text-white shrink-0"
          >
            Go to Cooperatives
          </Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* STEP 1: SUBMIT TO FINANCE AWAITING-APPROVAL LIST */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
          <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-[#FF8A00] font-bold text-sm shrink-0">
              1
            </div>
            <div>
              <h2 className="text-base font-bold text-[#101827]">
                Add Member Payment to Finance Queue
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect the member&apos;s MoMo receipt on-site and submit them to the Finance Officer for manual approval.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmitPaymentForApproval} className="space-y-4">
            {paymentError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800">
                {paymentError}
              </div>
            )}

            {paymentSuccess && (
              <div className="rounded-xl border border-orange-200 bg-orange-50 px-3.5 py-2.5 text-xs font-medium text-[#101827] flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#FF8A00] shrink-0 mt-0.5" />
                <span>{paymentSuccess}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                My Cooperative *
              </label>
              <select
                required
                value={payCoopId}
                onChange={(e) => handlePayCoopChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
              >
                <option value="">-- Select Cooperative --</option>
                {data.cooperatives.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.cellName}) — {c.memberCount} members
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Cooperative Member or Leader (Beneficiary) *
              </label>
              <select
                required
                value={payMemberId}
                onChange={(e) => setPayMemberId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
              >
                <option value="">-- Select Cooperative Member / Leader --</option>
                {(payCoop?.members ?? []).map((m) => {
                  const pm = paymentByMemberId.get(m.id);
                  const badge = pm ? ` [${pm.status}]` : " [Not Submitted]";
                  const roleTag =
                    m.role === Role.COOPERATIVE_LEADER ? " [Cooperative Leader]" : " [Member]";
                  return (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.email}){roleTag}
                      {badge}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                MoMo Transaction Reference (16,000 + 2,800 RWF) *
              </label>
              <input
                required
                value={momoReference}
                onChange={(e) => setMomoReference(e.target.value)}
                placeholder="e.g. MOMO-2026-984321"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono text-[#101827] focus:border-[#FF8A00] focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Enter the SMS transaction ID shown on-site by the member for Finance verification.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmittingPayment || data.cooperatives.length === 0}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF8A00] px-5 py-2.5 text-sm font-bold text-[#101827] hover:bg-[#e57c00] disabled:opacity-60 transition cursor-pointer"
            >
              {isSubmittingPayment ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span>Add to Finance Approval List (Pending)</span>
            </button>
          </form>
        </div>

        {/* STEP 2: DISTRIBUTE VET-CLEARED PIG TO APPROVED MEMBER ONLY */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
          <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#101827] text-[#FF8A00] font-bold text-sm shrink-0">
              2
            </div>
            <div>
              <h2 className="text-base font-bold text-[#101827]">
                Distribute Pig to Approved Member
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Only members verified and approved by the Finance Officer appear ready for pig handover.
              </p>
            </div>
          </div>

          <form onSubmit={handleDistributeSubmit} className="space-y-4">
            {distError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800">
                {distError}
              </div>
            )}

            {distSuccess && (
              <div className="rounded-xl border border-orange-200 bg-orange-50 px-3.5 py-2.5 text-xs font-medium text-[#101827] flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#FF8A00] shrink-0 mt-0.5" />
                <span>{distSuccess}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Vet-Cleared Stock Pig ({data.availableStockPigs.length} Ready) *
              </label>
              <select
                required
                value={selectedPigId}
                onChange={(e) => setSelectedPigId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
              >
                <option value="">-- Select Vet-Cleared Stock Pig --</option>
                {data.availableStockPigs.map((a) => (
                  <option key={a.id} value={a.id}>
                    Tag: {a.tagNumber} · {a.sex || "Sex: N/A"} · {a.healthStatus} [Vet Cleared]
                  </option>
                ))}
              </select>
              {data.availableStockPigs.length === 0 && (
                <p className="mt-1 text-[11px] text-amber-700">
                  No unallocated vet-cleared pigs are currently in stock. Finance Officer must stock in pigs (and Vet clear them) first.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                My Cooperative *
              </label>
              <select
                required
                value={distCoopId}
                onChange={(e) => handleDistCoopChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
              >
                <option value="">-- Select Cooperative --</option>
                {data.cooperatives.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.cellName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Finance-Approved Beneficiary — Member / Leader ({approvedMembersInSelectedCoop.length} Eligible) *
              </label>
              <select
                required
                value={distMemberId}
                onChange={(e) => setDistMemberId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
              >
                <option value="">-- Select Finance-Approved Member or Leader --</option>
                {approvedMembersInSelectedCoop.map((m) => {
                  const pm = paymentByMemberId.get(m.id);
                  const roleTag =
                    m.role === Role.COOPERATIVE_LEADER ? " [Cooperative Leader]" : " [Member]";
                  return (
                    <option key={m.id} value={m.id}>
                      {m.name}{roleTag} · Verified MoMo: {pm?.momoReference}
                    </option>
                  );
                })}
              </select>
              {approvedMembersInSelectedCoop.length === 0 && (
                <p className="mt-1 text-[11px] text-slate-500">
                  No members in this cooperative are Finance-verified yet. Submit their MoMo reference in Step 1 and wait for Finance Officer approval.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Handover Notes / Instructions
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Pen conditions or revolving return reminder..."
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={
                isDistributing ||
                data.availableStockPigs.length === 0 ||
                approvedMembersInSelectedCoop.length === 0
              }
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#101827] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1f2937] disabled:opacity-50 transition cursor-pointer"
            >
              {isDistributing ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#FF8A00]" />
              ) : (
                <Save className="h-4 w-4 text-[#FF8A00]" />
              )}
              <span>Distribute Pig &amp; Record Revolving Cycle</span>
            </button>
          </form>
        </div>
      </div>

      {/* LIVE AWAITING-APPROVAL & VERIFIED STATUS TABLE */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PiggyBank className="h-4 w-4 text-[#FF8A00]" />
            <h2 className="text-sm font-bold text-[#101827]">
              Submitted Member Payments Status ({data.memberPayments.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500">Scoped to cooperatives you created</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50/70 uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Cooperative</th>
                <th className="px-4 py-3">Fee (Pig + Tax)</th>
                <th className="px-4 py-3">MoMo Reference</th>
                <th className="px-4 py-3">Finance Approval Status</th>
                <th className="px-4 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-[#101827]">
              {data.memberPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                    No members submitted to Finance approval list yet. Use Step 1 above after inspecting a member&apos;s MoMo payment.
                  </td>
                </tr>
              ) : (
                data.memberPayments.map((pm) => (
                  <tr key={pm.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <p className="font-bold">{pm.memberName}</p>
                      <p className="text-[11px] text-slate-500">{pm.memberEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{pm.cooperativeName}</td>
                    <td className="px-4 py-3 font-semibold">
                      {formatRwf(pm.totalAmount)}
                      <span className="block text-[11px] font-normal text-slate-500">
                        {formatRwf(pm.pigValueFee)} + {formatRwf(pm.taxFee)} tax
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold">{pm.momoReference}</td>
                    <td className="px-4 py-3">
                      {pm.status === "VERIFIED" ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                          <ShieldCheck className="h-3 w-3" />
                          Approved — Ready for Pig
                        </span>
                      ) : pm.status === "REJECTED" ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                          <XCircle className="h-3 w-3" />
                          Rejected — Re-submit
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                          <Clock className="h-3 w-3" />
                          Awaiting Finance Officer
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatShortDate(pm.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
