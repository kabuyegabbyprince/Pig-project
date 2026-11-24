"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PigHealthStatus, PigStatus } from "@prisma/client";
import {
  CheckCircle2,
  DollarSign,
  Filter,
  Loader2,
  PhoneCall,
  PiggyBank,
  PlusCircle,
  Search,
  ShieldCheck,
  Smartphone,
  Tag,
  TrendingUp,
} from "lucide-react";
import {
  financeStockInPig,
  updateFinanceMoMoMerchantCode,
  verifyMemberQualificationPayment,
} from "@/app/actions/livestock-finance";
import {
  type SerializedDistributionAuditRow,
  type SerializedFinancePigStock,
  type SerializedMemberPaymentRecord,
} from "@/lib/finance-types";
import { formatRwf } from "@/lib/format-rwf";

export function FinanceStockAndAuditClient({
  momoMerchantCode,
  stockedPigs,
  memberPayments,
  auditRows,
  tableMissing,
}: {
  momoMerchantCode: string;
  stockedPigs: SerializedFinancePigStock[];
  memberPayments: SerializedMemberPaymentRecord[];
  auditRows: SerializedDistributionAuditRow[];
  tableMissing: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // MoMo Code form
  const [momoCodeInput, setMomoCodeInput] = useState(momoMerchantCode);

  // Pig Stock-in form
  const [tagNumber, setTagNumber] = useState("");
  const [pigType, setPigType] = useState("Gilt / Breeder");
  const [daysAge, setDaysAge] = useState("90");
  const [healthStatus, setHealthStatus] = useState<string>(PigHealthStatus.HEALTHY);
  const [notes, setNotes] = useState("");

  // Filters for Audit table
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCoop, setFilterCoop] = useState("ALL");

  const handleUpdateMoMo = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const fd = new FormData();
    fd.append("momoMerchantCode", momoCodeInput);

    startTransition(async () => {
      const res = await updateFinanceMoMoMerchantCode(fd);
      if (!res.success) {
        setError(res.error || "Could not update MoMo code.");
        return;
      }
      setSuccess("MoMo Merchant Code updated successfully!");
      router.refresh();
    });
  };

  const handleStockIn = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const fd = new FormData();
    fd.append("tagNumber", tagNumber);
    fd.append("pigType", pigType);
    fd.append("daysAge", daysAge);
    fd.append("healthStatus", healthStatus);
    fd.append("notes", notes);

    startTransition(async () => {
      const res = await financeStockInPig(fd);
      if (!res.success) {
        setError(res.error || "Could not stock in pig.");
        return;
      }
      setSuccess("Pig stocked in successfully! Veterinarian can now inspect and clear it.");
      setTagNumber("");
      setDaysAge("90");
      setNotes("");
      router.refresh();
    });
  };

  const filteredAudits = auditRows.filter((row) => {
    const matchesSearch =
      !searchTerm.trim() ||
      row.pigTag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.cellManagerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCoop = filterCoop === "ALL" || row.cooperativeName === filterCoop;
    return matchesSearch && matchesCoop;
  });

  const uniqueCoops = Array.from(new Set(auditRows.map((r) => r.cooperativeName)));

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
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

      {/* 1. MoMo Merchant Code & Pig Stock-In Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* MoMo Merchant Code Settings */}
        <form
          onSubmit={handleUpdateMoMo}
          className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4"
        >
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-[#FF8A00]">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#101827]">MoMo Merchant Code</h2>
              <p className="text-xs text-slate-500">
                Members pay 16,000 RWF (pig value) + 2,800 RWF tax (18,800 RWF total) here.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Active MoMo Merchant Code / USSD *
            </label>
            <input
              required
              value={momoCodeInput}
              onChange={(e) => setMomoCodeInput(e.target.value)}
              placeholder="*182*8*1*123456#"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono text-[#101827] focus:border-[#FF8A00] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#101827] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1f2937] transition cursor-pointer"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin text-[#FF8A00]" /> : <DollarSign className="h-4 w-4 text-[#FF8A00]" />}
            <span>Save MoMo Code</span>
          </button>
        </form>

        {/* Finance Officer Pig Stock-In Form */}
        <form
          onSubmit={handleStockIn}
          className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4"
        >
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-[#FF8A00]">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#101827]">Stock In New Pigs (Finance Intake)</h2>
              <p className="text-xs text-slate-500">
                Register incoming pigs with name/ID, type, days/age, and initial health status.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Pig ID / Tag (Optional)
              </label>
              <input
                value={tagNumber}
                onChange={(e) => setTagNumber(e.target.value)}
                placeholder="Auto: PF-RW-2026-..."
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Pig Type *
              </label>
              <input
                required
                value={pigType}
                onChange={(e) => setPigType(e.target.value)}
                placeholder="e.g. Gilt / Breeder / Weaner"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Days / Age (Days) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={daysAge}
                onChange={(e) => setDaysAge(e.target.value)}
                placeholder="90"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Initial Health Status *
              </label>
              <select
                value={healthStatus}
                onChange={(e) => setHealthStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#101827]"
              >
                <option value={PigHealthStatus.HEALTHY}>Healthy</option>
                <option value={PigHealthStatus.SICK}>Sick / Needs Vet</option>
                <option value={PigHealthStatus.UNDER_TREATMENT}>Under Treatment</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Purchase / Stock Notes
              </label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Supplier, batch reference, or purchase source..."
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-[#FF8A00] px-5 py-2.5 text-sm font-bold text-[#101827] hover:bg-[#e57c00] disabled:opacity-60 transition cursor-pointer"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PiggyBank className="h-4 w-4" />}
              <span>Stock In Pig</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. Transparency & Audit Table: Cell Manager Distribution Sign-Off */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <TrendingUp className="h-5 w-5 text-[#FF8A00]" />
            <div>
              <h2 className="text-base font-bold text-[#101827]">
                Cell Manager Distribution &amp; Sign-Off Audit Table ({filteredAudits.length})
              </h2>
              <p className="text-xs text-slate-500">
                Transparency log showing which Cell Manager signed which pig to which member.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search tag, member, manager..."
                className="rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs text-[#101827] w-56 focus:border-[#FF8A00] focus:outline-none"
              />
            </div>

            <select
              value={filterCoop}
              onChange={(e) => setFilterCoop(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-[#101827]"
            >
              <option value="ALL">All Cooperatives</option>
              {uniqueCoops.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50/70 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3">Pig Tag &amp; Type</th>
                <th className="px-5 py-3">Cell Manager (Signed)</th>
                <th className="px-5 py-3">Cooperative &amp; Member</th>
                <th className="px-5 py-3">Qualification Payment (18.8k RWF)</th>
                <th className="px-5 py-3">Distribution Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-[#101827]">
              {filteredAudits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-xs text-slate-500">
                    No pig distribution sign-off records found matching this filter.
                  </td>
                </tr>
              ) : (
                filteredAudits.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <p className="font-mono font-bold text-[#101827]">{row.pigTag}</p>
                      <p className="text-xs text-slate-500">{row.pigType || "Pig"}</p>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-semibold text-[#101827]">
                      {row.cellManagerName}
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <p className="font-bold text-[#101827]">{row.memberName}</p>
                      <p className="text-slate-500">{row.cooperativeName}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                        <ShieldCheck className="h-3 w-3" />
                        Verified (MoMo: {row.momoReference})
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {new Date(row.distributionDate).toLocaleDateString()}
                    </td>
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
