"use client";

import { useState, useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deleteUser } from "@/app/actions/user";

export function DeleteUserButton({
  userId,
  userName,
  isCurrentUser,
}: {
  userId: string;
  userName: string;
  isCurrentUser: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = () => {
    if (isCurrentUser) return;
    setError("");
    startTransition(async () => {
      const res = await deleteUser(userId);
      if (res && !res.success && res.error) {
        setError(res.error);
      }
      setConfirming(false);
    });
  };

  if (isCurrentUser) {
    return (
      <span className="inline-flex items-center text-xs text-[#8a9990] italic">
        Current user
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      {confirming ? (
        <>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            <span>{isPending ? "Deleting..." : "Confirm"}</span>
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={isPending}
            className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={isPending}
          title={`Delete ${userName}`}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition disabled:opacity-50 border border-transparent hover:border-red-200"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Delete</span>
        </button>
      )}
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </div>
  );
}
