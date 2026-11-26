"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  HeartPulse,
  Loader2,
  Plus,
  RefreshCw,
  Stethoscope,
  X,
} from "lucide-react";
import { PigHealthStatus } from "@prisma/client";
import { format, parseISO } from "date-fns";
import { updatePigHealthStatus } from "@/app/actions/veterinary";
import type { BadStatusPigItem } from "@/components/veterinary/VeterinaryRecordsTableClient";

export interface ReturnedPigletVerificationItem {
  id: string;
  returnDate: string;
  pigId: string | null;
  pigTag: string;
  beneficiaryName: string;
  beneficiaryNumber: string;
  veterinaryVerified: boolean;
  healthStatus: string;
  status: string;
}

export function BadStatusManagerClient({
  badStatusPigs,
  pendingReturns,
}: {
  badStatusPigs: BadStatusPigItem[];
  pendingReturns: ReturnedPigletVerificationItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formatDateDisplay = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    try {
      const clean = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
      const parsed = parseISO(clean);
      if (Number.isNaN(parsed.getTime())) return dateStr;
      return format(parsed, "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  const handleMarkOk = (pigId: string, tag: string) => {
    setError(null);
    setSuccess(null);
    setUpdatingId(pigId);
    startTransition(async () => {
      try {
        const res = await updatePigHealthStatus(pigId, PigHealthStatus.HEALTHY);
        if (!res.success) {
          setError(`Failed to update status for ${tag}.`);
        } else {
          setSuccess(
            `Pig ${tag} marked as OK (Healthy) and removed from the Bad Status list.`
          );
          router.refresh();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to update status for ${tag}.`);
      } finally {
        setUpdatingId(null);
      }
    });
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/vet"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#101827]">
              Bad Status (Sick / On Medication)
            </h1>
            <p className="text-xs text-slate-500">
              Pigs currently sick or receiving medication. Once recovered, mark a pig as OK (Healthy) and it automatically leaves this list.
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/vet/veterinary/new"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#FF8A00] px-4 py-2.5 text-xs font-bold text-[#101827] hover:bg-[#e57c00] shadow-xs transition"
        >
          <Plus className="h-4 w-4" />
          <span>Log Examination</span>
        </Link>
      </div>

      {success && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-xs font-bold text-[#101827] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#FF8A00] shrink-0" />
            <span>{success}</span>
          </div>
          <button type="button" onClick={() => setSuccess(null)} className="text-slate-500 hover:text-[#101827] cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Bad Status Registry */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 bg-rose-50/60 px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <HeartPulse className="h-5 w-5 text-rose-600" />
            <div>
              <span className="text-sm font-bold text-[#101827]">
                Active Bad Status Livestock ({badStatusPigs.length})
              </span>
              <p className="text-xs text-slate-500">
                Blocked from Finance handover &amp; Cell Manager distribution until cleared.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-rose-100 text-rose-800 px-3 py-1 text-xs font-bold shrink-0">
            {badStatusPigs.length} Sick / On Meds
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Pig Tag Number</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Test Done / Diagnosis</th>
                <th className="px-6 py-3.5">Medication Prescribed</th>
                <th className="px-6 py-3.5">Exam Date</th>
                <th className="px-6 py-3.5 text-right">Update Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-[#101827]">
              {badStatusPigs.map((p) => {
                const rowBusy = isPending && updatingId === p.id;
                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-[#101827]">
                      {p.tagNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex rounded-md bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[11px] font-bold text-rose-800">
                        {p.healthStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-medium">
                      {p.latestDiagnosis}
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-medium">
                      {p.latestMedication}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                      {formatDateDisplay(p.examinationDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/dashboard/vet/veterinary/new?pigId=${p.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-[#101827] hover:border-[#FF8A00] transition"
                        >
                          <Stethoscope className="h-3.5 w-3.5 text-[#FF8A00]" />
                          <span>Re-test</span>
                        </Link>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleMarkOk(p.id, p.tagNumber)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer transition"
                        >
                          {rowBusy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          <span>Mark OK (Healthy)</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {badStatusPigs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-500 mb-2" />
                    <p className="text-sm font-bold text-[#101827]">
                      No pigs currently in Bad Status
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      All examined pigs are healthy or recovered and cleared from medication.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Returned Piglets awaiting initial veterinary clearance (only rendered when pending) */}
      {pendingReturns.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="border-b border-slate-200 bg-amber-50/60 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <RefreshCw className="h-5 w-5 text-[#FF8A00]" />
              <div>
                <span className="text-sm font-bold text-[#101827]">
                  Returned Piglets Awaiting Initial Vet Check ({pendingReturns.length})
                </span>
                <p className="text-xs text-slate-500">
                  Piglets returned from revolving cycles that still need clinical inspection before redistribution.
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3">Return Date</th>
                  <th className="px-6 py-3">Pig Tag</th>
                  <th className="px-6 py-3">Returned By</th>
                  <th className="px-6 py-3">Current Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-[#101827]">
                {pendingReturns.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3 whitespace-nowrap text-slate-600">
                      {formatDateDisplay(item.returnDate)}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap font-mono font-bold text-[#101827]">
                      {item.pigTag}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span className="font-semibold">{item.beneficiaryName}</span>{" "}
                      <span className="text-slate-400">({item.beneficiaryNumber})</span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-slate-600">
                      {item.healthStatus} · {item.status}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-right">
                      {item.pigId ? (
                        <Link
                          href={`/dashboard/vet/veterinary/new?pigId=${item.pigId}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#101827] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1f2937] transition"
                        >
                          <Stethoscope className="h-3.5 w-3.5 text-[#FF8A00]" />
                          <span>Inspect &amp; Clear</span>
                        </Link>
                      ) : (
                        <span className="text-slate-400">Legacy record</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
