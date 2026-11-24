"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PigHealthStatus, Role } from "@prisma/client";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Edit3,
  Loader2,
  PiggyBank,
  PlusCircle,
  Save,
  X,
} from "lucide-react";
import {
  registerCooperativeAnimal,
  updateCooperativeAnimalRecord,
  type CooperativesWorkspaceData,
  type SerializedCooperativeAnimal,
} from "@/app/actions/cooperative";

const HEALTH_STATUS_OPTIONS: { value: PigHealthStatus; label: string }[] = [
  { value: PigHealthStatus.HEALTHY, label: "Healthy" },
  { value: PigHealthStatus.RECOVERED, label: "Recovered" },
  { value: PigHealthStatus.SICK, label: "Sick / Needs Vet" },
  { value: PigHealthStatus.UNDER_TREATMENT, label: "Under Treatment" },
  { value: PigHealthStatus.CRITICAL, label: "Critical Care" },
];

export function MemberAnimalsClient({
  data,
}: {
  data: CooperativesWorkspaceData;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const role = data.actor.role;
  const isMember = role === Role.COOPERATIVE_MEMBER;
  const isLeader = role === Role.COOPERATIVE_LEADER;
  const isCellOrAdmin = role === Role.CELL_MANAGER || role === Role.SUPER_ADMIN;

  // Create form state
  const [cooperativeId, setCooperativeId] = useState(
    data.actor.cooperativeId || data.cooperatives[0]?.id || ""
  );
  const selectedCoop = data.cooperatives.find((c) => c.id === cooperativeId);
  const [ownerMemberId, setOwnerMemberId] = useState(
    isMember ? data.actor.id : selectedCoop?.members[0]?.id || data.actor.id
  );
  const [tagNumber, setTagNumber] = useState("");
  const [breed, setBreed] = useState("");
  const [sex, setSex] = useState("FEMALE");
  const [currentWeight, setCurrentWeight] = useState("");
  const [estimatedAge, setEstimatedAge] = useState("");
  const [healthStatus, setHealthStatus] = useState<string>(PigHealthStatus.HEALTHY);
  const [currentLocation, setCurrentLocation] = useState("");
  const [notes, setNotes] = useState("");

  // Edit drawer/row state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editHealth, setEditHealth] = useState<string>(PigHealthStatus.HEALTHY);
  const [editLocation, setEditLocation] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const [searchTerm, setSearchTerm] = useState("");

  const handleCoopChange = (nextCoopId: string) => {
    setCooperativeId(nextCoopId);
    const coop = data.cooperatives.find((c) => c.id === nextCoopId);
    if (!isMember) {
      setOwnerMemberId(coop?.members[0]?.id || data.actor.id);
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const fd = new FormData();
    fd.append("cooperativeId", cooperativeId);
    fd.append("ownerMemberId", ownerMemberId);
    fd.append("tagNumber", tagNumber);
    fd.append("breed", breed);
    fd.append("sex", sex);
    fd.append("currentWeight", currentWeight);
    fd.append("estimatedAge", estimatedAge);
    fd.append("healthStatus", healthStatus);
    fd.append("currentLocation", currentLocation);
    fd.append("notes", notes);

    startTransition(async () => {
      const res = await registerCooperativeAnimal(fd);
      if (!res.success) {
        setError(res.error || "Could not save animal record.");
        return;
      }
      setSuccess("Animal record saved cleanly!");
      setTagNumber("");
      setBreed("");
      setCurrentWeight("");
      setEstimatedAge("");
      setCurrentLocation("");
      setNotes("");
      router.refresh();
    });
  };

  const startEdit = (animal: SerializedCooperativeAnimal) => {
    setEditingId(animal.id);
    setEditWeight(animal.currentWeight !== null ? String(animal.currentWeight) : "");
    setEditAge(animal.estimatedAge !== null ? String(animal.estimatedAge) : "");
    setEditHealth(animal.healthStatus);
    setEditLocation(animal.currentLocation ?? "");
    setEditNotes(animal.notes ?? "");
    setError("");
    setSuccess("");
  };

  const handleSaveEdit = (pigId: string) => {
    setError("");
    setSuccess("");
    const fd = new FormData();
    fd.append("pigId", pigId);
    fd.append("currentWeight", editWeight);
    fd.append("estimatedAge", editAge);
    fd.append("healthStatus", editHealth);
    fd.append("currentLocation", editLocation);
    fd.append("notes", editNotes);

    startTransition(async () => {
      const res = await updateCooperativeAnimalRecord(fd);
      if (!res.success) {
        setError(res.error || "Failed to update animal record.");
        return;
      }
      setEditingId(null);
      setSuccess("Animal weight & health record updated.");
      router.refresh();
    });
  };

  const filteredAnimals = data.animals.filter((a) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      a.tagNumber.toLowerCase().includes(q) ||
      (a.breed ?? "").toLowerCase().includes(q) ||
      (a.ownerMemberName ?? "").toLowerCase().includes(q) ||
      (a.cooperativeName ?? "").toLowerCase().includes(q)
    );
  });

  const needsCoopAssignment = isMember && !data.actor.cooperativeId;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FF8A00]">
            {isMember
              ? "Cooperative Member · Livestock Records"
              : isLeader
                ? "Cooperative Manager · Herd Registry"
                : "Cell Manager · Cooperative Animals"}
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-[#101827]">
            {isMember ? "My Animals & Records" : "Cooperative Animal Records"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {isMember
              ? "Register your animals, track weight growth and health status, and send reports directly to your Cooperative Manager."
              : "Track animals kept by members inside your cooperative, update weights/health logs, and review reports."}
          </p>
        </div>

        <Link
          href="/dashboard/field/member-reports"
          prefetch={false}
          className="inline-flex items-center gap-2 rounded-xl bg-[#FF8A00] px-4 py-2.5 text-xs font-bold text-[#101827] hover:bg-[#e57c00] transition shrink-0"
        >
          <ClipboardList className="h-4 w-4" />
          <span>{isMember ? "Submit Report to Manager" : "View Member Reports"}</span>
        </Link>
      </div>

      {data.schemaMissing && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-[#FF8A00] shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Database Migration Required (update.sql)</p>
            <p className="text-xs mt-1">
              Run <span className="font-mono font-semibold">update.sql</span> in your Supabase SQL Editor to enable cooperative animal ownership columns.
            </p>
          </div>
        </div>
      )}

      {needsCoopAssignment && !data.schemaMissing && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-[#FF8A00] shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Cooperative Assignment Pending</p>
            <p className="text-xs mt-1">
              Your Cell Manager has not linked your account to a cooperative yet. Once assigned to a cooperative (max 15 members), you can register and track your animals here.
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

      {/* Register New Animal Record */}
      {!data.schemaMissing && !needsCoopAssignment && (
        <form
          onSubmit={handleRegister}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4"
        >
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-[#FF8A00]">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#101827]">Add Animal Record</h2>
              <p className="text-xs text-slate-500">
                Leave Tag Number blank to automatically generate a standard PF-RW tag.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {isCellOrAdmin && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Cooperative *
                </label>
                <select
                  required
                  value={cooperativeId}
                  onChange={(e) => handleCoopChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[#101827]"
                >
                  <option value="">-- Select Cooperative --</option>
                  {data.cooperatives.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.cellName})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(isLeader || isCellOrAdmin) && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Owner Member *
                </label>
                <select
                  value={ownerMemberId}
                  onChange={(e) => setOwnerMemberId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[#101827]"
                >
                  {(selectedCoop?.members ?? []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.role === Role.COOPERATIVE_LEADER ? "(Manager)" : ""}
                    </option>
                  ))}
                  {(selectedCoop?.members ?? []).length === 0 && (
                    <option value={data.actor.id}>{data.actor.name}</option>
                  )}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Tag Number (Optional)
              </label>
              <input
                value={tagNumber}
                onChange={(e) => setTagNumber(e.target.value)}
                placeholder="Auto: PF-RW-2026-..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Breed / Type
              </label>
              <input
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                placeholder="e.g. Large White / Landrace"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Sex
              </label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[#101827]"
              >
                <option value="FEMALE">Female (Sow / Gilt)</option>
                <option value="MALE">Male (Boar)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Current Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={currentWeight}
                onChange={(e) => setCurrentWeight(e.target.value)}
                placeholder="e.g. 68"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Age (Months)
              </label>
              <input
                type="number"
                min="0"
                value={estimatedAge}
                onChange={(e) => setEstimatedAge(e.target.value)}
                placeholder="e.g. 7"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Health Status
              </label>
              <select
                value={healthStatus}
                onChange={(e) => setHealthStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[#101827]"
              >
                {HEALTH_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Pen / Location
              </label>
              <input
                value={currentLocation}
                onChange={(e) => setCurrentLocation(e.target.value)}
                placeholder="e.g. Pen B2 - Homestead"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Animal Notes
              </label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Feeding schedule, vaccination history, or growth notes..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={isPending}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#101827] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1f2937] disabled:opacity-60 transition cursor-pointer"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#FF8A00]" />
                ) : (
                  <PiggyBank className="h-4 w-4 text-[#FF8A00]" />
                )}
                <span>Save Animal Record</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Animal Inventory Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <PiggyBank className="h-5 w-5 text-[#FF8A00]" />
            <h2 className="text-sm font-bold text-[#101827]">
              Tracked Animals ({filteredAnimals.length})
            </h2>
          </div>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tag, breed, owner..."
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-[#101827] sm:w-64 focus:border-[#FF8A00] focus:outline-none"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50/70 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3">Tag &amp; Breed</th>
                {!isMember && <th className="px-5 py-3">Owner / Cooperative</th>}
                <th className="px-5 py-3">Weight &amp; Age</th>
                <th className="px-5 py-3">Health</th>
                <th className="px-5 py-3">Notes / Location</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-[#101827]">
              {filteredAnimals.length === 0 ? (
                <tr>
                  <td
                    colSpan={isMember ? 5 : 6}
                    className="px-5 py-10 text-center text-xs text-slate-500"
                  >
                    No animal records found yet. Add your first animal record above.
                  </td>
                </tr>
              ) : (
                filteredAnimals.map((animal) => {
                  const isEditing = editingId === animal.id;
                  return (
                    <tr key={animal.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3.5">
                        <p className="font-mono text-xs font-bold text-[#101827]">
                          {animal.tagNumber}
                        </p>
                        <p className="text-xs text-slate-500">
                          {animal.breed || "Standard"} {animal.sex ? `· ${animal.sex}` : ""}
                        </p>
                      </td>

                      {!isMember && (
                        <td className="px-5 py-3.5 text-xs">
                          <p className="font-semibold text-[#101827]">
                            {animal.ownerMemberName || "Unassigned"}
                          </p>
                          <p className="text-slate-500">{animal.cooperativeName || "—"}</p>
                        </td>
                      )}

                      <td className="px-5 py-3.5 text-xs">
                        {isEditing ? (
                          <div className="flex gap-1.5">
                            <input
                              type="number"
                              step="0.1"
                              value={editWeight}
                              onChange={(e) => setEditWeight(e.target.value)}
                              placeholder="kg"
                              className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                            />
                            <input
                              type="number"
                              value={editAge}
                              onChange={(e) => setEditAge(e.target.value)}
                              placeholder="mo"
                              className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                            />
                          </div>
                        ) : (
                          <>
                            <p className="font-semibold text-[#101827]">
                              {animal.currentWeight !== null
                                ? `${animal.currentWeight} kg`
                                : "Weight not set"}
                            </p>
                            <p className="text-slate-500">
                              {animal.estimatedAge !== null
                                ? `${animal.estimatedAge} months`
                                : "Age N/A"}
                            </p>
                          </>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-xs">
                        {isEditing ? (
                          <select
                            value={editHealth}
                            onChange={(e) => setEditHealth(e.target.value)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                          >
                            {HEALTH_STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              animal.healthStatus === PigHealthStatus.HEALTHY ||
                              animal.healthStatus === PigHealthStatus.RECOVERED
                                ? "bg-emerald-50 text-emerald-800"
                                : "bg-amber-50 text-amber-800"
                            }`}
                          >
                            {animal.healthStatus.replace(/_/g, " ")}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-xs text-slate-600 max-w-xs">
                        {isEditing ? (
                          <div className="space-y-1">
                            <input
                              value={editLocation}
                              onChange={(e) => setEditLocation(e.target.value)}
                              placeholder="Pen / Location"
                              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                            />
                            <input
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              placeholder="Notes"
                              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                            />
                          </div>
                        ) : (
                          <>
                            <p className="font-medium text-[#101827]">
                              {animal.currentLocation || "Homestead Pen"}
                            </p>
                            <p className="truncate text-slate-500">{animal.notes || "—"}</p>
                          </>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        {isEditing ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleSaveEdit(animal.id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#101827] px-2.5 py-1 text-[11px] font-semibold text-white cursor-pointer"
                            >
                              <Save className="h-3 w-3 text-[#FF8A00]" />
                              <span>Save</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="rounded-lg border border-slate-200 p-1 text-slate-500 cursor-pointer"
                              aria-label="Cancel edit"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => startEdit(animal)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-[#101827] hover:border-[#FF8A00] cursor-pointer"
                            >
                              <Edit3 className="h-3 w-3 text-[#FF8A00]" />
                              <span>Update</span>
                            </button>
                            <Link
                              href={`/dashboard/field/member-reports?pigId=${encodeURIComponent(animal.id)}`}
                              prefetch={false}
                              className="inline-flex items-center gap-1 rounded-lg bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-[#101827] border border-orange-200 hover:bg-orange-100"
                            >
                              <span>Report</span>
                            </Link>
                          </div>
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
    </div>
  );
}
