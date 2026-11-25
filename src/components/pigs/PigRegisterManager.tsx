"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { 
  ArrowLeft, CheckCircle2, Edit2, Loader2, Package, Plus, Save, 
  Search, Tag, Trash2, X, AlertTriangle, HeartPulse, DollarSign 
} from "lucide-react";
import { 
  registerIndividualPig, updateIndividualPig, deleteIndividualPig, SerializedPigInventoryItem 
} from "@/app/actions/pig";
import { PigHealthStatus, PigSex } from "@prisma/client";

interface PigRegisterManagerProps {
  initialPigs: SerializedPigInventoryItem[];
  initialTotalAvailable: number;
  backHref?: string;
}

export function PigRegisterManager({
  initialPigs,
  initialTotalAvailable,
  backHref = "/dashboard/field/pigs",
}: PigRegisterManagerProps) {
  const [pigs, setPigs] = useState<SerializedPigInventoryItem[]>(initialPigs);
  const [totalAvailable, setTotalAvailable] = useState<number>(initialTotalAvailable);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [healthFilter, setHealthFilter] = useState<string>("ALL");

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createTag, setCreateTag] = useState<string>("");
  const [createHealth, setCreateHealth] = useState<PigHealthStatus>(PigHealthStatus.HEALTHY);
  const [createSex, setCreateSex] = useState<PigSex>(PigSex.FEMALE);
  const [createPrice, setCreatePrice] = useState<number>(80000);

  // Edit Modal State
  const [editingPig, setEditingPig] = useState<SerializedPigInventoryItem | null>(null);
  const [editTag, setEditTag] = useState<string>("");
  const [editHealth, setEditHealth] = useState<PigHealthStatus>(PigHealthStatus.HEALTHY);
  const [editSex, setEditSex] = useState<PigSex>(PigSex.FEMALE);
  const [editPrice, setEditPrice] = useState<number>(80000);

  // Delete Confirmation State
  const [deletingPig, setDeletingPig] = useState<SerializedPigInventoryItem | null>(null);

  // Transitions & Feedback
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Filtered pigs
  const filteredPigs = useMemo(() => {
    return pigs.filter((p) => {
      const matchSearch =
        !searchQuery.trim() ||
        p.tagNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.currentBeneficiaryName ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.currentBeneficiaryNumber ?? "").toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchHealth = healthFilter === "ALL" || p.healthStatus === healthFilter;

      return matchSearch && matchHealth;
    });
  }, [pigs, searchQuery, healthFilter]);

  // Handle Create Individual Pig
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      try {
        const result = await registerIndividualPig({
          tagNumber: createTag,
          healthStatus: createHealth,
          sex: createSex,
          purchasePrice: createPrice,
        });

        if (result.success && result.pig) {
          setPigs((prev) => [result.pig!, ...prev]);
          setTotalAvailable(result.totalAvailable);
          setIsCreateOpen(false);
          setFeedback({
            type: "success",
            message: `Successfully registered pig "${result.pig.tagNumber}" (Health: ${result.pig.healthStatus}).`,
          });
          setCreateTag("");
          setCreateHealth(PigHealthStatus.HEALTHY);
          setCreateSex(PigSex.FEMALE);
          setCreatePrice(80000);
        }
      } catch (err: unknown) {
        setFeedback({
          type: "error",
          message: err instanceof Error ? err.message : "Failed to register pig. Please try again.",
        });
      }
    });
  };

  // Open Edit Modal
  const openEdit = (pig: SerializedPigInventoryItem) => {
    setEditingPig(pig);
    setEditTag(pig.tagNumber);
    setEditHealth(pig.healthStatus);
    setEditSex(pig.sex ?? PigSex.FEMALE);
    setEditPrice(pig.purchasePrice || 80000);
    setFeedback(null);
  };

  // Handle Edit Submit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPig) return;

    setFeedback(null);
    startTransition(async () => {
      try {
        const result = await updateIndividualPig({
          pigId: editingPig.id,
          tagNumber: editTag,
          healthStatus: editHealth,
          sex: editSex,
          purchasePrice: editPrice,
        });

        if (result.success && result.pig) {
          setPigs((prev) =>
            prev.map((p) => (p.id === editingPig.id ? result.pig! : p))
          );
          setTotalAvailable(result.totalAvailable);
          setEditingPig(null);
          setFeedback({
            type: "success",
            message: `Pig "${result.pig.tagNumber}" updated successfully.`,
          });
        }
      } catch (err: unknown) {
        setFeedback({
          type: "error",
          message: err instanceof Error ? err.message : "Failed to update pig record. Please try again.",
        });
      }
    });
  };

  // Handle Delete Confirm
  const handleDeleteConfirm = () => {
    if (!deletingPig) return;

    setFeedback(null);
    startTransition(async () => {
      try {
        const result = await deleteIndividualPig(deletingPig.id);
        if (result.success) {
          setPigs((prev) => prev.filter((p) => p.id !== deletingPig.id));
          setTotalAvailable(result.totalAvailable);
          setFeedback({
            type: "success",
            message: `Pig "${deletingPig.tagNumber}" deleted successfully from inventory.`,
          });
          setDeletingPig(null);
        }
      } catch (err: unknown) {
        setFeedback({
          type: "error",
          message: err instanceof Error ? err.message : "Failed to delete pig. Please try again.",
        });
        setDeletingPig(null);
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href={backHref}
            className="p-2 text-[#5d6e64] hover:bg-[#e4ede6] rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Pig Register</h2>
            <p className="mt-1 text-xs text-slate-500">
              Register and manage individual pigs with their tag, health status, sex, and auto-filled price.
            </p>
          </div>
        </div>

        {/* Register Individual Pig Button */}
        <button
          type="button"
          onClick={() => {
            setCreateTag("");
            setCreateHealth(PigHealthStatus.HEALTHY);
            setCreateSex(PigSex.FEMALE);
            setCreatePrice(80000);
            setIsCreateOpen(true);
          }}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto px-4 py-2.5 border border-transparent rounded-xl shadow-xs text-xs font-semibold text-white bg-[#101827] hover:bg-[#1f2937] transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4 text-[#FF8A00]" />
          Register Individual Pig
        </button>
      </div>

      {/* Success / Error Feedback Message */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-sm flex items-start justify-between gap-3 transition-all ${
            feedback.type === "success"
              ? "bg-[#eaf4ed] text-[#1c4b31] border border-[#bcdbc6]"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <div className="flex items-start gap-3">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[#2c5a43] mt-0.5" />
            ) : (
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">{feedback.type === "success" ? "Success" : "Error"}</p>
              <p className="mt-0.5">{feedback.message}</p>
            </div>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-[#5d6e64] hover:text-[#1c2b23] p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white rounded-xl shadow-sm border border-[#d9e1d8] overflow-hidden">
        {/* Table Toolbar */}
        <div className="px-6 py-4 border-b border-[#d9e1d8] bg-[#f8faf8] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-base font-bold font-serif text-[#1c2b23]">
              Registered Pigs ({filteredPigs.length})
            </h3>
            <p className="text-xs text-[#5d6e64] mt-0.5">
              Showing pig tag, health status, sex, and price
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Box */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-[#d9e1d8] rounded-lg shadow-sm">
              <Search className="h-4 w-4 text-[#7d8d84]" />
              <input
                type="text"
                placeholder="Search tag or beneficiary..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs text-[#1c2b23] bg-transparent focus:outline-none w-44"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-[#7d8d84] hover:text-red-600 p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Health Filter */}
            <select
              value={healthFilter}
              onChange={(e) => setHealthFilter(e.target.value)}
              className="text-xs bg-white border border-[#d9e1d8] rounded-lg px-3 py-2 text-[#1c2b23] focus:outline-none"
            >
              <option value="ALL">All Health Statuses</option>
              <option value="HEALTHY">Healthy</option>
              <option value="SICK">Sick</option>
              <option value="UNDER_TREATMENT">Under Treatment</option>
              <option value="RECOVERED">Recovered</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
        </div>

        {/* Pigs Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#d9e1d8]">
            <thead className="bg-[#fafcfa]">
              <tr>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-[#5d6e64] uppercase tracking-wider">
                  Pig Tag
                </th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-[#5d6e64] uppercase tracking-wider">
                  Healthy Status
                </th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-[#5d6e64] uppercase tracking-wider">
                  Sex
                </th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-[#5d6e64] uppercase tracking-wider">
                  Price (RWF)
                </th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-[#5d6e64] uppercase tracking-wider">
                  Assignment Status
                </th>
                <th scope="col" className="px-6 py-3.5 text-right text-xs font-bold text-[#5d6e64] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-[#eef2ee]">
              {filteredPigs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-[#5d6e64]">
                    <Package className="h-8 w-8 mx-auto text-[#9db0a4] mb-2" />
                    {searchQuery || healthFilter !== "ALL"
                      ? "No pigs match your search or filter criteria."
                      : "No individual pigs registered yet. Click 'Register Individual Pig' to add pigs."}
                  </td>
                </tr>
              ) : (
                filteredPigs.map((pig) => {
                  const isDistributed = Boolean(pig.currentBeneficiaryName);

                  return (
                    <tr key={pig.id} className="hover:bg-[#f6faf7] transition-colors">
                      {/* Pig Tag */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold font-mono text-[#1c2b23]">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-[#2c5a43]" />
                          <span>{pig.tagNumber}</span>
                        </div>
                      </td>

                      {/* Healthy Status */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold ${
                            pig.healthStatus === "HEALTHY"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : pig.healthStatus === "UNDER_TREATMENT"
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : pig.healthStatus === "SICK" || pig.healthStatus === "CRITICAL"
                              ? "bg-rose-50 text-rose-800 border border-rose-200"
                              : "bg-blue-50 text-blue-800 border border-blue-200"
                          }`}
                        >
                          <HeartPulse className="h-3.5 w-3.5" />
                          {pig.healthStatus.replace(/_/g, " ")}
                        </span>
                      </td>

                      {/* Sex */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-slate-700">
                        {pig.sex ? pig.sex : "—"}
                      </td>

                      {/* Price (RWF) */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-slate-900 font-mono">
                        {pig.purchasePrice ? pig.purchasePrice.toLocaleString() : "80,000"} RWF
                      </td>

                      {/* Assignment Status */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        {isDistributed ? (
                          <div>
                            <span className="font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                              Distributed: {pig.currentBeneficiaryName}
                            </span>
                            <span className="block text-[11px] text-slate-500 mt-0.5 font-mono">
                              {pig.currentBeneficiaryNumber}
                            </span>
                          </div>
                        ) : (
                          <span className="font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                            Available in Stock
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium space-x-2">
                        <button
                          type="button"
                          onClick={() => openEdit(pig)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-[#2c5a43] bg-[#eef5f0] hover:bg-[#dfeade] transition-colors border border-[#cbe2d3]"
                        >
                          <Edit2 className="h-3 w-3" />
                          Edit
                        </button>

                        {!isDistributed && (
                          <button
                            type="button"
                            onClick={() => setDeletingPig(pig)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors border border-red-200"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Summary: Total Pigs Available */}
      <div className="rounded-[16px] border border-[#dfe7df] bg-white p-5 shadow-[0_4px_12px_rgba(16,28,23,0.03)]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e3efe7] text-[#173d2e]">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#5d6e64]">
                Inventory Status
              </p>
              <h3 className="text-base font-bold text-[#1c2b23]">
                Total Number of Pigs Available
              </h3>
              <p className="text-xs text-[#5d6e64]">
                Total available unallocated pigs in stock across project inventory
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold font-serif text-[#1c2b23]">
              {totalAvailable}
            </span>
            <span className="block text-xs font-medium text-[#2c5a43]">
              {totalAvailable === 1 ? "1 pig in stock" : `${totalAvailable} pigs in stock`}
            </span>
          </div>
        </div>
      </div>

      {/* ===================== CREATE MODAL ===================== */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-[#d9e1d8] w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 bg-[#f8faf8] border-b border-[#d9e1d8] flex items-center justify-between">
              <h3 className="text-lg font-bold font-serif text-[#1c2b23]">
                Register Individual Pig
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-[#5d6e64] hover:text-[#1c2b23] p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {/* Pig Tag */}
              <div>
                <label htmlFor="createTag" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Pig Tag *
                </label>
                <input
                  type="text"
                  id="createTag"
                  value={createTag}
                  onChange={(e) => setCreateTag(e.target.value)}
                  placeholder="e.g. PF-RW-2026-00125 (leave blank to auto-generate)"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#2c5a43]"
                />
              </div>

              {/* Healthy Status */}
              <div>
                <label htmlFor="createHealth" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Healthy Status *
                </label>
                <select
                  id="createHealth"
                  value={createHealth}
                  onChange={(e) => setCreateHealth(e.target.value as PigHealthStatus)}
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2c5a43]"
                >
                  <option value="HEALTHY">Healthy</option>
                  <option value="SICK">Sick</option>
                  <option value="UNDER_TREATMENT">Under Treatment</option>
                  <option value="RECOVERED">Recovered</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              {/* Sex */}
              <div>
                <label htmlFor="createSex" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Sex *
                </label>
                <select
                  id="createSex"
                  value={createSex}
                  onChange={(e) => setCreateSex(e.target.value as PigSex)}
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2c5a43]"
                >
                  <option value="FEMALE">Female</option>
                  <option value="MALE">Male</option>
                </select>
              </div>

              {/* Price (Auto-fills 80,000 RWF) */}
              <div>
                <label htmlFor="createPrice" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Price (RWF) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <input
                    type="number"
                    id="createPrice"
                    value={createPrice}
                    onChange={(e) => setCreatePrice(Number(e.target.value))}
                    required
                    className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#2c5a43]"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Auto-fills to 80,000 RWF by default.
                </p>
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-[#d9e1d8] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-xs font-semibold text-white bg-[#2c5a43] hover:bg-[#1c2b23] disabled:opacity-50 transition-colors"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Saving Pig...
                    </>
                  ) : (
                    <>
                      <Save className="-ml-1 mr-2 h-3.5 w-3.5" />
                      Save Pig
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== EDIT MODAL ===================== */}
      {editingPig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-[#d9e1d8] w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 bg-[#f8faf8] border-b border-[#d9e1d8] flex items-center justify-between">
              <h3 className="text-lg font-bold font-serif text-[#1c2b23]">
                Edit Pig Details
              </h3>
              <button
                type="button"
                onClick={() => setEditingPig(null)}
                className="text-[#5d6e64] hover:text-[#1c2b23] p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label htmlFor="editTag" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Pig Tag *
                </label>
                <input
                  type="text"
                  id="editTag"
                  value={editTag}
                  onChange={(e) => setEditTag(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#2c5a43]"
                />
              </div>

              <div>
                <label htmlFor="editHealth" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Healthy Status *
                </label>
                <select
                  id="editHealth"
                  value={editHealth}
                  onChange={(e) => setEditHealth(e.target.value as PigHealthStatus)}
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2c5a43]"
                >
                  <option value="HEALTHY">Healthy</option>
                  <option value="SICK">Sick</option>
                  <option value="UNDER_TREATMENT">Under Treatment</option>
                  <option value="RECOVERED">Recovered</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div>
                <label htmlFor="editSex" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Sex *
                </label>
                <select
                  id="editSex"
                  value={editSex}
                  onChange={(e) => setEditSex(e.target.value as PigSex)}
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2c5a43]"
                >
                  <option value="FEMALE">Female</option>
                  <option value="MALE">Male</option>
                </select>
              </div>

              <div>
                <label htmlFor="editPrice" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Price (RWF) *
                </label>
                <input
                  type="number"
                  id="editPrice"
                  value={editPrice}
                  onChange={(e) => setEditPrice(Number(e.target.value))}
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#2c5a43]"
                />
              </div>

              <div className="pt-3 border-t border-[#d9e1d8] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingPig(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-xs font-semibold text-white bg-[#2c5a43] hover:bg-[#1c2b23] disabled:opacity-50 transition-colors"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="-ml-1 mr-2 h-3.5 w-3.5" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== DELETE CONFIRMATION MODAL ===================== */}
      {deletingPig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-red-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 bg-red-50 border-b border-red-100 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
              <h3 className="text-base font-bold text-red-900">
                Confirm Pig Deletion
              </h3>
            </div>

            <div className="p-6 space-y-3">
              <p className="text-sm text-[#1c2b23]">
                Are you sure you want to delete pig with tag{" "}
                <span className="font-mono font-bold text-slate-900">{deletingPig.tagNumber}</span>?
              </p>
              <p className="text-xs text-red-600">
                This will remove the pig from stock inventory and recalculate available stock.
              </p>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingPig(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleDeleteConfirm}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="-ml-1 mr-2 h-3.5 w-3.5" />
                    Yes, Delete Pig
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
