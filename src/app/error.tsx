"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xs">
        <h1 className="text-xl font-bold text-[#101827]">Unable to complete request</h1>
        <p className="mt-2 text-sm text-slate-600">
          Please refresh the page and try again.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-full bg-[#101827] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#1f2937] transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5 text-[#FF8A00]" />
            <span>Refresh Page</span>
          </button>
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
