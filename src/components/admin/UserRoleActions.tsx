"use client";

import { useState, useTransition } from "react";
import { Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { toggleUserActive, updateUserRole } from "@/app/actions/user";

const ROLES = [
  "SUPER_ADMIN",
  "PROJECT_MANAGER",
  "FIELD_OFFICER",
  "VETERINARIAN",
  "FINANCE_OFFICER",
  "TRAINER",
  "FUNDER",
] as const;

export function UserRoleActions({
  userId,
  currentRole,
  isActive,
  isCurrentUser,
}: {
  userId: string;
  currentRole: string;
  isActive: boolean;
  isCurrentUser: boolean;
}) {
  const [role, setRole] = useState(currentRole);
  const [active, setActive] = useState(isActive);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleRoleChange = (nextRole: string) => {
    if (isCurrentUser || nextRole === role) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await updateUserRole(userId, nextRole);
      if (res.success) {
        setRole(nextRole);
        setFeedback({ type: "ok", text: "Role saved" });
      } else {
        setFeedback({ type: "err", text: res.error || "Update failed" });
      }
    });
  };

  const handleToggleActive = () => {
    if (isCurrentUser) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await toggleUserActive(userId);
      if (res.success && typeof res.isActive === "boolean") {
        setActive(res.isActive);
        setFeedback({ type: "ok", text: res.isActive ? "Activated" : "Suspended" });
      } else {
        setFeedback({ type: "err", text: res.error || "Status update failed" });
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={role}
        disabled={isCurrentUser || isPending}
        onChange={(e) => handleRoleChange(e.target.value)}
        aria-label="User role"
        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={handleToggleActive}
        disabled={isCurrentUser || isPending}
        title={isCurrentUser ? "Current user status cannot be changed" : active ? "Suspend account" : "Activate account"}
        className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
          active
            ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
        }`}
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : active ? (
          <ShieldCheck className="h-3 w-3" />
        ) : (
          <ShieldAlert className="h-3 w-3" />
        )}
        <span>{active ? "Active" : "Suspended"}</span>
      </button>

      {isPending && (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600">
          <Loader2 className="h-3 w-3 animate-spin" />
          Updating...
        </span>
      )}

      {!isPending && feedback && (
        <span
          className={`text-[11px] font-medium ${
            feedback.type === "ok" ? "text-emerald-700" : "text-rose-600"
          }`}
        >
          {feedback.text}
        </span>
      )}
    </div>
  );
}
