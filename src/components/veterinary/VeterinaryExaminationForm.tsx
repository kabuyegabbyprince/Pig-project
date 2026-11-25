"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Stethoscope, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { PigHealthStatus } from "@prisma/client";
import { recordIndividualPigExamination } from "@/app/actions/veterinary";

interface PigOption {
  id: string;
  tagNumber: string;
  healthStatus: PigHealthStatus;
  breed: string | null;
}

interface VeterinaryExaminationFormProps {
  pigs: PigOption[];
  backHref?: string;
}

export function VeterinaryExaminationForm({ pigs, backHref = "/dashboard/vet" }: VeterinaryExaminationFormProps) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];

  const [pigId, setPigId] = useState<string>("");
  const [diagnosis, setDiagnosis] = useState<string>("");
  const [healthStatus, setHealthStatus] = useState<string>(PigHealthStatus.HEALTHY);
  const [medication, setMedication] = useState<string>("");
  const [examDate, setExamDate] = useState<string>(today);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isSickOrTreatment =
    healthStatus === PigHealthStatus.SICK ||
    healthStatus === PigHealthStatus.UNDER_TREATMENT ||
    healthStatus === PigHealthStatus.CRITICAL;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!pigId) {
      setErrorMessage("Please select a pig from the dropdown.");
      return;
    }

    if (!diagnosis.trim()) {
      setErrorMessage("Please enter the test done / clinical findings.");
      return;
    }

    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("pigId", pigId);
      fd.set("diagnosis", diagnosis);
      fd.set("healthStatus", healthStatus);
      fd.set("medication", medication);
      fd.set("date", examDate);

      const res = await recordIndividualPigExamination(fd);
      if (res && !res.success) {
        setErrorMessage(res.error || "Failed to record examination.");
        setIsSubmitting(false);
      } else {
        setSuccessMessage("Examination recorded successfully! Redirecting...");
        setTimeout(() => {
          router.push(backHref);
          router.refresh();
        }, 1000);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link
          href={backHref}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Log Individual Pig Examination
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Select a pig, record test findings, set health status, and prescribe medication.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 shadow-xs flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-[#FF8A00] shrink-0" />
          <p className="text-xs font-bold text-[#101827]">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 shadow-xs flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-rose-700 shrink-0" />
          <p className="text-xs font-bold text-rose-800">{errorMessage}</p>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-6 py-4 flex items-center gap-2.5">
          <Stethoscope className="h-5 w-5 text-[#FF8A00]" />
          <h2 className="text-base font-bold text-[#101827]">Clinical Examination Form</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Pig Dropdown */}
            <div className="sm:col-span-2">
              <label htmlFor="pigId" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Select Pig (Tag Number) *
              </label>
              <select
                id="pigId"
                required
                value={pigId}
                onChange={(e) => setPigId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-mono text-[#101827] focus:border-[#FF8A00] focus:outline-none"
              >
                <option value="">-- Choose Pig from System Registry ({pigs.length} available) --</option>
                {pigs.map((p) => (
                  <option key={p.id} value={p.id}>
                    Tag: {p.tagNumber} {p.breed ? `(${p.breed})` : ""} — Status: {p.healthStatus}
                  </option>
                ))}
              </select>
            </div>

            {/* Examination Date */}
            <div>
              <label htmlFor="examDate" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Examination Date *
              </label>
              <input
                type="date"
                id="examDate"
                required
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
              />
            </div>

            {/* Health Status */}
            <div>
              <label htmlFor="healthStatus" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Health Status *
              </label>
              <select
                id="healthStatus"
                value={healthStatus}
                onChange={(e) => setHealthStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-[#101827] focus:border-[#FF8A00] focus:outline-none"
              >
                <option value={PigHealthStatus.HEALTHY}>Healthy (Cleared)</option>
                <option value={PigHealthStatus.SICK}>Sick (Bad Status)</option>
                <option value={PigHealthStatus.UNDER_TREATMENT}>Under Treatment (Bad Status)</option>
                <option value={PigHealthStatus.CRITICAL}>Critical (Bad Status)</option>
                <option value={PigHealthStatus.RECOVERED}>Recovered</option>
              </select>
            </div>

            {/* Test Done (Diagnosis) */}
            <div className="sm:col-span-2">
              <label htmlFor="diagnosis" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Test Done / Clinical Diagnosis *
              </label>
              <textarea
                id="diagnosis"
                required
                rows={3}
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="Enter diagnostic tests performed, clinical findings, symptoms..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
              />
            </div>

            {/* Medication (if sick / under treatment) */}
            <div className="sm:col-span-2">
              <label htmlFor="medication" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Medication Prescribed {isSickOrTreatment ? "(Required for Bad Status)" : "(Optional)"}
              </label>
              <input
                type="text"
                id="medication"
                required={isSickOrTreatment}
                value={medication}
                onChange={(e) => setMedication(e.target.value)}
                placeholder="e.g. Antibiotics, Iron injections, Dewormer..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
              />
              {isSickOrTreatment && (
                <p className="mt-1 text-[11px] font-medium text-amber-700">
                  This pig will be added to the Bad Status list until its status is updated to Healthy/Recovered.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Link
              href={backHref}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-[#FF8A00] px-6 py-2.5 text-xs font-bold text-[#101827] hover:bg-[#e57c00] disabled:opacity-60 transition cursor-pointer"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Save Examination Record</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
