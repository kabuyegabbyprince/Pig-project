import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { FileText, ArrowLeft, Calendar, CheckCircle2, HeartPulse, Plus } from "lucide-react";
import { getVeterinaryDateSummaries } from "@/app/actions/veterinary";

export const dynamic = "force-dynamic";

function formatReportDate(dateStr: string) {
  try {
    const clean = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    const parsed = parseISO(clean);
    if (Number.isNaN(parsed.getTime())) return dateStr;
    return format(parsed, "MMM d, yyyy");
  } catch {
    return dateStr;
  }
}

export default async function VetReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "VETERINARIAN" && session.user.role !== "SUPER_ADMIN")) {
    redirect("/dashboard");
  }

  let totalExams = 0;
  let healthyCount = 0;
  let badStatusCount = 0;
  let dateSummaries: Awaited<ReturnType<typeof getVeterinaryDateSummaries>>["summary"] = [];
  let totalPigsAvailable = 0;

  try {
    const [examsCount, healthy, badStatus, dateSummaryResult] = await Promise.all([
      prisma.veterinaryRecord.count(),
      prisma.pig.count({
        where: { healthStatus: { in: ["HEALTHY", "RECOVERED"] }, deletedAt: null },
      }),
      prisma.pig.count({
        where: { healthStatus: { in: ["SICK", "UNDER_TREATMENT", "CRITICAL"] }, deletedAt: null },
      }),
      getVeterinaryDateSummaries(),
    ]);

    totalExams = examsCount;
    healthyCount = healthy;
    badStatusCount = badStatus;
    dateSummaries = dateSummaryResult.summary;
    totalPigsAvailable = dateSummaryResult.totalPigsAvailable;
  } catch (err) {
    console.error("Failed to load VetReportsPage:", err);
  }

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
              Veterinary Reports (All Tested by Date)
            </h1>
            <p className="text-xs text-slate-500">
              Summary of all examined pigs grouped by examination date, health outcomes, and medications prescribed.
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

      {/* KPI Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Pigs in System
          </span>
          <p className="mt-2 text-2xl font-bold text-[#101827]">{totalPigsAvailable}</p>
          <p className="mt-0.5 text-xs text-slate-500">Registered livestock</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Examinations Done
          </span>
          <p className="mt-2 text-2xl font-bold text-[#FF8A00]">{totalExams}</p>
          <p className="mt-0.5 text-xs text-slate-500">Recorded clinical checks</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Healthy / Cleared Herd
          </span>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{healthyCount}</p>
          <p className="mt-0.5 text-xs text-slate-500">Ready for Finance &amp; Handover</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Bad Status Cases
          </span>
          <p className="mt-2 text-2xl font-bold text-rose-700">{badStatusCount}</p>
          <p className="mt-0.5 text-xs text-slate-500">Sick / on medication</p>
        </div>
      </div>

      {/* Summary of All Tested Pigs & Date Done */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileText className="h-5 w-5 text-[#FF8A00]" />
            <div>
              <h2 className="text-sm font-bold text-[#101827]">
                Tested Pigs Summary by Date Done ({dateSummaries.length} Date(s))
              </h2>
              <p className="text-xs text-slate-500">
                Daily breakdown of every pig examined, tests conducted, and prescribed medication.
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Date Done</th>
                <th className="px-6 py-3.5 text-right">Total Tested</th>
                <th className="px-6 py-3.5 text-right">Healthy</th>
                <th className="px-6 py-3.5 text-right">Bad Status</th>
                <th className="px-6 py-3.5">Tested Pigs &amp; Status</th>
                <th className="px-6 py-3.5">Tests Done / Findings</th>
                <th className="px-6 py-3.5">Medication Prescribed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-[#101827]">
              {dateSummaries.map((row) => (
                <tr key={row.date} className="hover:bg-slate-50/70 transition-colors align-top">
                  <td className="px-6 py-4 whitespace-nowrap font-semibold text-[#101827]">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#FF8A00]" />
                      <span>{formatReportDate(row.date)}</span>
                    </div>
                    <span className="ml-6 block font-mono text-[11px] text-slate-400">
                      {row.date}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-[#FF8A00]">
                    {row.pigsExamined}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-emerald-700">
                    {row.healthyPigs}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-rose-700">
                    {row.sickPigs}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5 max-w-xs">
                      {row.testedPigs.map((tp) => {
                        const isBad =
                          tp.healthStatus === "SICK" ||
                          tp.healthStatus === "UNDER_TREATMENT" ||
                          tp.healthStatus === "CRITICAL";
                        return (
                          <span
                            key={tp.pigId}
                            title={`${tp.diagnosis}${tp.medication && tp.medication !== "None" ? ` | Meds: ${tp.medication}` : ""}`}
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold ${
                              isBad
                                ? "bg-rose-50 border-rose-200 text-rose-800"
                                : "bg-emerald-50 border-emerald-200 text-emerald-800"
                            }`}
                          >
                            {isBad ? (
                              <HeartPulse className="h-3 w-3 shrink-0" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3 shrink-0" />
                            )}
                            {tp.tagNumber}
                          </span>
                        );
                      })}
                      {row.testedPigs.length === 0 && (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-700 max-w-xs">
                    {row.diseaseDescription}
                  </td>
                  <td className="px-6 py-4 text-slate-700 max-w-xs">
                    {row.treatmentDescription}
                  </td>
                </tr>
              ))}
              {dateSummaries.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No veterinary examinations have been recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
