"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Search,
  UserCircle2,
  History,
  MapPin,
  IdCard,
  Building2,
  Edit3,
  X,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  Shield,
  Phone,
  Mail,
  Copy,
  Check,
} from "lucide-react";
import { UserRoleActions } from "./UserRoleActions";
import { DeleteUserButton } from "@/app/dashboard/admin/users/DeleteUserButton";
import { formatUserContact } from "@/lib/phone-utils";
import { ROLE_OPTIONS, normalizeRoleValue } from "@/lib/roles";
import { LocationPicker, LocationChangeData } from "@/components/LocationPicker";
import { updateUserAdminDetails } from "@/app/actions/user";

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  nationalId: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  districtName: string | null;
  sectorName: string | null;
  cellName: string | null;
  villageName: string | null;
  address: string | null;
  cooperativeId: string | null;
}

export interface ManagedCooperative {
  id: string;
  name: string;
  cellName: string;
}

export function UsersManagementClient({
  users: initialUsers,
  cooperatives,
  currentUserId,
}: {
  users: ManagedUser[];
  cooperatives: ManagedCooperative[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState<ManagedUser[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Edit Modal form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formNationalId, setFormNationalId] = useState("");
  const [formRole, setFormRole] = useState("");
  const [formCooperativeId, setFormCooperativeId] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formLocation, setFormLocation] = useState<LocationChangeData>({
    districtId: "",
    districtName: "",
    sectorId: "",
    sectorName: "",
    cellId: "",
    cellName: "",
    villageId: "",
    villageName: "",
  });

  const [modalFeedback, setModalFeedback] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const openEditModal = (u: ManagedUser) => {
    setEditingUser(u);
    setFormName(u.name);
    setFormEmail(u.email);
    setFormPhone(u.phone || "");
    setFormNationalId(u.nationalId || "");
    setFormRole(normalizeRoleValue(u.role) || u.role);
    setFormCooperativeId(u.cooperativeId || "");
    setFormAddress(u.address || "");
    setFormLocation({
      districtId: u.districtName || "",
      districtName: u.districtName || "",
      sectorId: u.sectorName || "",
      sectorName: u.sectorName || "",
      cellId: u.cellName || "",
      cellName: u.cellName || "",
      villageId: u.villageName || "",
      villageName: u.villageName || "",
    });
    setModalFeedback(null);
  };

  const closeEditModal = () => {
    setEditingUser(null);
    setModalFeedback(null);
  };

  const handleCopyNid = (nid: string, id: string) => {
    navigator.clipboard?.writeText(nid);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveUserDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setModalFeedback(null);

    const fd = new FormData();
    fd.append("userId", editingUser.id);
    fd.append("name", formName);
    fd.append("email", formEmail);
    fd.append("phone", formPhone);
    fd.append("nationalId", formNationalId);
    fd.append("role", formRole);
    fd.append("cooperativeId", formCooperativeId);
    fd.append("district", formLocation.districtName);
    fd.append("districtName", formLocation.districtName);
    fd.append("sector", formLocation.sectorName);
    fd.append("sectorName", formLocation.sectorName);
    fd.append("cell", formLocation.cellName);
    fd.append("cellName", formLocation.cellName);
    fd.append("village", formLocation.villageName);
    fd.append("villageName", formLocation.villageName);
    fd.append("address", formAddress);

    startTransition(async () => {
      const res = await updateUserAdminDetails(fd);
      if (res.success) {
        setModalFeedback({ type: "ok", text: res.message || "Saved successfully!" });
        // Update local user state
        setUsers((prev) =>
          prev.map((item) =>
            item.id === editingUser.id
              ? {
                  ...item,
                  name: formName,
                  email: formEmail,
                  phone: formPhone || null,
                  nationalId: editingUser.nationalId || formNationalId || null,
                  role: formRole,
                  cooperativeId: formCooperativeId || null,
                  districtName: formLocation.districtName || null,
                  sectorName: formLocation.sectorName || null,
                  cellName: formLocation.cellName || null,
                  villageName: formLocation.villageName || null,
                  address: formAddress || null,
                }
              : item
          )
        );
        setTimeout(() => {
          closeEditModal();
        }, 1200);
      } else {
        setModalFeedback({ type: "err", text: res.error || "Update failed." });
      }
    });
  };

  // Cooperative lookup map
  const coopMap = new Map<string, string>();
  cooperatives.forEach((c) => coopMap.set(c.id, c.name));

  // Quick stats
  const totalCount = users.length;
  const staffCount = users.filter(
    (u) =>
      u.role === "SUPER_ADMIN" ||
      u.role === "PROJECT_MANAGER" ||
      u.role === "FINANCE_OFFICER" ||
      u.role === "VETERINARIAN"
  ).length;
  const cellManagerCount = users.filter((u) => u.role === "CELL_MANAGER").length;
  const coopMemberCount = users.filter(
    (u) => u.role === "COOPERATIVE_LEADER" || u.role === "COOPERATIVE_MEMBER"
  ).length;

  const filteredUsers = users.filter((u) => {
    // Role filter
    if (roleFilter !== "ALL") {
      const norm = normalizeRoleValue(u.role);
      if (roleFilter === "STAFF") {
        if (norm === "CELL_MANAGER" || norm === "COOPERATIVE_LEADER" || norm === "COOPERATIVE_MEMBER") {
          return false;
        }
      } else if (norm !== roleFilter) {
        return false;
      }
    }

    // Search query
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const matchName = u.name.toLowerCase().includes(q);
    const matchEmail = u.email.toLowerCase().includes(q);
    const matchPhone = (u.phone || "").toLowerCase().includes(q);
    const matchNid = (u.nationalId || "").toLowerCase().includes(q);
    const matchDist = (u.districtName || "").toLowerCase().includes(q);
    const matchSec = (u.sectorName || "").toLowerCase().includes(q);
    const matchCell = (u.cellName || "").toLowerCase().includes(q);
    const matchVil = (u.villageName || "").toLowerCase().includes(q);
    const matchRole = u.role.toLowerCase().includes(q);
    const coopName = u.cooperativeId ? (coopMap.get(u.cooperativeId) || "").toLowerCase() : "";
    const matchCoop = coopName.includes(q);

    return (
      matchName ||
      matchEmail ||
      matchPhone ||
      matchNid ||
      matchDist ||
      matchSec ||
      matchCell ||
      matchVil ||
      matchRole ||
      matchCoop
    );
  });

  return (
    <div className="space-y-6">
      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Users
            </span>
            <Users className="h-4 w-4 text-[#FF8A00]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#101827]">{totalCount}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Staff Accounts
            </span>
            <Shield className="h-4 w-4 text-[#FF8A00]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#101827]">{staffCount}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Cell Managers
            </span>
            <MapPin className="h-4 w-4 text-[#FF8A00]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#101827]">{cellManagerCount}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Cooperative Roster
            </span>
            <Building2 className="h-4 w-4 text-[#FF8A00]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#101827]">{coopMemberCount}</p>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone, National ID, district, role..."
            className="w-full rounded-lg border border-slate-200 pl-9 pr-4 py-2 text-xs sm:text-sm text-[#101827] focus:border-[#FF8A00] focus:ring-1 focus:ring-[#FF8A00] outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            aria-label="Filter by role"
            className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-[#101827] focus:border-[#FF8A00] focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Roles ({users.length})</option>
            <option value="STAFF">All Core Staff ({staffCount})</option>
            <option value="SUPER_ADMIN">Super Admins</option>
            <option value="PROJECT_MANAGER">Project Managers</option>
            <option value="CELL_MANAGER">Cell Managers ({cellManagerCount})</option>
            <option value="COOPERATIVE_LEADER">Cooperative Managers</option>
            <option value="COOPERATIVE_MEMBER">Cooperative Members</option>
            <option value="VETERINARIAN">Veterinarians</option>
            <option value="FINANCE_OFFICER">Finance Officers</option>
          </select>
        </div>
      </div>

      {/* Main Users Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-[#101827]">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-4 py-3">User &amp; Contacts</th>
                <th className="px-4 py-3">National ID (Irangamuntu)</th>
                <th className="px-4 py-3">Duty / Residence Location</th>
                <th className="px-4 py-3">Cooperative</th>
                <th className="px-4 py-3">Role &amp; Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    No users matching criteria &quot;{search}&quot;.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const coopName = user.cooperativeId ? coopMap.get(user.cooperativeId) : null;
                  const hasLocation =
                    Boolean(user.districtName) ||
                    Boolean(user.sectorName) ||
                    Boolean(user.cellName);

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/70">
                      {/* Name & Contact */}
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-50 text-[#FF8A00] mt-0.5">
                            <UserCircle2 className="h-5 w-5" />
                          </span>
                          <div>
                            <div className="font-semibold text-[#101827] flex items-center gap-1.5">
                              <span>{user.name}</span>
                              {user.id === currentUserId && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-bold text-slate-600">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <Mail className="h-3 w-3 text-slate-400" />
                              <span>{user.email}</span>
                            </div>
                            {user.phone && (
                              <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                <Phone className="h-3 w-3 text-slate-400" />
                                <span>{user.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* National ID */}
                      <td className="px-4 py-3">
                        {user.nationalId ? (
                          <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-mono font-semibold text-[#101827]">
                            <IdCard className="h-3.5 w-3.5 text-[#FF8A00]" />
                            <span>{user.nationalId}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyNid(user.nationalId!, user.id)}
                              className="ml-1 text-slate-400 hover:text-[#101827]"
                              title="Copy National ID"
                            >
                              {copiedId === user.id ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 border border-amber-200/80">
                            <AlertCircle className="h-3 w-3 text-amber-600" />
                            Not registered
                          </span>
                        )}
                      </td>

                      {/* Location (District, Sector, Cell, Village) */}
                      <td className="px-4 py-3">
                        {hasLocation ? (
                          <div className="space-y-0.5 text-xs text-slate-700">
                            <div className="font-semibold text-[#101827] flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-[#FF8A00]" />
                              <span>
                                {[user.districtName, user.sectorName]
                                  .filter(Boolean)
                                  .join(" / ") || "—"}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 pl-4">
                              {[user.cellName, user.villageName].filter(Boolean).join(" · ") ||
                                "Cell/Village pending"}
                            </div>
                            {user.address && (
                              <div className="text-[11px] text-slate-400 italic pl-4">
                                {user.address}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            No location assigned
                          </span>
                        )}
                      </td>

                      {/* Cooperative */}
                      <td className="px-4 py-3">
                        {coopName ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800 border border-slate-200">
                            <Building2 className="h-3 w-3 text-[#FF8A00]" />
                            <span>{coopName}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      {/* Role & Access Status */}
                      <td className="px-4 py-3">
                        <UserRoleActions
                          userId={user.id}
                          currentRole={user.role}
                          isActive={user.isActive}
                          isCurrentUser={user.id === currentUserId}
                        />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(user)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-[#101827] hover:border-[#FF8A00] hover:bg-orange-50 hover:text-[#FF8A00] transition"
                            title={`Edit full details for ${user.name}`}
                          >
                            <Edit3 className="h-3.5 w-3.5 text-[#FF8A00]" />
                            <span>Profile</span>
                          </button>

                          <Link
                            href={`/dashboard/history?userId=${user.id}`}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:text-[#101827] border border-slate-200 transition"
                            title={`View activity history for ${user.name}`}
                          >
                            <History className="h-3.5 w-3.5 text-slate-400" />
                          </Link>

                          <DeleteUserButton
                            userId={user.id}
                            userName={user.name}
                            isCurrentUser={user.id === currentUserId}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Full User Details Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#FF8A00]">
                  <IdCard className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-[#101827]">
                    Edit User Profile &amp; Location Details
                  </h3>
                  <p className="text-xs text-slate-500">
                    Comprehensive citizen and staff governance matching update.sql schema.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalFeedback && (
              <div
                className={`flex items-start gap-2 rounded-lg p-3 text-xs font-medium border ${
                  modalFeedback.type === "ok"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-rose-200 bg-rose-50 text-rose-800"
                }`}
              >
                {modalFeedback.type === "ok" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                )}
                <span>{modalFeedback.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveUserDetails} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:ring-1 focus:ring-[#FF8A00] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:ring-1 focus:ring-[#FF8A00] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+250 780 000 000"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:ring-1 focus:ring-[#FF8A00] outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      National ID (Irangamuntu)
                    </label>
                    {editingUser.nationalId && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <Lock className="h-3 w-3 text-amber-600" />
                        Locked
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    disabled={Boolean(editingUser.nationalId)}
                    value={formNationalId}
                    onChange={(e) => setFormNationalId(e.target.value)}
                    maxLength={16}
                    placeholder="1 1990 8 0000000 0 00 (16 digits)"
                    className={`w-full rounded-lg border px-3 py-2 text-sm font-mono focus:border-[#FF8A00] focus:ring-1 focus:ring-[#FF8A00] outline-none ${
                      editingUser.nationalId
                        ? "bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed"
                        : "border-slate-200 text-[#101827]"
                    }`}
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    {editingUser.nationalId
                      ? "National ID is permanently locked against editing once registered."
                      : "Can be entered once. It will be locked permanently once saved."}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    System Role *
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:ring-1 focus:ring-[#FF8A00] outline-none cursor-pointer"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Cooperative Assignment
                  </label>
                  <select
                    value={formCooperativeId}
                    onChange={(e) => setFormCooperativeId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:ring-1 focus:ring-[#FF8A00] outline-none cursor-pointer"
                  >
                    <option value="">-- No Cooperative Assigned --</option>
                    {cooperatives.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.cellName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Location Picker */}
              <div className="border-t border-slate-100 pt-4">
                <div className="mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#101827]">
                    Duty / Residence Location (Rwanda)
                  </span>
                  <p className="text-[11px] text-slate-500">
                    District, Sector, Cell, and Village assignment.
                  </p>
                </div>

                <LocationPicker
                  initialDistrictName={formLocation.districtName}
                  initialSectorName={formLocation.sectorName}
                  initialCellName={formLocation.cellName}
                  initialVillageName={formLocation.villageName}
                  onChange={(loc) => setFormLocation(loc)}
                />

                <div className="mt-3">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Specific Street / Landmark Address
                  </label>
                  <input
                    type="text"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="e.g. Near Cell Office, House No. 12"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:ring-1 focus:ring-[#FF8A00] outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={isPending}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#101827] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1f2937] disabled:opacity-60 cursor-pointer"
                >
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FF8A00]" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#FF8A00]" />
                  )}
                  <span>{isPending ? "Saving changes..." : "Save Profile Details"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
