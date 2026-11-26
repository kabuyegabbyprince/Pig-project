"use client";

import { useEffect } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard action/render error:", error);
  }, [error]);

  const isStaleAction =
    error.message?.includes("unexpected response") ||
    error.message?.includes("was not found on the server");

  return (
    <div className="mx-auto my-12 max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xs">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-[#FF8A00]">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-xl font-bold text-[#101827]">
        {isStaleAction ? "Session or page needs a refresh" : "Something went wrong"}
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        {isStaleAction
          ? "The server updated while this page was open. Refresh the page and submit your action again."
          : error.message || "An unexpected error occurred while processing your request."}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-lg bg-[#101827] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1f2937] transition-colors cursor-pointer"
        >
          <RefreshCw className="h-4 w-4 text-[#FF8A00]" />
          <span>Refresh Page</span>
        </button>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
