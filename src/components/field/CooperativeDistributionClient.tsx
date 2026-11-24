"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, PiggyBank, Save, Smartphone, ShieldCheck } from "lucide-react";
import { distributePigToCooperativeMember, type CooperativesWorkspaceData } from "@/app/actions/cooperative";
import { formatRwf } from "@/lib/format-rwf";
import { PigHealthStatus, PigStatus, Role } from "@prisma/client";


export function CooperativeDistributionClient({
  data,
  momoMerchantCode,
}: {
  data: CooperativesWorkspaceData;
  momoMerchantCode: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedCoopId, setSelectedCoopId] = useState(data.cooperatives[0]?.id ?? "");
  const selectedCoop = data.cooperatives.find((c) => c.id === selectedCoopId);

  const [selectedMemberId, setSelectedMemberId] = useState(selectedCoop?.members[0]?.id ?? "");
  const [selectedPigId, setSelectedPigId] = useState("");
  const [momoReference, setMomoReference] = useState("");
  const [notes, setNotes] = useState("");

  const handleCoopChange = (coopId: string) => {
    setSelectedCoopId(coopId);
    const coop = data.cooperatives.find((c) => c.id === coopId);
    setSelectedMemberId(coop?.members[0]?.id ?? "");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedPigId || !selectedCoopId || !selectedMemberId) {
      setError("Please select a pig, cooperative, and cooperative member.");
      return;
    }

    const fd = new FormData();
    fd.append("pigId", selectedPigId);
    fd.append("cooperativeId", selectedCoopId);
    fd.append("memberId", selectedMemberId);
    fd.append("momoReference", momoReference);
    fd.append("notes", notes);

    startTransition(async () => {
      const res = await distributePigToCooperativeMember(fd);
      if (!res.success) {
        setError(res.error || "Could not complete pig distribution.");
        return;
      }
      setSuccess("Pig distributed successfully to cooperative member! Revolving return obligation (min 2 piglets) recorded.");
      setMomoReference("");
      setNotes("");
      router.push("/dashboard/field/distributions");
      router.refresh();
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/field/distributions" className="text-slate-500 hover:text-[#101827]">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#101827]">Distribute Pig to Cooperative Member</h1>
          <p className="mt-1 text-sm text-slate-600">
            Select a vet-cleared pig from stock, choose the cooperative and member. Members must pay 16,000 RWF (pig value) + 2,800 RWF tax (18,800 RWF total) to the Finance Officer MoMo merchant code.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-[#101827] flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#FF8A00] shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* MoMo Merchant Code Notice */}
          <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4 flex items-start gap-3">
            <Smartphone className="h-5 w-5 text-[#FF8A00] shrink-0 mt-0.5" />
            <div className="text-xs text-[#101827] space-y-1">
              <p className="font-bold">Finance Officer MoMo Merchant Code for Payment Qualification</p>
              <p>
                Send <span className="font-bold">{formatRwf(18800)}</span> (16,000 RWF pig value + 2,800 RWF tax) to MoMo Code:{" "}
                <span className="font-mono font-bold text-[#FF8A00]">{momoMerchantCode}</span>
              </p>
            </div>
          </div>

          {/* Select Pig from Vet-Cleared Stock */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Select Vet-Cleared Pig from Stock *
            </label>
            <select
              required
              value={selectedPigId}
              onChange={(e) => setSelectedPigId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
            >
              <option value="">-- Select Available Healthy Pig --</option>
              {data.animals
                .filter((a) => a.healthStatus === PigHealthStatus.HEALTHY && a.status === PigStatus.REGISTERED)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    Tag: {a.tagNumber} ({a.breed || "Standard"} · {a.currentWeight ? `${a.currentWeight}kg` : "Weight N/A"})
                  </option>
                ))}
            </select>
          </div>

          {/* Select Cooperative */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Select Cooperative *
            </label>
            <select
              required
              value={selectedCoopId}
              onChange={(e) => handleCoopChange(e.target.value)}
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

          {/* Select Cooperative Member */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Select Cooperative Member *
            </label>
            <select
              required
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
            >
              <option value="">-- Select Cooperative Member --</option>
              {(selectedCoop?.members ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.email}) {m.role === Role.COOPERATIVE_LEADER ? "[Cooperative Manager]" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* MoMo Transaction Reference */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              MoMo Payment Reference Code (18,800 RWF Paid) *
            </label>
            <input
              required
              value={momoReference}
              onChange={(e) => setMomoReference(e.target.value)}
              placeholder="e.g. MOMO-2026-984321"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono text-[#101827] focus:border-[#FF8A00] focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">
              Enter the MoMo SMS reference confirming payment of 16,000 RWF + 2,800 RWF tax.
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Handover Notes / Instructions
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Conditions of handover, pen location, or revolving agreement notes..."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Link
              href="/dashboard/field/distributions"
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-[#101827] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#1f2937] disabled:opacity-60 transition cursor-pointer"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin text-[#FF8A00]" /> : <Save className="h-4 w-4 text-[#FF8A00]" />}
              <span>Complete Distribution &amp; Record Revolving Obligation</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
