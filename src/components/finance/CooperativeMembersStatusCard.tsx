"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeftCircle,
  CheckCircle2,
  Clock,
  PiggyBank,
  Search,
  UsersRound,
  Wallet,
  XCircle,
} from "lucide-react";
import type { SerializedFinanceCooperativeOverview } from "@/lib/finance-types";
import { formatRwf } from "@/lib/format-rwf";

type MemberLifecycleFilter =
  | "ALL"
  | "PAID"
  | "PENDING_PAYMENT"
  | "UNPAID"
  | "RECEIVED_PIG"
  | "NOT_RECEIVED_PIG"
  | "RETURNED"
  | "NOT_RETURNED";

function formatShortDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function CooperativeMembersStatusCard({
  cooperatives,
}: {
  cooperatives: SerializedFinanceCooperativeOverview[];
}) {
  const [selectedCoopId, setSelectedCoopId] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<MemberLifecycleFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const totals = useMemo(() => {
    let totalMembers = 0;
    let paid = 0;
    let receivedPig = 0;
    let returnedMembers = 0;
    let totalReturnedPiglets = 0;

    for (const c of cooperatives) {
      totalMembers += c.memberCount;
      paid += c.paidCount;
      receivedPig += c.receivedPigCount;
      returnedMembers += c.returnedMembersCount;
      totalReturnedPiglets += c.totalReturnedPiglets;
    }

    return {
      totalCooperatives: cooperatives.length,
      totalMembers,
      paid,
      receivedPig,
      returnedMembers,
      totalReturnedPiglets,
    };
  }, [cooperatives]);

  const filteredCooperatives = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return cooperatives
      .filter((coop) => selectedCoopId === "ALL" || coop.id === selectedCoopId)
      .map((coop) => {
        const filteredMembers = coop.members.filter((m) => {
          if (statusFilter === "PAID" && m.paymentStatus !== "VERIFIED") return false;
          if (statusFilter === "PENDING_PAYMENT" && m.paymentStatus !== "PENDING") return false;
          if (
            statusFilter === "UNPAID" &&
            m.paymentStatus !== "UNPAID" &&
            m.paymentStatus !== "REJECTED"
          ) {
            return false;
          }
          if (statusFilter === "RECEIVED_PIG" && !m.receivedPig) return false;
          if (statusFilter === "NOT_RECEIVED_PIG" && m.receivedPig) return false;
          if (statusFilter === "RETURNED" && !m.hasReturned) return false;
          if (statusFilter === "NOT_RETURNED" && (!m.receivedPig || m.hasReturned)) return false;

          if (!q) return true;
          return (
            m.memberName.toLowerCase().includes(q) ||
            (m.memberPhone && m.memberPhone.toLowerCase().includes(q)) ||
            m.memberEmail.toLowerCase().includes(q) ||
            coop.name.toLowerCase().includes(q) ||
            (m.pigTag && m.pigTag.toLowerCase().includes(q)) ||
            (m.momoReference && m.momoReference.toLowerCase().includes(q))
          );
        });

        return {
          ...coop,
          filteredMembers,
        };
      })
      .filter((coop) => {
        if (selectedCoopId !== "ALL") return true;
        if (statusFilter !== "ALL" || q) return coop.filteredMembers.length > 0;
        return true;
      });
  }, [cooperatives, selectedCoopId, statusFilter, searchQuery]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      {/* Card Header & Summary */}
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#FF8A00] shrink-0">
              <UsersRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#101827]">
                All Cooperatives &amp; Member Lifecycle Status ({totals.totalCooperatives} Cooperatives · {totals.totalMembers} Members)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Track every cooperative and member across qualification payments, pig receipts, and piglet returns.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-800">
              <Wallet className="h-3 w-3" />
              {totals.paid} Paid
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[#101827]">
              <PiggyBank className="h-3 w-3 text-[#FF8A00]" />
              {totals.receivedPig} Received Pigs
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-sky-800">
              <ArrowLeftCircle className="h-3 w-3" />
              {totals.returnedMembers} Returned ({totals.totalReturnedPiglets} piglets)
            </span>
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search member, cooperative, tag, MoMo..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs text-[#101827] focus:border-[#FF8A00] focus:outline-none"
            />
          </div>

          <select
            value={selectedCoopId}
            onChange={(e) => setSelectedCoopId(e.target.value)}
            aria-label="Filter by Cooperative"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-[#101827] focus:border-[#FF8A00] focus:outline-none"
          >
            <option value="ALL">All Cooperatives ({cooperatives.length})</option>
            {cooperatives.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.memberCount} members · {c.paidCount} paid · {c.receivedPigCount} pigs)
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as MemberLifecycleFilter)}
            aria-label="Filter by Member Status"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-[#101827] focus:border-[#FF8A00] focus:outline-none"
          >
            <option value="ALL">All Member Statuses</option>
            <option value="PAID">Paid &amp; Verified Money</option>
            <option value="PENDING_PAYMENT">Payment Pending Verification</option>
            <option value="UNPAID">Not Paid / Rejected</option>
            <option value="RECEIVED_PIG">Received Pigs</option>
            <option value="NOT_RECEIVED_PIG">Have Not Received Pigs</option>
            <option value="RETURNED">Returned Piglets</option>
            <option value="NOT_RETURNED">Given Pig — Not Returned Yet</option>
          </select>
        </div>
      </div>

      {/* Cooperatives List */}
      <div className="divide-y divide-slate-200">
        {filteredCooperatives.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            {cooperatives.length === 0
              ? "No cooperatives have been created yet."
              : "No cooperatives or members match the selected filter."}
          </div>
        ) : (
          filteredCooperatives.map((coop) => (
            <div key={coop.id} className="bg-white">
              {/* Cooperative Sub-header */}
              <div className="flex flex-col gap-2 bg-slate-50/70 px-5 py-3.5 border-b border-slate-100 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-[#101827]">{coop.name}</h3>
                    {coop.code && (
                      <span className="rounded-md bg-slate-200/70 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700">
                        {coop.code}
                      </span>
                    )}
                    <span className="text-xs text-slate-500">
                      Cell: <strong className="text-slate-700">{coop.cellName}</strong>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Cell Manager: <span className="font-medium text-slate-700">{coop.cellManagerName || "—"}</span>
                    {" · "}
                    Coop Manager: <span className="font-medium text-slate-700">{coop.leaderName || "Not assigned"}</span>
                    {" · "}
                    Members: <span className="font-semibold text-[#101827]">{coop.memberCount} / {coop.maxMembers}</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                  <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-800">
                    Paid: {coop.paidCount}/{coop.memberCount}
                  </span>
                  <span className="rounded-md border border-orange-200 bg-orange-50 px-2 py-0.5 text-[#101827]">
                    Pigs Given: {coop.receivedPigCount}/{coop.memberCount}
                  </span>
                  <span className="rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-sky-800">
                    Returned: {coop.returnedMembersCount} ({coop.totalReturnedPiglets} piglets)
                  </span>
                </div>
              </div>

              {/* Cooperative Members Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-white uppercase tracking-wider text-[11px] text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5">Member</th>
                      <th className="px-4 py-2.5">Payment Status</th>
                      <th className="px-4 py-2.5">Pig Received Status</th>
                      <th className="px-4 py-2.5">Returned Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-[#101827]">
                    {coop.filteredMembers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-xs text-slate-500">
                          {coop.memberCount === 0
                            ? "No members enrolled in this cooperative yet."
                            : "No members in this cooperative match the active status filter."}
                        </td>
                      </tr>
                    ) : (
                      coop.filteredMembers.map((m) => (
                        <tr key={m.memberId} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-[#101827]">{m.memberName}</span>
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                {m.memberRole === "COOPERATIVE_LEADER" ? "Coop Manager" : "Member"}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {m.memberPhone || m.memberEmail}
                            </p>
                          </td>

                          <td className="px-4 py-3">
                            {m.paymentStatus === "VERIFIED" ? (
                              <div>
                                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Paid &amp; Verified ({formatRwf(m.paymentAmount ?? "18800")})
                                </span>
                                {m.momoReference && (
                                  <p className="mt-0.5 font-mono text-[10px] text-slate-500">
                                    MoMo: {m.momoReference} · {formatShortDate(m.paymentDate)}
                                  </p>
                                )}
                              </div>
                            ) : m.paymentStatus === "PENDING" ? (
                              <div>
                                <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                                  <Clock className="h-3 w-3" />
                                  Pending Verification
                                </span>
                                {m.momoReference && (
                                  <p className="mt-0.5 font-mono text-[10px] text-slate-500">
                                    MoMo: {m.momoReference}
                                  </p>
                                )}
                              </div>
                            ) : m.paymentStatus === "REJECTED" ? (
                              <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                                <XCircle className="h-3 w-3" />
                                Rejected
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                Not Paid
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {m.receivedPig ? (
                              <div>
                                <span className="inline-flex items-center gap-1 rounded-md border border-orange-200 bg-orange-50 px-2 py-0.5 text-[11px] font-bold text-[#101827]">
                                  <PiggyBank className="h-3 w-3 text-[#FF8A00]" />
                                  Received · {m.pigTag || "Assigned"}
                                </span>
                                <p className="mt-0.5 text-[10px] text-slate-500">
                                  {m.pigHealthStatus || "HEALTHY"} · {formatShortDate(m.pigReceivedDate)}
                                </p>
                              </div>
                            ) : (
                              <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                                Not Received
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {m.hasReturned ? (
                              <div>
                                <span className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-800">
                                  <ArrowLeftCircle className="h-3 w-3" />
                                  Returned {m.returnedCount} / {m.expectedReturn}
                                </span>
                                <p className="mt-0.5 text-[10px] text-slate-500">
                                  {m.revolvingStatus || "ACTIVE"} · {formatShortDate(m.lastReturnDate)}
                                </p>
                              </div>
                            ) : m.receivedPig ? (
                              <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50/70 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                                Not Returned (0 / {m.expectedReturn})
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
