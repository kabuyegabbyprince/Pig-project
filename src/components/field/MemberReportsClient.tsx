"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Send,
  Tag,
} from "lucide-react";
import {
  reviewMemberReport,
  submitMemberReportToLeader,
  type CooperativesWorkspaceData,
  type MemberReportStatus,
  type MemberReportType,
} from "@/app/actions/cooperative";

const REPORT_TYPES: { value: MemberReportType; label: string }[] = [
  { value: "ROUTINE_UPDATE", label: "Routine Animal Check-in" },
  { value: "WEIGHT_GROWTH", label: "Weight & Growth Update" },
  { value: "HEALTH_CHECK", label: "Health Issue / Vet Request" },
  { value: "BIRTH_NEW_PIGLETS", label: "New Piglets / Birth Record" },
  { value: "READY_TO_SELL", label: "Animals Ready to Sell" },
  { value: "FEED_NEEDED", label: "Animal Feed Needed" },
];

function getStatusBadge(status: MemberReportStatus) {
  if (status === "ESCALATED_TO_CELL") {
    return "bg-orange-100 text-[#101827] border border-orange-300";
  }
  if (status === "REVIEWED") {
    return "bg-emerald-50 text-emerald-800 border border-emerald-200";
  }
  return "bg-slate-100 text-slate-700 border border-slate-200";
}

function getStatusLabel(status: MemberReportStatus) {
  if (status === "ESCALATED_TO_CELL") return "Escalated to Cell Manager";
  if (status === "REVIEWED") return "Reviewed by Cooperative Manager";
  return "Submitted to Cooperative Manager";
}

export function MemberReportsClient({
  data,
  initialPigId = "",
}: {
  data: CooperativesWorkspaceData;
  initialPigId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const role = data.actor.role;
  const isMember = role === Role.COOPERATIVE_MEMBER;
  const isLeader = role === Role.COOPERATIVE_LEADER;
  const isCellOrAdmin = role === Role.CELL_MANAGER || role === Role.SUPER_ADMIN;

  const actorCoop =
    data.cooperatives.find((c) => c.id === data.actor.cooperativeId) ??
    data.cooperatives[0];

  // Member report submission form state
  const cooperativeId = actorCoop?.id ?? "";
  const [pigId, setPigId] = useState(initialPigId);
  const [reportType, setReportType] = useState<MemberReportType>("ROUTINE_UPDATE");
  const [animalCount, setAnimalCount] = useState("1");
  const [estimatedWeightKg, setEstimatedWeightKg] = useState("");
  const [summary, setSummary] = useState("");
  const [notes, setNotes] = useState("");

  // Review state
  const [statusFilter, setStatusFilter] = useState<string>(
    isCellOrAdmin ? "ESCALATED_TO_CELL" : "ALL"
  );
  const [reviewNotesMap, setReviewNotesMap] = useState<Record<string, string>>({});

  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const fd = new FormData();
    fd.append("cooperativeId", cooperativeId);
    fd.append("pigId", pigId);
    fd.append("reportType", reportType);
    fd.append("animalCount", animalCount);
    fd.append("estimatedWeightKg", estimatedWeightKg);
    fd.append("summary", summary);
    fd.append("notes", notes);

    startTransition(async () => {
      const res = await submitMemberReportToLeader(fd);
      if (!res.success) {
        setError(res.error || "Could not submit report.");
        return;
      }
      setSuccess(
        actorCoop?.leaderName
          ? `Report sent directly to Cooperative Manager (${actorCoop.leaderName}).`
          : "Report submitted to your cooperative."
      );
      setPigId("");
      setAnimalCount("1");
      setEstimatedWeightKg("");
      setSummary("");
      setNotes("");
      router.refresh();
    });
  };

  const handleReview = (
    reportId: string,
    nextStatus: "REVIEWED" | "ESCALATED_TO_CELL"
  ) => {
    setError("");
    setSuccess("");
    const leaderNote = reviewNotesMap[reportId] ?? "";

    startTransition(async () => {
      const res = await reviewMemberReport(reportId, nextStatus, leaderNote);
      if (!res.success) {
        setError(res.error || "Could not update report status.");
        return;
      }
      setSuccess(
        nextStatus === "ESCALATED_TO_CELL"
          ? "Report escalated to Cell Manager for official action."
          : "Report marked as reviewed."
      );
      router.refresh();
    });
  };

  const filteredReports = data.memberReports.filter((r) => {
    if (statusFilter === "ALL") return true;
    return r.status === statusFilter;
  });

  const needsCoopAssignment = isMember && !data.actor.cooperativeId;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FF8A00]">
            {isMember
              ? "Cooperative Member · Direct Reporting"
              : isLeader
                ? "Cooperative Manager · Incoming Member Reports"
                : "Cell Manager · Cooperative Escalations"}
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-[#101827]">
            {isMember
              ? "Submit Report to Cooperative Manager"
              : isLeader
                ? "Member Reports & Escalations"
                : "Cooperative Member Reports & Escalations"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {isMember
              ? `Keep your Cooperative Manager${actorCoop?.leaderName ? ` (${actorCoop.leaderName})` : ""} informed about animal growth, health, births, or animals ready for market.`
              : isLeader
                ? "Review incoming member updates from your cooperative and escalate ready-to-sell livestock or urgent cases to the Cell Manager."
                : "Inspect escalated reports from Cooperative Managers and prepare official Gebyian stock reports when ready to sell."}
          </p>
        </div>

        {isCellOrAdmin && (
          <Link
            href="/dashboard/field/stock-reports"
            prefetch={false}
            className="inline-flex items-center gap-2 rounded-xl bg-[#FF8A00] px-4 py-2.5 text-xs font-bold text-[#101827] hover:bg-[#e57c00] transition shrink-0"
          >
            <Tag className="h-4 w-4" />
            <span>Prepare Gebyian Stock Report</span>
          </Link>
        )}
      </div>

      {data.schemaMissing && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-[#FF8A00] shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Database Migration Required (update.sql)</p>
            <p className="text-xs mt-1">
              Run <span className="font-mono font-semibold">update.sql</span> in Supabase SQL Editor to create the{" "}
              <span className="font-mono font-semibold">cooperative_member_reports</span> table.
            </p>
          </div>
        </div>
      )}

      {needsCoopAssignment && !data.schemaMissing && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-[#FF8A00] shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Cooperative Assignment Pending</p>
            <p className="text-xs mt-1">
              Ask your Cell Manager to assign you to a cooperative before sending reports to your Cooperative Manager.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-[#101827] flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#FF8A00] shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Submit Report Form (Cooperative Member or Cooperative Manager) */}
      {!data.schemaMissing && !needsCoopAssignment && (isMember || isLeader) && (
        <form
          onSubmit={handleSubmitReport}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-[#FF8A00]">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#101827]">
                  New Report to Cooperative Manager
                </h2>
                <p className="text-xs text-slate-500">
                  Cooperative: <span className="font-semibold text-[#101827]">{actorCoop?.name || "Assigned Cooperative"}</span>
                  {actorCoop?.leaderName ? ` · Manager: ${actorCoop.leaderName}` : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Report Category *
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as MemberReportType)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[#101827]"
              >
                {REPORT_TYPES.map((rt) => (
                  <option key={rt.value} value={rt.value}>
                    {rt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Linked Animal Record
              </label>
              <select
                value={pigId}
                onChange={(e) => setPigId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[#101827]"
              >
                <option value="">-- Optional / General Herd --</option>
                {data.animals.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.tagNumber} ({a.breed || "Standard"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Animal Count *
              </label>
              <input
                type="number"
                min="1"
                required
                value={animalCount}
                onChange={(e) => setAnimalCount(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#101827]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Estimated Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={estimatedWeightKg}
                onChange={(e) => setEstimatedWeightKg(e.target.value)}
                placeholder="e.g. 75"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#101827]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Report Headline / Summary *
              </label>
              <input
                required
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="e.g. Two Large White pigs reached 78kg and are ready for market"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Detailed Notes (Optional)
              </label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Feeding progress, symptoms observed, or suggested pickup date..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-[#101827] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1f2937] disabled:opacity-60 transition cursor-pointer"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#FF8A00]" />
              ) : (
                <Send className="h-4 w-4 text-[#FF8A00]" />
              )}
              <span>Send Report to Cooperative Manager</span>
            </button>
          </div>
        </form>
      )}

      {/* Reports Inbox & History */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ClipboardList className="h-5 w-5 text-[#FF8A00]" />
            <h2 className="text-sm font-bold text-[#101827]">
              {isMember
                ? `My Submitted Reports (${filteredReports.length})`
                : `Cooperative Member Reports (${filteredReports.length})`}
            </h2>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              { key: "ALL", label: "All" },
              { key: "SUBMITTED", label: "Pending" },
              { key: "REVIEWED", label: "Reviewed" },
              { key: "ESCALATED_TO_CELL", label: "Escalated" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                  statusFilter === tab.key
                    ? "bg-[#101827] text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:border-[#FF8A00]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredReports.length === 0 ? (
            <div className="px-6 py-10 text-center text-xs text-slate-500">
              No member reports match this filter yet.
            </div>
          ) : (
            filteredReports.map((report) => (
              <div key={report.id} className="p-5 sm:p-6 space-y-3 hover:bg-slate-50/50">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#101827]">
                        {report.reportType.replace(/_/g, " ")}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getStatusBadge(
                          report.status
                        )}`}
                      >
                        {getStatusLabel(report.status)}
                      </span>
                      {report.pigTag && (
                        <span className="rounded-md bg-orange-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#FF8A00]">
                          Tag: {report.pigTag}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-[#101827]">{report.summary}</h3>
                    <p className="text-xs text-slate-600">
                      From <span className="font-semibold text-[#101827]">{report.memberName}</span>{" "}
                      ({report.cooperativeName}) · {report.animalCount} animal(s)
                      {report.estimatedWeightKg ? ` · Est. ${report.estimatedWeightKg} kg` : ""} ·{" "}
                      {new Date(report.createdAt).toLocaleDateString()}
                    </p>
                    {report.notes && (
                      <p className="text-xs text-slate-600 pt-1">{report.notes}</p>
                    )}
                    {report.leaderNotes && (
                      <p className="mt-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs text-[#101827]">
                        <span className="font-semibold">Manager Note:</span> {report.leaderNotes}
                      </p>
                    )}
                  </div>

                  {/* Review & Escalation Controls for Cooperative Manager & Cell Manager */}
                  {(isLeader || isCellOrAdmin) && (
                    <div className="flex flex-col sm:items-end gap-2 shrink-0 sm:w-72">
                      {report.status !== "ESCALATED_TO_CELL" && (
                        <>
                          <input
                            value={reviewNotesMap[report.id] ?? ""}
                            onChange={(e) =>
                              setReviewNotesMap((prev) => ({
                                ...prev,
                                [report.id]: e.target.value,
                              }))
                            }
                            placeholder="Add manager note (optional)"
                            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-[#101827]"
                          />
                          <div className="flex flex-wrap gap-2">
                            {report.status === "SUBMITTED" && (
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleReview(report.id, "REVIEWED")}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#101827] hover:border-[#FF8A00] cursor-pointer"
                              >
                                Mark Reviewed
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleReview(report.id, "ESCALATED_TO_CELL")}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#101827] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1f2937] cursor-pointer"
                            >
                              <span>Escalate to Cell Manager</span>
                              <ArrowUpRight className="h-3.5 w-3.5 text-[#FF8A00]" />
                            </button>
                          </div>
                        </>
                      )}

                      {isCellOrAdmin && report.reportType === "READY_TO_SELL" && (
                        <Link
                          href="/dashboard/field/stock-reports"
                          prefetch={false}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#FF8A00] px-3 py-1.5 text-xs font-bold text-[#101827] hover:bg-[#e57c00]"
                        >
                          <Tag className="h-3.5 w-3.5" />
                          <span>Send Stock to Gebyian Manager</span>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
