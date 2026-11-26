"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PigHealthStatus, PigSex, PigStatus } from "@prisma/client";
import {
  AlertTriangle,
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
  Stethoscope,
  HeartPulse,
  X,
} from "lucide-react";
import {
  financeDeletePig,
  financeStockInPig,
  financeUpdatePig,
} from "@/app/actions/livestock-finance";
import {
  DEFAULT_PIG_PRICE_RWF,
  type SerializedFinancePigStock,
  type SerializedFinanceWorkspaceData,
} from "@/lib/finance-types";
import { formatRwf } from "@/lib/format-rwf";
import { MemberPaymentsApprovalCard } from "@/components/finance/MemberPaymentsApprovalCard";

type TabKey = "INVENTORY" | "PAYMENTS" | "RECIPIENTS" | "CYCLES" | "VET_CLEARANCE";

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

  // Individual Pig Stock-In Form State
  const [showCreateForm, setShowCreateForm] = useState(true);
  const [tagNumber, setTagNumber] = useState("");
  const [healthStatus, setHealthStatus] = useState<string>(PigHealthStatus.HEALTHY);
  const [sex, setSex] = useState<string>(PigSex.FEMALE);
  const [purchasePrice, setPurchasePrice] = useState(String(DEFAULT_PIG_PRICE_RWF));

  // Inventory Filters
  const [pigSearch, setPigSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [healthFilter, setHealthFilter] = useState("ALL");

  // Edit Modal & Delete State
  const [editingPig, setEditingPig] = useState<SerializedFinancePigStock | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Edit Form Fields
  const [editTag, setEditTag] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editSex, setEditSex] = useState("");
  const [editHealth, setEditHealth] = useState<string>(PigHealthStatus.HEALTHY);
  const [editStatus, setEditStatus] = useState<string>(PigStatus.REGISTERED);

  // Recipients Filters
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipientCoopFilter, setRecipientCoopFilter] = useState("ALL");

  // Cycles Filters
  const [cycleSearch, setCycleSearch] = useState("");
  const [cycleStatusFilter, setCycleStatusFilter] = useState("ALL");

  const uniqueCoops = useMemo(() => {
    return Array.from(
      new Set(data.auditRows.map((r) => r.cooperativeName).filter(Boolean))
    ) as string[];
  }, [data.auditRows]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const fd = new FormData();
    fd.append("tagNumber", tagNumber);
    fd.append("healthStatus", healthStatus);
    fd.append("sex", sex);
    fd.append("purchasePrice", purchasePrice);

    startTransition(async () => {
      const res = await financeStockInPig(fd);
      if (!res.success) {
        setError(res.error || "Could not register individual pig.");
        return;
      }
      setSuccess(`Registered individual pig successfully.`);
      setTagNumber("");
      setHealthStatus(PigHealthStatus.HEALTHY);
      setSex(PigSex.FEMALE);
      setPurchasePrice(String(DEFAULT_PIG_PRICE_RWF));
      router.refresh();
    });
  };

  const openEditModal = (pig: SerializedFinancePigStock) => {
    setError("");
    setSuccess("");
    setEditingPig(pig);
    setEditTag(pig.tagNumber);
    setEditPrice(pig.purchasePrice ?? String(DEFAULT_PIG_PRICE_RWF));
    setEditSex(pig.sex ?? "");
    setEditHealth(pig.healthStatus);
    setEditStatus(pig.status);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPig) return;
    setError("");
    setSuccess("");

    const fd = new FormData();
    fd.append("id", editingPig.id);
    fd.append("tagNumber", editTag);
    fd.append("purchasePrice", editPrice);
    fd.append("sex", editSex);
    fd.append("healthStatus", editHealth);
    fd.append("status", editStatus);

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
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      if (healthFilter !== "ALL" && p.healthStatus !== healthFilter) return false;
      if (!q) return true;
      return (
        p.tagNumber.toLowerCase().includes(q) ||
        (p.beneficiaryName && p.beneficiaryName.toLowerCase().includes(q)) ||
        (p.cooperativeName && p.cooperativeName.toLowerCase().includes(q))
      );
    });
  }, [data.stockedPigs, pigSearch, statusFilter, healthFilter]);

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

      {/* KPI Strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Total Pigs in Stock</p>
            <PiggyBank className="h-4 w-4 text-[#FF8A00]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#101827]">{data.totalPigsCount}</p>
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
          Pig Inventory &amp; Register ({data.stockedPigs.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("PAYMENTS")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
            activeTab === "PAYMENTS"
              ? "bg-[#101827] text-white"
              : "bg-white border border-slate-200 text-slate-700 hover:border-[#FF8A00]"
          }`}
        >
          <ShieldCheck className="h-4 w-4 text-[#FF8A00]" />
          Member Payment Approvals ({data.memberPayments.filter((p) => p.status === "PENDING").length} pending)
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

        <button
          type="button"
          onClick={() => setActiveTab("VET_CLEARANCE")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
            activeTab === "VET_CLEARANCE"
              ? "bg-[#101827] text-white"
              : "bg-white border border-slate-200 text-slate-700 hover:border-[#FF8A00]"
          }`}
        >
          <Stethoscope className="h-4 w-4 text-[#FF8A00]" />
          Vet Inspection &amp; Clearance (
          {
            data.stockedPigs.filter(
              (p) =>
                p.hasVetInspection &&
                (p.healthStatus === "HEALTHY" || p.healthStatus === "RECOVERED") &&
                (p.status === "REGISTERED" || p.status === "ACTIVE" || p.status === "RETURNED") &&
                !p.beneficiaryId
            ).length
          }{" "}
          Cleared)
        </button>
      </div>

      {/* TAB: MEMBER PAYMENT APPROVALS */}
      {activeTab === "PAYMENTS" && (
        <MemberPaymentsApprovalCard memberPayments={data.memberPayments} />
      )}

      {/* TAB 1: PIG INVENTORY & REGISTER */}
      {activeTab === "INVENTORY" && (
        <div className="space-y-6">
          {/* Register Individual Pig Form */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-[#FF8A00]">
                  <PlusCircle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#101827]">
                    Register Individual Pig (Finance Intake)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Add individual pigs with tag number, health status, sex, and price (auto-fills to 80,000 RWF).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateForm((v) => !v)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#101827] hover:border-[#FF8A00] cursor-pointer"
              >
                {showCreateForm ? "Collapse Form" : "New Pig Intake"}
              </button>
            </div>

            {showCreateForm && (
              <form onSubmit={handleCreateSubmit} className="p-6 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Pig Tag ID (Optional)
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
                      Health Status *
                    </label>
                    <select
                      value={healthStatus}
                      onChange={(e) => setHealthStatus(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#101827]"
                    >
                      <option value={PigHealthStatus.HEALTHY}>Healthy</option>
                      <option value={PigHealthStatus.SICK}>Sick / Needs Vet</option>
                      <option value={PigHealthStatus.UNDER_TREATMENT}>Under Treatment</option>
                      <option value={PigHealthStatus.RECOVERED}>Recovered</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Sex *
                    </label>
                    <select
                      value={sex}
                      onChange={(e) => setSex(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#101827]"
                    >
                      <option value={PigSex.FEMALE}>Female</option>
                      <option value={PigSex.MALE}>Male</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Price (RWF) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      required
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-bold text-[#101827] focus:border-[#FF8A00] focus:outline-none"
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
                    <span>Register Pig &amp; Record Investment</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Full Pig Inventory Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-bold text-[#101827]">
                  Pig Registry ({filteredPigs.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Manage individual pigs, health statuses, sex, and prices.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    value={pigSearch}
                    onChange={(e) => setPigSearch(e.target.value)}
                    placeholder="Search tag or recipient..."
                    className="rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-[#101827] w-48 focus:border-[#FF8A00] focus:outline-none"
                  />
                </div>

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
                    <th className="px-4 py-3">Pig Tag</th>
                    <th className="px-4 py-3">Health Status</th>
                    <th className="px-4 py-3">Sex</th>
                    <th className="px-4 py-3">Price (RWF)</th>
                    <th className="px-4 py-3">Lifecycle &amp; Holder</th>
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
                        <td className="px-4 py-3 font-mono font-bold text-[#101827]">
                          {p.tagNumber}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${getHealthBadge(
                              p.healthStatus
                            )}`}
                          >
                            {p.healthStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          {p.sex ? String(p.sex) : "—"}
                        </td>
                        <td className="px-4 py-3 font-bold text-[#101827]">
                          {p.purchasePrice !== null ? formatRwf(p.purchasePrice) : "—"}
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

      {/* TAB 3: RECIPIENTS (AUDIT) */}
      {activeTab === "RECIPIENTS" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-[#101827]">
                People Given Pigs — Audit Trail ({filteredRecipients.length})
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
                  placeholder="Search recipient, tag..."
                  className="rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-[#101827] w-48 focus:border-[#FF8A00] focus:outline-none"
                />
              </div>

              {uniqueCoops.length > 0 && (
                <select
                  value={recipientCoopFilter}
                  onChange={(e) => setRecipientCoopFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-[#101827]"
                >
                  <option value="ALL">All Cooperatives</option>
                  {uniqueCoops.map((cName) => (
                    <option key={cName} value={cName}>
                      {cName}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50/70 uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Recipient &amp; Phone</th>
                  <th className="px-4 py-3">Cooperative</th>
                  <th className="px-4 py-3">Pig Tag</th>
                  <th className="px-4 py-3">Cell Manager (Signed)</th>
                  <th className="px-4 py-3">MoMo Payment (18.8k RWF)</th>
                  <th className="px-4 py-3">Handover Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-[#101827]">
                {filteredRecipients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                      No distribution audit records found matching your filters.
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
                      <td className="px-4 py-3 font-medium">
                        {row.cooperativeName || "Independent"}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-[#FF8A00]">
                        {row.pigTag}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {row.cellManagerName || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {row.paymentVerified ? (
                          <div className="inline-flex flex-col">
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                              <CheckCircle2 className="h-3 w-3" />
                              Verified ({formatRwf(row.paymentAmount ?? "18800")})
                            </span>
                            {row.momoReference && (
                              <span className="mt-0.5 text-[10px] font-mono text-slate-500">
                                MoMo: {row.momoReference}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                            Pending / Unverified
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {formatDate(row.distributionDate)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PIG CYCLES */}
      {activeTab === "CYCLES" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-[#101827]">
                Revolving Pig Cycles ({filteredCycles.length})
              </h2>
              <p className="text-xs text-slate-500">
                Track 1-year revolving livestock cycles, offspring returns, and compliance deadlines.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  value={cycleSearch}
                  onChange={(e) => setCycleSearch(e.target.value)}
                  placeholder="Search recipient, tag..."
                  className="rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-[#101827] w-48 focus:border-[#FF8A00] focus:outline-none"
                />
              </div>

              <select
                value={cycleStatusFilter}
                onChange={(e) => setCycleStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-[#101827]"
              >
                <option value="ALL">All Cycle Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="OVERDUE">Overdue</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50/70 uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Recipient &amp; Coop</th>
                  <th className="px-4 py-3">Pig Tag</th>
                  <th className="px-4 py-3">Cycle &amp; Dates</th>
                  <th className="px-4 py-3">Returns Progress</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-[#101827]">
                {filteredCycles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                      No revolving cycles found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredCycles.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <p className="font-bold text-[#101827]">{c.beneficiaryName}</p>
                        <p className="text-[11px] text-slate-500">
                          {c.cooperativeName || "Independent"} {c.beneficiaryPhone ? `· ${c.beneficiaryPhone}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-[#FF8A00]">
                        {c.pigTag || "Unlinked"}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">Cycle #{c.cycleNumber}</p>
                        <p className="text-[11px] text-slate-500">
                          Start: {formatDate(c.startDate)} · Due: {formatDate(c.dueDate)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-[#101827]">
                          {c.returnedCount} / {c.expectedReturn} Returned
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${getCycleBadge(
                            c.status,
                            c.isPastDue
                          )}`}
                        >
                          {c.isPastDue && c.status !== "COMPLETED" ? "OVERDUE" : c.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: VETERINARY CLEARANCE & HEALTH STATUS */}
      {activeTab === "VET_CLEARANCE" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-[#101827]">
                Veterinary Inspection &amp; Clearance List ({data.stockedPigs.length})
              </h2>
              <p className="text-xs text-slate-500">
                Live examination results from the Veterinarian. Pigs marked Cleared for Handover are the exact list available to Cell Managers for member distribution.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {
                  data.stockedPigs.filter(
                    (p) =>
                      p.hasVetInspection &&
                      (p.healthStatus === "HEALTHY" || p.healthStatus === "RECOVERED") &&
                      (p.status === "REGISTERED" || p.status === "ACTIVE" || p.status === "RETURNED") &&
                      !p.beneficiaryId
                  ).length
                }{" "}
                Cleared for Cell Manager
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-xs font-bold text-rose-800">
                <HeartPulse className="h-3.5 w-3.5" />
                {
                  data.stockedPigs.filter(
                    (p) =>
                      p.healthStatus === "SICK" ||
                      p.healthStatus === "UNDER_TREATMENT" ||
                      p.healthStatus === "CRITICAL"
                  ).length
                }{" "}
                Bad Status
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Pig Tag Number</th>
                  <th className="px-4 py-3">Vet Status</th>
                  <th className="px-4 py-3">Test Done &amp; Medication</th>
                  <th className="px-4 py-3">Exam Date</th>
                  <th className="px-4 py-3">Cell Manager Availability</th>
                  <th className="px-4 py-3">Current Holder / Coop</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-[#101827]">
                {data.stockedPigs.map((p) => {
                  const isHealthy = p.healthStatus === "HEALTHY" || p.healthStatus === "RECOVERED";
                  const isBadStatus =
                    p.healthStatus === "SICK" ||
                    p.healthStatus === "UNDER_TREATMENT" ||
                    p.healthStatus === "CRITICAL";
                  const isAvailable =
                    p.status === "REGISTERED" || p.status === "ACTIVE" || p.status === "RETURNED";
                  const canHandover =
                    isHealthy && p.hasVetInspection && isAvailable && !p.beneficiaryId;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono font-bold text-[#101827]">
                        {p.tagNumber}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${getHealthBadge(
                            p.healthStatus
                          )}`}
                        >
                          {isBadStatus ? `${p.healthStatus} (Bad Status)` : p.healthStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs text-slate-700">
                        {p.latestVetExamSummary || (p.hasVetInspection ? "Examined & cleared" : "Awaiting veterinary examination")}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {p.latestVetExamDate ? formatDate(p.latestVetExamDate) : "Not yet tested"}
                      </td>
                      <td className="px-4 py-3">
                        {canHandover ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                            <CheckCircle2 className="h-3 w-3" />
                            Cleared for Handover
                          </span>
                        ) : isBadStatus ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                            <HeartPulse className="h-3 w-3" />
                            Blocked (Bad Status)
                          </span>
                        ) : !p.hasVetInspection && isAvailable && !p.beneficiaryId ? (
                          <span className="inline-flex rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                            Awaiting Vet Check
                          </span>
                        ) : (
                          <span className="inline-flex rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                            Already Distributed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.beneficiaryName ? (
                          <span>
                            {p.beneficiaryName} {p.cooperativeName ? `(${p.cooperativeName})` : ""}
                          </span>
                        ) : (
                          <span className="font-semibold text-emerald-700">In Reserve Stock</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Pig Modal */}
      {editingPig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101827]/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-[#101827]">
                  Edit Pig Record · {editingPig.tagNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  Update tag, price (RWF), sex, health status, or lifecycle state.
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

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
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
                    Price / Value (RWF)
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

                <div className="sm:col-span-2">
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
