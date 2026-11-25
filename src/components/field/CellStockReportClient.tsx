"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ClipboardList, Loader2, PiggyBank, Send } from "lucide-react";
import { submitCooperativeStockReport, type SerializedClearedPigOption, type SerializedStockReport } from "@/app/actions/ecommerce";
import { formatRwf } from "@/lib/format-rwf";

export function CellStockReportClient({
  reports,
  clearedPigs,
  tableMissing,
  defaultCellName = "",
}: {
  reports: SerializedStockReport[];
  clearedPigs: SerializedClearedPigOption[];
  tableMissing: boolean;
  defaultCellName?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [cooperativeOwnerName, setCooperativeOwnerName] = useState("");
  const [cooperativeOwnerRole, setCooperativeOwnerRole] = useState("COOPERATIVE_MEMBER");
  const [cellName, setCellName] = useState(defaultCellName);
  const [animalTitle, setAnimalTitle] = useState("");
  const [pigCount, setPigCount] = useState("1");
  const [estimatedWeightKg, setEstimatedWeightKg] = useState("");
  const [suggestedPrice, setSuggestedPrice] = useState("");
  const [pigId, setPigId] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const fd = new FormData();
    fd.append("cooperativeOwnerName", cooperativeOwnerName);
    fd.append("cooperativeOwnerRole", cooperativeOwnerRole);
    fd.append("cellName", cellName);
    fd.append("animalTitle", animalTitle);
    fd.append("pigCount", pigCount);
    fd.append("estimatedWeightKg", estimatedWeightKg);
    fd.append("suggestedPrice", suggestedPrice);
    fd.append("pigId", pigId);
    fd.append("notes", notes);

    startTransition(async () => {
      const res = await submitCooperativeStockReport(fd);
      if (!res.success) {
        setError(res.error || "Could not submit animal stock report.");
        return;
      }
      setSuccess(
        "Animal stock reported! Project Manager (Gebyian) has been notified to set official stock, price, and discounts on Gebyian Network."
      );
      setCooperativeOwnerName("");
      setAnimalTitle("");
      setPigCount("1");
      setEstimatedWeightKg("");
      setSuggestedPrice("");
      setPigId("");
      setNotes("");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FF8A00]">
          Part 1 · Livestock Market Intake
        </p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-[#101827]">
          Report Cooperative Animal Stock to Sell
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Submitted exclusively by Cell Managers when Cooperative Members or Cooperative Leaders have pigs ready to sell
          (cooperative members &amp; admins do not submit directly). Project Manager (Gebyian) reviews your report and sets official stock, bargainable price &amp; discounts on Gebyian Website.
        </p>
      </div>

      {tableMissing && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-[#FF8A00] shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Database Migration Required</p>
            <p className="text-xs mt-1">
              Execute <span className="font-mono font-semibold">update.sql</span> in your Supabase SQL Editor to
              enable cooperative stock reporting tables.
            </p>
          </div>
        </div>
      )}

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

      {/* Report Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4"
      >
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-[#FF8A00]">
            <PiggyBank className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#101827]">New Cooperative Animal Stock Report</h2>
            <p className="text-xs text-slate-500">
              Submitted directly to Project Manager (Gebyian) &amp; Super Admin for Gebyian Network.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Cooperative Owner Name *
            </label>
            <input
              required
              value={cooperativeOwnerName}
              onChange={(e) => setCooperativeOwnerName(e.target.value)}
              placeholder="e.g. Jean Baptiste Niyonzima"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Owner Cooperative Role *
            </label>
            <select
              value={cooperativeOwnerRole}
              onChange={(e) => setCooperativeOwnerRole(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
            >
              <option value="COOPERATIVE_MEMBER">Cooperative Member / Farmer</option>
              <option value="COOPERATIVE_LEADER">Cooperative Leader</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Cell / Akagari *
            </label>
            <input
              required
              value={cellName}
              onChange={(e) => setCellName(e.target.value)}
              placeholder="e.g. Rugando Cell"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Animal Title / Breed Summary *
            </label>
            <input
              required
              value={animalTitle}
              onChange={(e) => setAnimalTitle(e.target.value)}
              placeholder="e.g. Healthy Large White Grower Pigs (Ready for Sale)"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Number of Animals *
            </label>
            <input
              required
              type="number"
              min="1"
              value={pigCount}
              onChange={(e) => setPigCount(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Est. Average Weight (kg)
            </label>
            <input
              type="number"
              step="0.1"
              min="1"
              value={estimatedWeightKg}
              onChange={(e) => setEstimatedWeightKg(e.target.value)}
              placeholder="e.g. 65"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Suggested Price (RWF)
            </label>
            <input
              type="number"
              min="0"
              value={suggestedPrice}
              onChange={(e) => setSuggestedPrice(e.target.value)}
              placeholder="e.g. 120000"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Vet-Cleared Tag (Optional)
            </label>
            <select
              value={pigId}
              onChange={(e) => setPigId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
            >
              <option value="">-- Optional Herd Tag --</option>
              {clearedPigs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.tagNumber} {p.breed ? `(${p.breed})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
            Health &amp; Readiness Notes
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Vaccination status, pickup instructions, cooperative batch info..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={isPending || tableMissing}
          className="inline-flex items-center gap-2 rounded-xl bg-[#101827] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1f2937] disabled:opacity-50 cursor-pointer transition"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin text-[#FF8A00]" /> : <Send className="h-4 w-4 text-[#FF8A00]" />}
          <span>{isPending ? "Submitting..." : "Send Stock Report to Project Manager (Gebyian)"}</span>
        </button>
      </form>

      {/* Submitted Reports History */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-[#FF8A00]" />
            <h2 className="text-sm font-bold text-[#101827]">
              Submitted Cooperative Stock Reports ({reports.length})
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Animal Listing</th>
                <th className="px-4 py-3">Cooperative Owner</th>
                <th className="px-4 py-3">Cell</th>
                <th className="px-4 py-3">Qty / Weight</th>
                <th className="px-4 py-3">Suggested Price</th>
                <th className="px-4 py-3">Manager Status</th>
                <th className="px-4 py-3">Reported</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-[#101827]">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No cooperative animal stock reports submitted yet.
                  </td>
                </tr>
              ) : (
                reports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[#101827]">{r.animalTitle}</p>
                      {r.sourcePigTag && (
                        <p className="text-[11px] font-semibold text-[#FF8A00]">Tag: {r.sourcePigTag}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{r.cooperativeOwnerName}</p>
                      <p className="text-[11px] text-slate-500">
                        {r.cooperativeOwnerRole.replace(/_/g, " ")}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.cellName}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold">{r.pigCount}</span> animals
                      {r.estimatedWeightKg && (
                        <span className="block text-[11px] text-slate-500">~{r.estimatedWeightKg} kg</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {r.suggestedPrice ? formatRwf(r.suggestedPrice) : "Manager Sets"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold ${
                          r.status === "LISTED"
                            ? "bg-slate-100 text-[#101827]"
                            : r.status === "REJECTED"
                            ? "bg-rose-50 text-rose-700"
                            : "bg-orange-50 text-[#FF8A00]"
                        }`}
                      >
                        {r.status === "PENDING"
                          ? "Awaiting Manager"
                          : r.status === "LISTED"
                          ? "Listed on Store"
                          : "Rejected"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(r.createdAt).toLocaleDateString()}
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
