"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import { ArrowLeft, Crown, Loader2, Save, UsersRound } from "lucide-react";
import { enrollCooperativeBeneficiary } from "@/app/actions/beneficiary";

export type ScopedCoopOption = {
  id: string;
  name: string;
  cellName: string;
  memberCount: number;
  maxMembers: number;
};

export function EnrollCooperativeBeneficiaryForm({
  cooperatives,
  backHref,
  manageCoopsHref,
}: {
  cooperatives: ScopedCoopOption[];
  backHref: string;
  manageCoopsHref: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [cooperativeId, setCooperativeId] = useState(
    cooperatives.find((c) => c.memberCount < c.maxMembers)?.id ?? cooperatives[0]?.id ?? ""
  );
  const [role, setRole] = useState<string>(Role.COOPERATIVE_MEMBER);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [staticPassword, setStaticPassword] = useState("Coop@2026");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const fd = new FormData();
    fd.append("cooperativeId", cooperativeId);
    fd.append("role", role);
    fd.append("fullName", fullName);
    fd.append("email", email);
    fd.append("phone", phone);
    fd.append("nationalId", nationalId);
    fd.append("staticPassword", staticPassword);

    startTransition(async () => {
      const res = await enrollCooperativeBeneficiary(fd);
      if (!res.success) {
        setError(res.error || "Could not enroll cooperative beneficiary.");
        return;
      }
      router.push(res.redirectUrl || backHref);
      router.refresh();
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <div className="flex items-center gap-4">
        <Link
          href={backHref}
          className="p-2 text-slate-500 hover:bg-slate-200/70 rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FF8A00]">
            Cooperative Member &amp; Leader Enrollment
          </p>
          <h2 className="text-2xl font-bold text-[#101827]">
            Enroll Beneficiary (Pig Receiver)
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            All pig receivers (beneficiaries) must be Cooperative Members or Cooperative Leaders inside a cooperative (max 15 total per cooperative).
          </p>
        </div>
      </div>

      {cooperatives.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950 space-y-3">
          <div className="flex items-center gap-2 font-bold">
            <UsersRound className="h-5 w-5 text-[#FF8A00]" />
            <span>Create a Cooperative First</span>
          </div>
          <p className="text-xs text-amber-900">
            Beneficiaries can only be enrolled inside a cooperative you manage. Create your cooperative first before adding members or cooperative leaders.
          </p>
          <Link
            href={manageCoopsHref}
            className="inline-flex items-center rounded-xl bg-[#101827] px-4 py-2 text-xs font-semibold text-white"
          >
            Go to Cooperatives Workspace
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Cooperative (Max 15) *
                </label>
                <select
                  required
                  value={cooperativeId}
                  onChange={(e) => setCooperativeId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
                >
                  <option value="">-- Select Cooperative --</option>
                  {cooperatives.map((c) => (
                    <option
                      key={c.id}
                      value={c.id}
                      disabled={c.memberCount >= c.maxMembers}
                    >
                      {c.name} ({c.cellName}) — {c.memberCount}/{c.maxMembers}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Cooperative Role *
                </label>
                <select
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
                >
                  <option value={Role.COOPERATIVE_MEMBER}>
                    Cooperative Member (Eligible Pig Receiver)
                  </option>
                  <option value={Role.COOPERATIVE_LEADER}>
                    Cooperative Leader (Leads Coop + Eligible Pig Receiver)
                  </option>
                </select>
                <p className="mt-1 text-[11px] text-slate-500 flex items-center gap-1">
                  <Crown className="h-3 w-3 text-[#FF8A00]" />
                  <span>Both Cooperative Members and Cooperative Leaders can pay fees and receive pigs.</span>
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Mukamana Aline"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="member@example.com"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+250 78..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  National ID (Irangamuntu)
                </label>
                <input
                  type="text"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  placeholder="16 digits"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Static Initial Password *
                </label>
                <input
                  type="text"
                  required
                  value={staticPassword}
                  onChange={(e) => setStaticPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono text-[#101827] focus:border-[#FF8A00] focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-4 border-t border-slate-100">
              <Link
                href={backHref}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-[#101827]"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#101827] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#1f2937] disabled:opacity-60 cursor-pointer"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#FF8A00]" />
                ) : (
                  <Save className="h-4 w-4 text-[#FF8A00]" />
                )}
                <span>Enroll Cooperative Beneficiary</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
