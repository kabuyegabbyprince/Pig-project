"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardList,
  Copy,
  Crown,
  Eye,
  EyeOff,
  IdCard,
  KeyRound,
  Loader2,
  MapPin,
  PiggyBank,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  UsersRound,
} from "lucide-react";
import {
  addCooperativeMember,
  assignCooperativeManager,
  assignExistingUserToCooperative,
  createCooperative,
  removeCooperativeMember,
  toggleCooperativeMemberActive,
  type CooperativesWorkspaceData,
} from "@/app/actions/cooperative";
import { LocationPicker } from "@/components/LocationPicker";

const MAX_COOPERATIVE_MEMBERS = 15;

export function CooperativeManagerClient({
  data,
}: {
  data: CooperativesWorkspaceData;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isCreatingCoop = pendingAction === "createCoop";
  const isAddingMember = pendingAction === "addMember";
  const isAssigningUser = pendingAction === "assignUser";

  const isCellManagerOrAdmin =
    data.actor.role === Role.CELL_MANAGER || data.actor.role === Role.SUPER_ADMIN;

  // Create cooperative form
  const [coopName, setCoopName] = useState("");
  const [coopCode, setCoopCode] = useState("");
  const [cellName, setCellName] = useState(data.actor.cellName ?? "");

  // Add member form
  const [selectedCoopId, setSelectedCoopId] = useState(
    data.cooperatives.find((c) => c.memberCount < c.maxMembers)?.id ??
      data.cooperatives[0]?.id ??
      ""
  );
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberPhone, setMemberPhone] = useState("");
  const [memberNationalId, setMemberNationalId] = useState("");
  const [memberDistrict, setMemberDistrict] = useState("");
  const [memberSector, setMemberSector] = useState("");
  const [memberCell, setMemberCell] = useState("");
  const [memberVillage, setMemberVillage] = useState("");
  const [memberRole, setMemberRole] = useState<string>(Role.COOPERATIVE_MEMBER);
  const [staticPassword, setStaticPassword] = useState("Coop@2026");
  const [showPassword, setShowPassword] = useState(true);
  const [lastCreatedCredentials, setLastCreatedCredentials] = useState<{
    name: string;
    email: string;
    password: string;
    coopName: string;
    role: string;
  } | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  // Assign unassigned user state
  const [assignUserId, setAssignUserId] = useState(data.unassignedUsers[0]?.id ?? "");
  const [assignCoopId, setAssignCoopId] = useState(
    data.cooperatives.find((c) => c.memberCount < c.maxMembers)?.id ??
      data.cooperatives[0]?.id ??
      ""
  );

  // Per-cooperative manager dropdown selection
  const [managerSelections, setManagerSelections] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const c of data.cooperatives) {
      initial[c.id] = c.leaderUserId ?? c.members[0]?.id ?? "";
    }
    return initial;
  });

  // 2-step removal confirm
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const handleCreateCoop = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isCreatingCoop) return;
    setError("");
    setSuccess("");
    const fd = new FormData();
    fd.append("name", coopName);
    fd.append("code", coopCode);
    fd.append("cellName", cellName);

    setPendingAction("createCoop");
    try {
      const res = await createCooperative(fd);
      if (!res.success) {
        setError(res.error || "Could not create cooperative.");
        return;
      }
      setSuccess(
        `Cooperative "${coopName}" created with a strict maximum capacity of ${MAX_COOPERATIVE_MEMBERS} members (including 1 Cooperative Manager).`
      );
      if (res.cooperativeId) {
        setSelectedCoopId(res.cooperativeId);
        setAssignCoopId(res.cooperativeId);
      }
      setCoopName("");
      setCoopCode("");
      setCellName("");
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handleAddMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAddingMember) return;
    setError("");
    setSuccess("");
    setCopiedCreds(false);

    const targetCoop = data.cooperatives.find((c) => c.id === selectedCoopId);
    const fd = new FormData();
    fd.append("cooperativeId", selectedCoopId);
    fd.append("name", memberName);
    fd.append("email", memberEmail);
    fd.append("phone", memberPhone);
    fd.append("nationalId", memberNationalId);
    fd.append("district", memberDistrict);
    fd.append("sector", memberSector);
    fd.append("cell", memberCell);
    fd.append("village", memberVillage);
    fd.append("role", memberRole);
    fd.append("staticPassword", staticPassword);

    const snapshotCreds = {
      name: memberName,
      email: memberEmail.trim().toLowerCase(),
      password: staticPassword,
      coopName: targetCoop?.name ?? "Cooperative",
      role:
        memberRole === Role.COOPERATIVE_LEADER
          ? "Cooperative Manager"
          : "Cooperative Member",
    };

    setPendingAction("addMember");
    try {
      const res = await addCooperativeMember(fd);
      if (!res.success) {
        setError(res.error || "Could not add cooperative member.");
        return;
      }
      setLastCreatedCredentials(snapshotCreds);
      setSuccess(
        `${snapshotCreds.name} added to ${snapshotCreds.coopName} as ${snapshotCreds.role}. They can sign in with their static initial password and change it in Personal Settings.`
      );
      setMemberName("");
      setMemberEmail("");
      setMemberPhone("");
      setMemberRole(Role.COOPERATIVE_MEMBER);
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handleAssignManager = async (cooperativeId: string, memberUserId: string) => {
    if (!memberUserId) {
      setError("Select a cooperative member to appoint as Cooperative Manager.");
      return;
    }
    setError("");
    setSuccess("");
    setPendingAction(`manager:${cooperativeId}`);
    try {
      const res = await assignCooperativeManager(cooperativeId, memberUserId);
      if (!res.success) {
        setError(res.error || "Could not change Cooperative Manager.");
        return;
      }
      setSuccess(
        "Cooperative Manager updated! The selected member now holds the Cooperative Manager role and the previous manager was moved back to Cooperative Member."
      );
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handleLinkExistingUser = async () => {
    if (!assignCoopId || !assignUserId) return;
    setError("");
    setSuccess("");
    setPendingAction("assignUser");
    try {
      const res = await assignExistingUserToCooperative(assignCoopId, assignUserId);
      if (!res.success) {
        setError(res.error || "Could not assign user.");
        return;
      }
      setSuccess("User assigned to cooperative.");
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handleToggleActive = async (userId: string) => {
    setError("");
    setSuccess("");
    setPendingAction(`toggle:${userId}`);
    try {
      const res = await toggleCooperativeMemberActive(userId);
      if (!res.success) {
        setError(res.error || "Failed to update account status.");
        return;
      }
      setSuccess("Member account status updated.");
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setError("");
    setSuccess("");
    setPendingAction(`remove:${userId}`);
    try {
      const res = await removeCooperativeMember(userId);
      if (!res.success) {
        setError(res.error || "Failed to remove member from cooperative.");
        return;
      }
      setConfirmRemoveId(null);
      setSuccess("Member unlinked from cooperative.");
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setPendingAction(null);
    }
  };

  const copyCredentials = async () => {
    if (!lastCreatedCredentials) return;
    const text = `Pig Project Rwanda — Cooperative Login\nCooperative: ${lastCreatedCredentials.coopName}\nRole: ${lastCreatedCredentials.role}\nEmail: ${lastCreatedCredentials.email}\nStatic Initial Password: ${lastCreatedCredentials.password}\nNote: Sign in and change your password in Personal Settings.`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCreds(true);
    } catch {
      setError("Could not copy to clipboard automatically; please copy manually.");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FF8A00]">
            {isCellManagerOrAdmin
              ? "Cell Manager · Cooperative Structure"
              : "Cooperative Manager · Team Roster"}
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-[#101827]">
            {isCellManagerOrAdmin
              ? "Cooperatives & Member Roster (Max 15)"
              : "My Cooperative Roster"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {isCellManagerOrAdmin
              ? "Create cooperatives capped at 15 people (1 Cooperative Manager + up to 14 members), assign or change the Cooperative Manager, and onboard members with static initial passwords."
              : "View your cooperative membership (maximum 15 including you as Cooperative Manager), oversee cooperative animals, and review incoming member reports."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/field/member-reports"
            prefetch={false}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-[#101827] hover:border-[#FF8A00] transition"
          >
            <ClipboardList className="h-4 w-4 text-[#FF8A00]" />
            <span>Member Reports</span>
          </Link>
          <Link
            href="/dashboard/field/my-animals"
            prefetch={false}
            className="inline-flex items-center gap-2 rounded-xl bg-[#101827] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1f2937] transition"
          >
            <PiggyBank className="h-4 w-4 text-[#FF8A00]" />
            <span>Cooperative Animals</span>
          </Link>
        </div>
      </div>

      {data.schemaMissing && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-[#FF8A00] shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Database Migration Required (update.sql)</p>
            <p className="mt-1 text-xs leading-relaxed">
              The new <span className="font-mono font-semibold">cooperatives</span> and{" "}
              <span className="font-mono font-semibold">cooperative_member_reports</span>{" "}
              tables have not been created in Supabase yet. Run{" "}
              <span className="font-mono font-semibold">update.sql</span> in your Supabase SQL Editor and refresh this page.
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

      {lastCreatedCredentials && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-[#FF8A00]" />
              <p className="text-xs font-bold uppercase tracking-wider text-[#101827]">
                Static Credentials Ready for {lastCreatedCredentials.name}
              </p>
            </div>
            <p className="text-xs text-slate-600">
              Email: <span className="font-mono font-semibold text-[#101827]">{lastCreatedCredentials.email}</span> · Static Password:{" "}
              <span className="font-mono font-semibold text-[#101827]">{lastCreatedCredentials.password}</span> · Role:{" "}
              <span className="font-semibold text-[#FF8A00]">{lastCreatedCredentials.role}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={copyCredentials}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-[#101827] hover:border-[#FF8A00] transition shrink-0 cursor-pointer"
          >
            <Copy className="h-3.5 w-3.5 text-[#FF8A00]" />
            <span>{copiedCreds ? "Copied!" : "Copy Login Details"}</span>
          </button>
        </div>
      )}

      {isCellManagerOrAdmin && !data.schemaMissing && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Create Cooperative Form */}
          <form
            id="create-cooperative-form"
            onSubmit={handleCreateCoop}
            className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4"
          >
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-[#FF8A00]">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#101827]">Create New Cooperative</h2>
                <p className="text-xs text-slate-500">
                  Strict capacity: max {MAX_COOPERATIVE_MEMBERS} members (including 1 manager).
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Cooperative Name *
                </label>
                <input
                  required
                  value={coopName}
                  onChange={(e) => setCoopName(e.target.value)}
                  placeholder="e.g. Koperative Twitezimbere"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Cell / Akagari *
                  </label>
                  <input
                    required
                    value={cellName}
                    onChange={(e) => setCellName(e.target.value)}
                    placeholder="e.g. Nyabisindu Cell"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Code (Optional)
                  </label>
                  <input
                    value={coopCode}
                    onChange={(e) => setCoopCode(e.target.value)}
                    placeholder="COOP-01"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isCreatingCoop}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#101827] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1f2937] disabled:opacity-60 transition cursor-pointer"
            >
              {isCreatingCoop ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#FF8A00]" />
              ) : (
                <Building2 className="h-4 w-4 text-[#FF8A00]" />
              )}
              <span>Create Cooperative</span>
            </button>
          </form>

          {/* Add Cooperative Member + Static Password Form */}
          <form
            id="add-cooperative-member-form"
            onSubmit={handleAddMember}
            className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4"
          >
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-[#FF8A00]">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#101827]">
                  Add Cooperative Member &amp; Static Password
                </h2>
                <p className="text-xs text-slate-500">
                  Assign a static initial password; members can update it anytime in Personal Settings.
                </p>
              </div>
            </div>

            {data.cooperatives.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                Create a cooperative first on the left before adding members.
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Target Cooperative *
                    </label>
                    <select
                      required
                      value={selectedCoopId}
                      onChange={(e) => setSelectedCoopId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
                    >
                      <option value="">-- Select Cooperative --</option>
                      {data.cooperatives.map((c) => {
                        const isFull = c.memberCount >= c.maxMembers;
                        return (
                          <option key={c.id} value={c.id} disabled={isFull}>
                            {c.name} ({c.cellName}) — {c.memberCount}/{c.maxMembers} members
                            {isFull ? " [FULL]" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Full Name *
                    </label>
                    <input
                      required
                      value={memberName}
                      onChange={(e) => setMemberName(e.target.value)}
                      placeholder="Mukamana Alice"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Email *
                    </label>
                    <input
                      required
                      type="email"
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      placeholder="member@cooperative.rw"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Phone Number *
                    </label>
                    <input
                      required
                      value={memberPhone}
                      onChange={(e) => setMemberPhone(e.target.value)}
                      placeholder="+250 788 000 000"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      National ID (Irangamuntu) *
                    </label>
                    <input
                      required
                      value={memberNationalId}
                      onChange={(e) => setMemberNationalId(e.target.value)}
                      placeholder="1199..."
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Role in Cooperative *
                    </label>
                    <select
                      value={memberRole}
                      onChange={(e) => setMemberRole(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
                    >
                      <option value={Role.COOPERATIVE_MEMBER}>Cooperative Member</option>
                      <option value={Role.COOPERATIVE_LEADER}>
                        Cooperative Manager (Replaces current manager if any)
                      </option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                      Member Address (District, Sector, Cell, Village) *
                    </p>
                    <LocationPicker
                      initialDistrictName={memberDistrict}
                      initialSectorName={memberSector}
                      initialCellName={memberCell}
                      initialVillageName={memberVillage}
                      onChange={(loc) => {
                        setMemberDistrict(loc.districtName);
                        setMemberSector(loc.sectorName);
                        setMemberCell(loc.cellName);
                        setMemberVillage(loc.villageName);
                      }}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Static Initial Password * (min 6 chars)
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          required
                          minLength={6}
                          type={showPassword ? "text" : "password"}
                          value={staticPassword}
                          onChange={(e) => setStaticPassword(e.target.value)}
                          placeholder="Static initial password"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 pr-10 font-mono text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#101827]"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <button
                        type="submit"
                        disabled={isAddingMember || !selectedCoopId}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF8A00] px-5 py-2 text-sm font-bold text-[#101827] hover:bg-[#e57c00] disabled:opacity-60 transition cursor-pointer shrink-0"
                      >
                        {isAddingMember ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserPlus className="h-4 w-4" />
                        )}
                        <span>Add Member</span>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {/* Unassigned Cooperative Users (legacy accounts before cooperatives table) */}
      {isCellManagerOrAdmin && data.unassignedUsers.length > 0 && data.cooperatives.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-[#101827]">
              Unassigned Cooperative Accounts ({data.unassignedUsers.length})
            </p>
            <p className="text-xs text-slate-500">
              Existing cooperative users not yet placed in a cooperative roster.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-[#101827]"
            >
              {data.unassignedUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
            <select
              value={assignCoopId}
              onChange={(e) => setAssignCoopId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-[#101827]"
            >
              {data.cooperatives.map((c) => (
                <option key={c.id} value={c.id} disabled={c.memberCount >= c.maxMembers}>
                  {c.name} ({c.memberCount}/{c.maxMembers})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleLinkExistingUser}
              disabled={isAssigningUser}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#101827] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1f2937] disabled:opacity-60 cursor-pointer"
            >
              {isAssigningUser ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FF8A00]" />
              ) : (
                <UserCheck className="h-3.5 w-3.5 text-[#FF8A00]" />
              )}
              <span>Assign to Cooperative</span>
            </button>
          </div>
        </div>
      )}

      {/* Cooperatives Roster List */}
      {data.cooperatives.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <UsersRound className="h-10 w-10 text-slate-300 mx-auto" />
          <p className="mt-3 text-base font-bold text-[#101827]">
            {isCellManagerOrAdmin
              ? "No Cooperatives Created Yet"
              : "No Cooperative Assigned Yet"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {isCellManagerOrAdmin
              ? "Create your first cooperative above and add up to 15 members including 1 Cooperative Manager."
              : "Ask your Cell Manager to assign you to a cooperative roster."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {data.cooperatives.map((coop) => {
            const pct = Math.min(100, Math.round((coop.memberCount / coop.maxMembers) * 100));
            const selectedManagerId =
              managerSelections[coop.id] ?? coop.leaderUserId ?? coop.members[0]?.id ?? "";

            return (
              <div
                key={coop.id}
                className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden"
              >
                <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-[#101827]">{coop.name}</h3>
                      {coop.code && (
                        <span className="rounded-md bg-slate-200/80 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
                          {coop.code}
                        </span>
                      )}
                      <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-bold text-[#FF8A00] border border-orange-200">
                        {coop.memberCount} / {coop.maxMembers} Members
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Cell: <span className="font-semibold text-[#101827]">{coop.cellName}</span> · Cooperative Manager:{" "}
                      <span className="font-semibold text-[#101827]">
                        {coop.leaderName || "Not yet assigned"}
                      </span>
                    </p>
                    <div className="w-56 h-1.5 rounded-full bg-slate-200 overflow-hidden mt-1">
                      <div
                        className={`h-full rounded-full ${
                          coop.memberCount >= coop.maxMembers ? "bg-rose-500" : "bg-[#FF8A00]"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {isCellManagerOrAdmin && coop.members.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Select / Change Manager:
                      </label>
                      <select
                        value={selectedManagerId}
                        onChange={(e) =>
                          setManagerSelections((prev) => ({
                            ...prev,
                            [coop.id]: e.target.value,
                          }))
                        }
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-[#101827] focus:border-[#FF8A00] focus:outline-none"
                      >
                        {coop.members
                          .filter((m) => m.isActive)
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} {m.id === coop.leaderUserId ? "(Current Manager)" : ""}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        disabled={
                          pendingAction === `manager:${coop.id}` ||
                          !selectedManagerId ||
                          selectedManagerId === coop.leaderUserId
                        }
                        onClick={() => handleAssignManager(coop.id, selectedManagerId)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#101827] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1f2937] disabled:opacity-50 transition cursor-pointer"
                      >
                        <RefreshCw
                          className={`h-3.5 w-3.5 text-[#FF8A00] ${
                            pendingAction === `manager:${coop.id}` ? "animate-spin" : ""
                          }`}
                        />
                        <span>Set Cooperative Manager</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50/70 text-[11px] uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Member</th>
                        <th className="px-5 py-3">Contact</th>
                        <th className="px-5 py-3">Role</th>
                        <th className="px-5 py-3">Animals</th>
                        <th className="px-5 py-3">Password</th>
                        <th className="px-5 py-3">Status</th>
                        {isCellManagerOrAdmin && <th className="px-5 py-3 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white text-[#101827]">
                      {coop.members.length === 0 ? (
                        <tr>
                          <td
                            colSpan={isCellManagerOrAdmin ? 7 : 6}
                            className="px-5 py-8 text-center text-xs text-slate-500"
                          >
                            No members assigned to {coop.name} yet. Add members above (up to{" "}
                            {coop.maxMembers} total).
                          </td>
                        </tr>
                      ) : (
                        coop.members.map((m) => {
                          const isManager = m.role === Role.COOPERATIVE_LEADER;
                          return (
                            <tr key={m.id} className="hover:bg-slate-50/70">
                              <td className="px-5 py-3">
                                <div className="font-semibold text-[#101827] flex items-center gap-2">
                                  <span>{m.name}</span>
                                  {isManager && (
                                    <Crown
                                      className="h-3.5 w-3.5 text-[#FF8A00]"
                                      aria-label="Cooperative Manager"
                                    />
                                  )}
                                </div>
                                {m.nationalId ? (
                                  <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                                    <IdCard className="h-3 w-3 text-[#FF8A00]" />
                                    <span>{m.nationalId}</span>
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-amber-600 font-medium mt-0.5">
                                    National ID pending
                                  </div>
                                )}
                              </td>
                              <td className="px-5 py-3 text-xs text-slate-600">
                                <p>{m.email}</p>
                                {m.phone && <p className="text-slate-400">{m.phone}</p>}
                                {(m.districtName || m.sectorName || m.cellName) && (
                                  <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                                    <MapPin className="h-3 w-3 text-slate-400" />
                                    <span>{[m.districtName, m.sectorName, m.cellName].filter(Boolean).join(" / ")}</span>
                                  </p>
                                )}
                              </td>
                              <td className="px-5 py-3">
                                <span
                                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                    isManager
                                      ? "bg-[#FF8A00] text-[#101827]"
                                      : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {isManager ? "Cooperative Manager" : "Cooperative Member"}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-xs font-semibold text-[#101827]">
                                {m.animalCount}
                              </td>
                              <td className="px-5 py-3 text-xs">
                                {m.mustChangePassword ? (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 font-medium text-amber-800 border border-amber-200">
                                    Static initial password
                                  </span>
                                ) : (
                                  <span className="text-slate-500">Custom password set</span>
                                )}
                              </td>
                              <td className="px-5 py-3">
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                    m.isActive
                                      ? "bg-emerald-50 text-emerald-800"
                                      : "bg-rose-50 text-rose-700"
                                  }`}
                                >
                                  <ShieldCheck className="h-3 w-3" />
                                  {m.isActive ? "Active" : "Suspended"}
                                </span>
                              </td>
                              {isCellManagerOrAdmin && (
                                <td className="px-5 py-3 text-right">
                                    <div className="inline-flex items-center gap-1.5">
                                      {!isManager && m.isActive && (
                                        <button
                                          type="button"
                                          disabled={pendingAction === `manager:${coop.id}`}
                                          onClick={() => handleAssignManager(coop.id, m.id)}
                                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-[#101827] hover:border-[#FF8A00] disabled:opacity-60 transition cursor-pointer"
                                        >
                                          Make Manager
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        disabled={pendingAction === `toggle:${m.id}`}
                                        onClick={() => handleToggleActive(m.id)}
                                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-60 transition cursor-pointer"
                                      >
                                        {m.isActive ? "Suspend" : "Activate"}
                                      </button>
                                      {confirmRemoveId === m.id ? (
                                        <div className="inline-flex items-center gap-1">
                                          <button
                                            type="button"
                                            disabled={pendingAction === `remove:${m.id}`}
                                            onClick={() => handleRemoveMember(m.id)}
                                            className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-rose-700 disabled:opacity-60 cursor-pointer"
                                          >
                                            Confirm
                                          </button>
                                        <button
                                          type="button"
                                          onClick={() => setConfirmRemoveId(null)}
                                          className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] text-slate-600 cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setConfirmRemoveId(m.id)}
                                        className="rounded-lg border border-rose-200 p-1 text-rose-600 hover:bg-rose-50 cursor-pointer"
                                        title="Unlink from cooperative"
                                        aria-label="Unlink from cooperative"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
