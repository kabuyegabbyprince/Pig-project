"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PigHealthStatus, PigSex, PigStatus } from "@prisma/client";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Edit3,
  Layers,
  Loader2,
  PiggyBank,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  Wallet,
  X,
} from "lucide-react";
import {
  financeDeletePig,
  financeStockInPigBatch,
  financeUpdatePig,
} from "@/app/actions/livestock-finance";
import {
  DEFAULT_PIG_PRICE_RWF,
  type SerializedFinancePigStock,
  type SerializedFinanceWorkspaceData,
} from "@/lib/finance-types";
import { formatRwf } from "@/lib/format-rwf";

type TabKey = "INVENTORY" | "RECIPIENTS" | "CYCLES";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function getHealthBadge(health: PigHealthStatus | string | null) {
  switch (health) {
    case PigHealthStatus.HEALTHY:
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case PigHealthStatus.SICK:
    case PigHealthStatus.CRITICAL:
      return "bg-rose-50 text-rose-800 border-rose-200";
    case PigHealthStatus.UNDER_TREATMENT:
      return "bg-amber-50 text-amber-800 border-amber-200";
    case PigHealthStatus.RECOVERED:
      return "bg-sky-50 text-sky-800 border-sky-200";
    case PigHealthStatus.DECEASED:
      return "bg-slate-100 text-slate-700 border-slate-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function getCycleBadge(status: string, isPastDue: boolean) {
  if (status === "COMPLETED") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (status === "CANCELLED") return "bg-slate-100 text-slate-700 border-slate-200";
  if (status === "OVERDUE" || isPastDue) return "bg-rose-50 text-rose-800 border-rose-200";
  if (status === "PARTIALLY_COMPLETED") return "bg-amber-50 text-amber-800 border-amber-200";
  return "bg-orange-50 text-[#FF8A00] border-orange-200";
}

export function FinancePigsManagerClient({
  data,
}: {
  data: SerializedFinanceWorkspaceData;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<TabKey>("INVENTORY");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Batch stock-in form state
  const [showCreateForm, setShowCreateForm] = useState(true);
  const [batchCode, setBatchCode] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState(String(DEFAULT_PIG_PRICE_RWF));
  const [tagNumber, setTagNumber] = useState("");
  const [pigType, setPigType] = useState("Gilt / Breeder");
  const [daysAge, setDaysAge] = useState("");
  const [breed, setBreed] = useState("");
  const [sex, setSex] = useState("");
  const [currentWeight, setCurrentWeight] = useState("");
  const [healthStatus, setHealthStatus] = useState<string>(PigHealthStatus.HEALTHY);
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");

  // Inventory filters
  const [pigSearch, setPigSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [healthFilter, setHealthFilter] = useState("ALL");

  // Edit modal & inline delete state
  const [editingPig, setEditingPig] = useState<SerializedFinancePigStock | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Edit form fields
  const [editTag, setEditTag] = useState("");
  const [editBatch, setEditBatch] = useState("");
  const [editPigType, setEditPigType] = useState("");
  const [editDaysAge, setEditDaysAge] = useState("");
  const [editBreed, setEditBreed] = useState("");
  const [editSex, setEditSex] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editHealth, setEditHealth] = useState<string>(PigHealthStatus.HEALTHY);
  const [editStatus, setEditStatus] = useState<string>(PigStatus.REGISTERED);
  const [editSource, setEditSource] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Recipients filters
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipientCoopFilter, setRecipientCoopFilter] = useState("ALL");

  // Cycles filters
  const [cycleSearch, setCycleSearch] = useState("");
  const [cycleStatusFilter, setCycleStatusFilter] = useState("ALL");

  const parsedQty = Math.max(1, parseInt(quantity || "1", 10) || 1);
  const parsedUnitPrice = Math.max(0, Number(unitPrice || 0) || 0);
  const liveBatchInvestment = parsedQty * parsedUnitPrice;

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const fd = new FormData();
    fd.append("batchCode", batchCode);
    fd.append("quantity", quantity);
    fd.append("unitPrice", unitPrice);
    fd.append("tagNumber", tagNumber);
    fd.append("pigType", pigType);
    fd.append("daysAge", daysAge);
    fd.append("breed", breed);
    fd.append("sex", sex);
    fd.append("currentWeight", currentWeight);
    fd.append("healthStatus", healthStatus);
    fd.append("source", source);
    fd.append("notes", notes);

    startTransition(async () => {
      const res = await financeStockInPigBatch(fd);
      if (!res.success) {
        setError(res.error || "Could not stock in pig batch.");
        return;
      }
      setSuccess(
        `Registered Batch ${res.batchCode} (${res.count} pig(s)) — Investment recorded: ${formatRwf(
          res.totalInvestment ?? 0
        )}.`
      );
      setBatchCode("");
      setQuantity("1");
      setUnitPrice(String(DEFAULT_PIG_PRICE_RWF));
      setTagNumber("");
      setDaysAge("");
      setBreed("");
      setSex("");
      setCurrentWeight("");
      setSource("");
      setNotes("");
      router.refresh();
    });
  };

  const openEditModal = (pig: SerializedFinancePigStock) => {
    setError("");
    setSuccess("");
    setEditingPig(pig);
    setEditTag(pig.tagNumber);
    setEditBatch(pig.batchCode ?? "");
    setEditPigType(pig.pigType ?? "");
    setEditDaysAge(pig.daysAge !== null ? String(pig.daysAge) : "");
    setEditBreed(pig.breed ?? "");
    setEditSex(pig.sex ?? "");
    setEditWeight(pig.currentWeight !== null ? String(pig.currentWeight) : "");
    setEditPrice(pig.purchasePrice ?? String(DEFAULT_PIG_PRICE_RWF));
    setEditHealth(pig.healthStatus);
    setEditStatus(pig.status);
    setEditSource(pig.source ?? "");
    setEditNotes(pig.notes ?? "");
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPig) return;
    setError("");
    setSuccess("");

    const fd = new FormData();
    fd.append("id", editingPig.id);
    fd.append("tagNumber", editTag);
    fd.append("batchCode", editBatch);
    fd.append("pigType", editPigType);
    fd.append("daysAge", editDaysAge);
    fd.append("breed", editBreed);
    fd.append("sex", editSex);
    fd.append("currentWeight", editWeight);
    fd.append("purchasePrice", editPrice);
    fd.append("healthStatus", editHealth);
    fd.append("status", editStatus);
    fd.append("source", editSource);
    fd.append("notes", editNotes);

    startTransition(async () => {
      const res = await financeUpdatePig(fd);
      if (!res.success) {
        setError(res.error || "Failed to update pig record.");
        return;
      }
      setSuccess(`Updated pig ${editTag}.`);
      setEditingPig(null);
      router.refresh();
    });
  };

  const handleDeletePig = (pigId: string, tag: string) => {
    setError("");
    setSuccess("");
    startTransition(async () => {
      const res = await financeDeletePig(pigId);
      if (!res.success) {
        setError(res.error || "Could not remove pig record.");
        setConfirmDeleteId(null);
        return;
      }
      setConfirmDeleteId(null);
      setSuccess(`Removed pig ${tag} from active stock.`);
      router.refresh();
    });
  };

  const filteredPigs = useMemo(() => {
    const q = pigSearch.trim().toLowerCase();
    return data.stockedPigs.filter((p) => {
      if (batchFilter !== "ALL") {
        if (batchFilter === "UNBATCHED") {
          if (p.batchCode) return false;
        } else if (p.batchCode !== batchFilter) {
          return false;
        }
      }
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      if (healthFilter !== "ALL" && p.healthStatus !== healthFilter) return false;
      if (!q) return true;
      return (
        p.tagNumber.toLowerCase().includes(q) ||
        (p.batchCode && p.batchCode.toLowerCase().includes(q)) ||
        (p.pigType && p.pigType.toLowerCase().includes(q)) ||
        (p.breed && p.breed.toLowerCase().includes(q)) ||
        (p.beneficiaryName && p.beneficiaryName.toLowerCase().includes(q)) ||
        (p.source && p.source.toLowerCase().includes(q))
      );
    });
  }, [data.stockedPigs, pigSearch, batchFilter, statusFilter, healthFilter]);

  const uniqueCoops = useMemo(() => {
    return Array.from(
      new Set(data.auditRows.map((r) => r.cooperativeName).filter(Boolean))
    ) as string[];
  }, [data.auditRows]);

  const filteredRecipients = useMemo(() => {
    const q = recipientSearch.trim().toLowerCase();
    return data.auditRows.filter((row) => {
      if (recipientCoopFilter !== "ALL" && (row.cooperativeName ?? "") !== recipientCoopFilter) {
        return false;
      }
      if (!q) return true;
      return (
        row.memberName.toLowerCase().includes(q) ||
        (row.memberPhone && row.memberPhone.toLowerCase().includes(q)) ||
        row.pigTag.toLowerCase().includes(q) ||
        (row.batchCode && row.batchCode.toLowerCase().includes(q)) ||
        (row.cellManagerName && row.cellManagerName.toLowerCase().includes(q)) ||
        (row.cooperativeName && row.cooperativeName.toLowerCase().includes(q))
      );
    });
  }, [data.auditRows, recipientSearch, recipientCoopFilter]);

  const filteredCycles = useMemo(() => {
    const q = cycleSearch.trim().toLowerCase();
    return data.pigCycles.filter((c) => {
      if (cycleStatusFilter !== "ALL" && c.status !== cycleStatusFilter) return false;
      if (!q) return true;
      return (
        c.beneficiaryName.toLowerCase().includes(q) ||
        (c.pigTag && c.pigTag.toLowerCase().includes(q)) ||
        (c.batchCode && c.batchCode.toLowerCase().includes(q)) ||
        (c.cooperativeName && c.cooperativeName.toLowerCase().includes(q))
      );
    });
  }, [data.pigCycles, cycleSearch, cycleStatusFilter]);

  return (
    <div className="space-y-6">
      {data.schemaMissing && data.schemaWarning && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900 flex items-center gap-2.5">
          <AlertTriangle className="h-4 w-4 text-[#FF8A00] shrink-0" />
          <span>{data.schemaWarning}</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 flex items-center justify-between gap-2">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="text-rose-600 hover:text-rose-900 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-[#101827] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#FF8A00] shrink-0" />
            <span>{success}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccess("")}
            className="text-slate-500 hover:text-[#101827] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* KPI Strip (Pure Live DB Data) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Total Pigs in Stock</p>
            <PiggyBank className="h-4 w-4 text-[#FF8A00]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#101827]">{data.totalPigsCount}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Collection Batches</p>
            <Boxes className="h-4 w-4 text-[#FF8A00]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#101827]">{data.totalBatchesCount}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Livestock Investment</p>
            <Wallet className="h-4 w-4 text-[#FF8A00]" />
          </div>
          <p className="mt-2 text-xl font-bold text-[#101827] break-words">
            {formatRwf(data.totalLivestockInvestment)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">People Given Pigs</p>
            <Users className="h-4 w-4 text-[#FF8A00]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#101827]">{data.auditRows.length}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Tracked Pig Cycles</p>
            <RefreshCw className="h-4 w-4 text-[#FF8A00]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#101827]">{data.pigCycles.length}</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("INVENTORY")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
            activeTab === "INVENTORY"
              ? "bg-[#101827] text-white"
              : "bg-white border border-slate-200 text-slate-700 hover:border-[#FF8A00]"
          }`}
        >
          <Layers className="h-4 w-4 text-[#FF8A00]" />
          Batches &amp; Pig CRUD ({data.stockedPigs.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("RECIPIENTS")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
            activeTab === "RECIPIENTS"
              ? "bg-[#101827] text-white"
              : "bg-white border border-slate-200 text-slate-700 hover:border-[#FF8A00]"
          }`}
        >
          <Users className="h-4 w-4 text-[#FF8A00]" />
          People Given Pigs ({data.auditRows.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("CYCLES")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
            activeTab === "CYCLES"
              ? "bg-[#101827] text-white"
              : "bg-white border border-slate-200 text-slate-700 hover:border-[#FF8A00]"
          }`}
        >
          <RefreshCw className="h-4 w-4 text-[#FF8A00]" />
          Full Pig Cycles ({data.pigCycles.length})
        </button>
      </div>

      {/* TAB 1: BATCHES & PIG CRUD */}
      {activeTab === "INVENTORY" && (
        <div className="space-y-6">
          {/* Batch Collection Stock-In Form */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-[#FF8A00]">
                  <PlusCircle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#101827]">
                    Stock In Pig Collection Batch (Finance Intake)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Identify a batch collection, set price per pig (defaults to 80,000 RWF), and automatically post total investment as an approved Pig Purchase expense.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateForm((v) => !v)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#101827] hover:border-[#FF8A00] cursor-pointer"
              >
                {showCreateForm ? "Collapse Form" : "New Batch Stock-In"}
              </button>
            </div>

            {showCreateForm && (
              <form onSubmit={handleBatchSubmit} className="p-6 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Batch / Collection Code
                    </label>
                    <input
                      value={batchCode}
                      onChange={(e) => setBatchCode(e.target.value)}
                      placeholder="Auto: BATCH-2026-..."
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono text-[#101827] focus:border-[#FF8A00] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Quantity (Pigs) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Price per Pig (RWF) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      required
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-bold text-[#101827] focus:border-[#FF8A00] focus:outline-none"
                    />
                  </div>

                  <div className="rounded-xl border border-orange-200 bg-orange-50/60 px-4 py-2.5 flex flex-col justify-center">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                      Total Batch Investment
                    </span>
                    <span className="text-lg font-extrabold text-[#101827]">
                      {formatRwf(liveBatchInvestment)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      {parsedQty > 1 ? "Tag Prefix (Optional)" : "Pig Tag ID (Optional)"}
                    </label>
                    <input
                      value={tagNumber}
                      onChange={(e) => setTagNumber(e.target.value)}
                      placeholder="Auto: PF-RW-2026-..."
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono text-[#101827] focus:border-[#FF8A00] focus:outline-none"
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
                      Age (Days)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={daysAge}
                      onChange={(e) => setDaysAge(e.target.value)}
                      placeholder="Enter age in days"
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

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Breed
                    </label>
                    <input
                      value={breed}
                      onChange={(e) => setBreed(e.target.value)}
                      placeholder="e.g. Landrace / Large White"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Sex
                    </label>
                    <select
                      value={sex}
                      onChange={(e) => setSex(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#101827]"
                    >
                      <option value="">Unspecified</option>
                      <option value={PigSex.FEMALE}>Female</option>
                      <option value={PigSex.MALE}>Male</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={currentWeight}
                      onChange={(e) => setCurrentWeight(e.target.value)}
                      placeholder="kg"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Collection Source / Supplier
                    </label>
                    <input
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      placeholder="Supplier farm or cooperative"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2 lg:col-span-4">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Notes
                    </label>
                    <input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional purchase or veterinary intake notes..."
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
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <PiggyBank className="h-4 w-4" />
                    )}
                    <span>
                      Stock In {parsedQty > 1 ? `${parsedQty} Pigs` : "Pig"} &amp; Record Investment
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Collection Batches Overview */}
          {data.batches.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#101827]">
                    Collection Batches ({data.batches.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Click a batch to filter the pig inventory table below.
                  </p>
                </div>
                {batchFilter !== "ALL" && (
                  <button
                    type="button"
                    onClick={() => setBatchFilter("ALL")}
                    className="text-xs font-semibold text-[#FF8A00] hover:underline cursor-pointer"
                  >
                    Show All Batches
                  </button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.batches.map((b) => {
                  const selected = batchFilter === b.batchCode;
                  return (
                    <button
                      key={b.batchCode}
                      type="button"
                      onClick={() => setBatchFilter(selected ? "ALL" : b.batchCode)}
                      className={`text-left rounded-xl border p-4 transition cursor-pointer ${
                        selected
                          ? "border-[#FF8A00] bg-orange-50/60"
                          : "border-slate-200 bg-slate-50/70 hover:border-[#FF8A00]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-[#101827]">
                          {b.batchCode}
                        </span>
                        <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-[#101827]">
                          {b.pigCount} pig(s)
                        </span>
                      </div>
                      <p className="mt-2 text-base font-extrabold text-[#FF8A00]">
                        {formatRwf(b.totalInvestment)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        Avg {formatRwf(b.unitPriceAvg)} / pig ·{" "}
                        {b.availableCount} available · {b.distributedCount} distributed
                      </p>
                      {b.source && (
                        <p className="mt-1 truncate text-[11px] text-slate-600">{b.source}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full Pig Inventory CRUD Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-bold text-[#101827]">
                  Pig Inventory Registry ({filteredPigs.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Full CRUD management across all stocked pigs, investment prices, vet status, and distribution state.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    value={pigSearch}
                    onChange={(e) => setPigSearch(e.target.value)}
                    placeholder="Search tag, batch, recipient..."
                    className="rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-[#101827] w-48 focus:border-[#FF8A00] focus:outline-none"
                  />
                </div>

                <select
                  value={batchFilter}
                  onChange={(e) => setBatchFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-[#101827]"
                >
                  <option value="ALL">All Batches</option>
                  <option value="UNBATCHED">No Batch Code</option>
                  {data.batches.map((b) => (
                    <option key={b.batchCode} value={b.batchCode}>
                      {b.batchCode}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-[#101827]"
                >
                  <option value="ALL">All Statuses</option>
                  {Object.values(PigStatus).map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>

                <select
                  value={healthFilter}
                  onChange={(e) => setHealthFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-[#101827]"
                >
                  <option value="ALL">All Health</option>
                  {Object.values(PigHealthStatus).map((hs) => (
                    <option key={hs} value={hs}>
                      {hs}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50/70 uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Tag &amp; Batch</th>
                    <th className="px-4 py-3">Details (Type / Age / Wt)</th>
                    <th className="px-4 py-3">Investment (RWF)</th>
                    <th className="px-4 py-3">Health &amp; Vet Notes</th>
                    <th className="px-4 py-3">Status &amp; Holder</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-[#101827]">
                  {filteredPigs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                        No pigs match the current search or filters.
                      </td>
                    </tr>
                  ) : (
                    filteredPigs.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <p className="font-mono font-bold text-[#101827]">{p.tagNumber}</p>
                          <p className="text-[11px] font-mono text-slate-500">
                            {p.batchCode ? `Batch: ${p.batchCode}` : "No batch"}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold">
                            {p.pigType || p.breed || "—"}
                            {p.sex ? ` · ${p.sex}` : ""}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {p.daysAge !== null ? `${p.daysAge} days` : "Age —"} ·{" "}
                            {p.currentWeight !== null ? `${p.currentWeight} kg` : "Wt —"}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-bold text-[#101827]">
                          {p.purchasePrice !== null ? formatRwf(p.purchasePrice) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${getHealthBadge(
                              p.healthStatus
                            )}`}
                          >
                            {p.healthStatus}
                          </span>
                          {p.latestVetExamSummary && (
                            <p className="mt-1 max-w-xs truncate text-[11px] text-slate-500">
                              {p.latestVetExamSummary}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-[#101827]">
                            {p.status}
                          </span>
                          {(p.beneficiaryName || p.cooperativeName) && (
                            <p className="mt-1 text-[11px] text-slate-600">
                              {[p.beneficiaryName, p.cooperativeName].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {confirmDeleteId === p.id ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleDeletePig(p.id, p.tagNumber)}
                                className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-rose-700 cursor-pointer"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditModal(p)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-[#101827] hover:border-[#FF8A00] cursor-pointer"
                              >
                                <Edit3 className="h-3 w-3 text-[#FF8A00]" />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(p.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer"
                                title="Remove pig from active stock"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
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
        </div>
      )}

      {/* TAB 2: PEOPLE GIVEN PIGS */}
      {activeTab === "RECIPIENTS" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-bold text-[#101827]">
                People Given Pigs &amp; Qualification Payments ({filteredRecipients.length})
              </h2>
              <p className="text-xs text-slate-500">
                Complete audit of every beneficiary and cooperative member assigned a pig, Cell Manager sign-off, and MoMo qualification record.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  placeholder="Search recipient, phone, tag..."
                  className="rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-[#101827] w-56 focus:border-[#FF8A00] focus:outline-none"
                />
              </div>

              <select
                value={recipientCoopFilter}
                onChange={(e) => setRecipientCoopFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-[#101827]"
              >
                <option value="ALL">All Cooperatives / Programs</option>
                {uniqueCoops.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50/70 uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Recipient</th>
                  <th className="px-4 py-3">Cooperative / Program</th>
                  <th className="px-4 py-3">Cell Manager (Signed)</th>
                  <th className="px-4 py-3">Pig Tag, Batch &amp; Value</th>
                  <th className="px-4 py-3">Qualification Payment</th>
                  <th className="px-4 py-3">Distribution Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-[#101827]">
                {filteredRecipients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                      No pig recipient records found.
                    </td>
                  </tr>
                ) : (
                  filteredRecipients.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <p className="font-bold text-[#101827]">{row.memberName}</p>
                        <p className="text-[11px] text-slate-500">
                          {row.memberPhone || "No phone"} · {row.memberRoleOrType}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.cooperativeName || "—"}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#101827]">
                        {row.cellManagerName || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-mono font-bold text-[#101827]">{row.pigTag}</p>
                        <p className="text-[11px] text-slate-500">
                          {row.batchCode ? `${row.batchCode} · ` : ""}
                          {row.pigValueRwf ? formatRwf(row.pigValueRwf) : "Value —"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {row.paymentVerified && row.momoReference ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                            <ShieldCheck className="h-3 w-3" />
                            {row.paymentAmount ? formatRwf(row.paymentAmount) : "Verified"} · MoMo:{" "}
                            {row.momoReference}
                          </span>
                        ) : (
                          <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                            Not Recorded
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        <p>{formatDate(row.distributionDate)}</p>
                        {row.notes && (
                          <p className="max-w-xs truncate text-[11px] text-slate-400">{row.notes}</p>
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

      {/* TAB 3: FULL PIG CYCLES */}
      {activeTab === "CYCLES" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-bold text-[#101827]">
                Full Pig Revolving Cycles ({filteredCycles.length})
              </h2>
              <p className="text-xs text-slate-500">
                Track every pig from Finance intake through distribution, expected piglet returns (pass-on cycle), due dates, and completion status.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  value={cycleSearch}
                  onChange={(e) => setCycleSearch(e.target.value)}
                  placeholder="Search recipient, tag, batch..."
                  className="rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-[#101827] w-52 focus:border-[#FF8A00] focus:outline-none"
                />
              </div>

              <select
                value={cycleStatusFilter}
                onChange={(e) => setCycleStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-[#101827]"
              >
                <option value="ALL">All Cycle Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="PARTIALLY_COMPLETED">PARTIALLY_COMPLETED</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="OVERDUE">OVERDUE</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50/70 uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Recipient &amp; Cooperative</th>
                  <th className="px-4 py-3">Pig Tag, Batch &amp; Value</th>
                  <th className="px-4 py-3">Cycle</th>
                  <th className="px-4 py-3">Piglet Return Progress</th>
                  <th className="px-4 py-3">Start &amp; Due Date</th>
                  <th className="px-4 py-3">Cycle Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-[#101827]">
                {filteredCycles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                      No revolving pig cycles recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredCycles.map((c) => {
                    const pct =
                      c.expectedReturn > 0
                        ? Math.min(100, Math.round((c.returnedCount / c.expectedReturn) * 100))
                        : 0;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <p className="font-bold text-[#101827]">{c.beneficiaryName}</p>
                          <p className="text-[11px] text-slate-500">
                            {c.cooperativeName || c.beneficiaryPhone || "—"}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-mono font-bold text-[#101827]">
                            {c.pigTag || "—"}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {c.batchCode ? `${c.batchCode} · ` : ""}
                            {c.pigValueRwf ? formatRwf(c.pigValueRwf) : "Value —"}
                            {c.pigHealthStatus ? ` · ${c.pigHealthStatus}` : ""}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#101827]">
                          Cycle #{c.cycleNumber}
                        </td>
                        <td className="px-4 py-3 min-w-[160px]">
                          <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                            <span>
                              {c.returnedCount} / {c.expectedReturn} piglets
                            </span>
                            <span className="text-slate-500">{pct}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#FF8A00]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <p>Start: {formatDate(c.startDate)}</p>
                          <p className={c.isPastDue ? "font-semibold text-rose-600" : "text-slate-500"}>
                            Due: {formatDate(c.dueDate)}
                            {c.isPastDue ? " (Past Due)" : ""}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-bold ${getCycleBadge(
                              c.status,
                              c.isPastDue
                            )}`}
                          >
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Pig Modal */}
      {editingPig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101827]/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-[#101827]">
                  Edit Pig Record · {editingPig.tagNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  Update tag, batch collection, price (RWF), age, health status, or lifecycle state.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPig(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-[#101827] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Pig Tag ID *
                  </label>
                  <input
                    required
                    value={editTag}
                    onChange={(e) => setEditTag(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-mono text-[#101827]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Batch / Collection Code
                  </label>
                  <input
                    value={editBatch}
                    onChange={(e) => setEditBatch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-mono text-[#101827]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Unit Price / Value (RWF)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-bold text-[#101827]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Pig Type
                  </label>
                  <input
                    value={editPigType}
                    onChange={(e) => setEditPigType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-[#101827]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Age (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editDaysAge}
                    onChange={(e) => setEditDaysAge(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-[#101827]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={editWeight}
                    onChange={(e) => setEditWeight(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-[#101827]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Breed
                  </label>
                  <input
                    value={editBreed}
                    onChange={(e) => setEditBreed(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-[#101827]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Sex
                  </label>
                  <select
                    value={editSex}
                    onChange={(e) => setEditSex(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-[#101827]"
                  >
                    <option value="">Unspecified</option>
                    <option value={PigSex.FEMALE}>Female</option>
                    <option value={PigSex.MALE}>Male</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Health Status
                  </label>
                  <select
                    value={editHealth}
                    onChange={(e) => setEditHealth(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-[#101827]"
                  >
                    {Object.values(PigHealthStatus).map((hs) => (
                      <option key={hs} value={hs}>
                        {hs}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Lifecycle Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-[#101827]"
                  >
                    {Object.values(PigStatus).map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Source / Supplier
                  </label>
                  <input
                    value={editSource}
                    onChange={(e) => setEditSource(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-[#101827]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Notes
                  </label>
                  <input
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-[#101827]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPig(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#101827] px-5 py-2 text-xs font-semibold text-white hover:bg-[#1f2937] disabled:opacity-60 cursor-pointer"
                >
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FF8A00]" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
