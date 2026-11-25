"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, DollarSign, Loader2, Smartphone } from "lucide-react";
import { updateFinanceMoMoMerchantCode } from "@/app/actions/livestock-finance";

export function FinanceMoMoSettingsCard({
  momoMerchantCode,
}: {
  momoMerchantCode: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [momoCodeInput, setMomoCodeInput] = useState(momoMerchantCode);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleUpdateMoMo = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const fd = new FormData();
    fd.append("momoMerchantCode", momoCodeInput);

    startTransition(async () => {
      const res = await updateFinanceMoMoMerchantCode(fd);
      if (!res.success) {
        setError(res.error || "Could not update MoMo code.");
        return;
      }
      setSuccess("MoMo Merchant Code saved.");
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={handleUpdateMoMo}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#FF8A00] shrink-0">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#101827]">MoMo Merchant Code Configuration</h2>
            <p className="text-xs text-slate-500">
              Active merchant code displayed to Cell Managers for member qualification payments (16,000 RWF + 2,800 RWF tax).
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-mono font-semibold ${
            momoMerchantCode
              ? "bg-slate-100 text-[#101827]"
              : "bg-amber-50 text-amber-800 border border-amber-200"
          }`}
        >
          {momoMerchantCode ? momoMerchantCode : "Not Configured"}
        </span>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-medium text-rose-800">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-3.5 py-2 text-xs font-medium text-[#101827] flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#FF8A00] shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
            MoMo Merchant Code / USSD *
          </label>
          <input
            required
            value={momoCodeInput}
            onChange={(e) => setMomoCodeInput(e.target.value)}
            placeholder="Enter merchant USSD or MoMo Pay code"
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono text-[#101827] focus:border-[#FF8A00] focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#101827] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1f2937] disabled:opacity-60 transition cursor-pointer shrink-0"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#FF8A00]" />
          ) : (
            <DollarSign className="h-4 w-4 text-[#FF8A00]" />
          )}
          <span>Save MoMo Code</span>
        </button>
      </div>
    </form>
  );
}
