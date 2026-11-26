"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Calendar, Search, X, Plus, 
  CheckCircle2, Activity, FileText, HeartPulse, Loader2
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { updatePigHealthStatus } from "@/app/actions/veterinary";
import { PigHealthStatus } from "@prisma/client";

export interface DateSummaryRecord {
  date: string;
  pigsExamined: number;
  healthyPigs?: number;
  notYetExamined: number;
  sickPigs: number;
  diseaseDescription: string;
  treatmentDescription: string;
  testedPigs?: Array<{
    pigId: string;
    tagNumber: string;
    healthStatus: string;
    diagnosis: string;
    medication: string;
  }>;
}

export interface BadStatusPigItem {
  id: string;
  tagNumber: string;
  healthStatus: string;
  status: string;
  latestDiagnosis: string;
  latestMedication: string;
  examinationDate: string;
}

interface VeterinaryRecordsTableClientProps {
  records: DateSummaryRecord[];
  badStatusPigs: BadStatusPigItem[];
  totalPigsAvailable: number;
  newRecordHref: string;
}

export function VeterinaryRecordsTableClient({
  records,
  badStatusPigs,
  totalPigsAvailable,
  newRecordHref,
}: VeterinaryRecordsTableClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"REPORTS" | "BAD_STATUS">("REPORTS");

  const [dateFilter, setDateFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (dateFilter && r.date !== dateFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesDate = r.date.toLowerCase().includes(query);
        const matchesDisease = r.diseaseDescription.toLowerCase().includes(query);
        const matchesTreatment = r.treatmentDescription.toLowerCase().includes(query);
        if (!matchesDate && !matchesDisease && !matchesTreatment) {
          return false;
        }
      }
      return true;
    });
  }, [records, dateFilter, searchTerm]);

  const totalExaminedSum = useMemo(() => {
    return records.reduce((acc, curr) => acc + curr.pigsExamined, 0);
  }, [records]);

  const totalSickSum = badStatusPigs.length;

  const handleMarkRecovered = (pigId: string, tag: string) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await updatePigHealthStatus(pigId, PigHealthStatus.HEALTHY);
      if (!res.success) {
        setError(`Failed to update status for ${tag}.`);
      } else {
        setSuccess(`Pig ${tag} marked as Healthy / Recovered and removed from Bad Status list.`);
        router.refresh();
      }
    });
  };

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Veterinary Dashboard</h2>
          <p className="mt-1 text-xs text-slate-500">
            Clinical examinations, tested pigs reports, and Bad Status (Sick / On Medication) management.
          </p>
        </div>
        <Link 
          href={newRecordHref}
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold text-[#101827] bg-[#FF8A00] hover:bg-[#e57c00] shadow-xs transition-all"
        >
          <Plus className="-ml-0.5 mr-1.5 h-4 w-4" />
          Log Examination
        </Link>
      </div>

      {success && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-xs font-bold text-[#101827] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#FF8A00]" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-slate-500 hover:text-[#101827]">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Pigs Available</span>
            <Activity className="h-4 w-4 text-[#FF8A00]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#101827]">{totalPigsAvailable}</p>
          <p className="mt-0.5 text-xs text-slate-500">Total registered in system</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cumulative Examined</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{totalExaminedSum}</p>
          <p className="mt-0.5 text-xs text-slate-500">Pigs clinically inspected</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Bad Status (Sick / Meds)</span>
            <HeartPulse className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-700">{totalSickSum}</p>
          <p className="mt-0.5 text-xs text-slate-500">Awaiting recovery update</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("REPORTS")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "REPORTS"
              ? "bg-[#101827] text-white"
              : "bg-white border border-slate-200 text-slate-700 hover:border-[#FF8A00]"
          }`}
        >
          <FileText className="h-4 w-4 text-[#FF8A00]" />
          Examination Reports Summary ({records.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("BAD_STATUS")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "BAD_STATUS"
              ? "bg-rose-600 text-white"
              : "bg-white border border-slate-200 text-rose-700 hover:border-rose-300"
          }`}
        >
          <HeartPulse className="h-4 w-4" />
          Bad Status / Sick on Medication ({badStatusPigs.length})
        </button>
      </div>

      {/* TAB 1: REPORTS SUMMARY */}
      {activeTab === "REPORTS" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
              <div className="relative w-full sm:w-[220px] shrink-0">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Calendar className="h-4 w-4" />
                </div>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="block w-full pl-10 pr-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-white text-[#101827] focus:border-[#FF8A00] focus:outline-none"
                />
              </div>

              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search diseases, treatments, or date..."
                  className="block w-full pl-10 pr-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-white text-[#101827] focus:border-[#FF8A00] focus:outline-none"
                />
              </div>

              {(dateFilter || searchTerm) && (
                <button
                  onClick={() => { setDateFilter(""); setSearchTerm(""); }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-[#101827] bg-slate-100 transition shrink-0 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            <div className="text-xs font-medium text-slate-500">
              Showing <span className="font-bold text-[#101827]">{filteredRecords.length}</span> of{" "}
              <span className="font-bold text-[#101827]">{records.length}</span> examination dates
            </div>
          </div>

          <div className="bg-white shadow-xs rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-3.5">Examination Date</th>
                    <th className="px-6 py-3.5 text-right">Pigs Tested</th>
                    <th className="px-6 py-3.5 text-right">Not Yet Examined</th>
                    <th className="px-6 py-3.5 text-right">Sick Pigs</th>
                    <th className="px-6 py-3.5">Test / Disease Description</th>
                    <th className="px-6 py-3.5">Medication / Treatment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-[#101827]">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                        No veterinary examination reports match your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((row) => (
                      <tr key={row.date} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap font-semibold text-[#101827]">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-[#FF8A00]" />
                            <span>{formatDateDisplay(row.date)}</span>
                          </div>
                          <span className="text-[11px] text-slate-400 ml-6 block font-mono">{row.date}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-[#FF8A00]">
                          {row.pigsExamined}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-amber-600">
                          {row.notYetExamined}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-rose-600">
                          {row.sickPigs}
                        </td>
                        <td className="px-6 py-4 max-w-xs text-slate-700">
                          <p className="truncate">{row.diseaseDescription}</p>
                          {row.testedPigs && row.testedPigs.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {row.testedPigs.slice(0, 6).map((tp) => (
                                <span
                                  key={tp.pigId}
                                  className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#101827]"
                                >
                                  {tp.tagNumber}
                                </span>
                              ))}
                              {row.testedPigs.length > 6 && (
                                <span className="text-[10px] text-slate-400">
                                  +{row.testedPigs.length - 6} more
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 max-w-xs truncate text-slate-700">
                          {row.treatmentDescription}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BAD STATUS (SICK / ON MEDICATION) LIST */}
      {activeTab === "BAD_STATUS" && (
        <div className="bg-white shadow-xs rounded-2xl border border-slate-200 overflow-hidden space-y-4">
          <div className="border-b border-slate-100 bg-rose-50/50 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <HeartPulse className="h-5 w-5 text-rose-600" />
              <div>
                <h3 className="text-base font-bold text-[#101827]">Bad Status Registry (Sick / On Medication)</h3>
                <p className="text-xs text-slate-500">
                  Pigs currently receiving treatment or in bad health. Once recovered, update status to remove from this list.
                </p>
              </div>
            </div>
            <span className="rounded-full bg-rose-100 text-rose-800 px-3 py-1 text-xs font-bold">
              {badStatusPigs.length} Active Bad Status
            </span>
          </div>

          <div className="overflow-x-auto p-6 pt-0">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Pig Tag Number</th>
                  <th className="px-4 py-3">Health Status</th>
                  <th className="px-4 py-3">Latest Diagnosis / Test</th>
                  <th className="px-4 py-3">Medication</th>
                  <th className="px-4 py-3">Exam Date</th>
                  <th className="px-4 py-3 text-right">Action (Mark Recovered)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-[#101827]">
                {badStatusPigs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
                      <p className="font-bold text-[#101827]">No pigs currently in Bad Status!</p>
                      <p className="text-xs text-slate-400 mt-0.5">All examined livestock are healthy or recovered.</p>
                    </td>
                  </tr>
                ) : (
                  badStatusPigs.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono font-bold text-[#101827]">
                        {p.tagNumber}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-md bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[11px] font-bold text-rose-800">
                          {p.healthStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium">
                        {p.latestDiagnosis}
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium">
                        {p.latestMedication}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {formatDateDisplay(p.examinationDate)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleMarkRecovered(p.id, p.tagNumber)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer shadow-xs"
                        >
                          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          <span>Mark Recovered / Healthy</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
