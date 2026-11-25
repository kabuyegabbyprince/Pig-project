"use client";

import Link from "next/link";
import { ArrowRightCircle, Crown, Search, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";

type Beneficiary = {
  id: string;
  fullName: string;
  beneficiaryNumber: string;
  cooperativeName: string | null;
  memberRoleLabel: string;
  paymentStatus: string;
  districtStr: string | null;
  sectorStr: string | null;
  cellStr: string | null;
  status: string;
  registrationDate: string | Date;
};

export function BeneficiariesClient({
  initialBeneficiaries,
  initialQuery,
  canEnroll = false,
}: {
  initialBeneficiaries: Beneficiary[];
  initialQuery: string;
  canEnroll?: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState(initialQuery);

  const filteredBeneficiaries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) return initialBeneficiaries;

    return initialBeneficiaries.filter((beneficiary) => {
      const haystack = [
        beneficiary.fullName,
        beneficiary.beneficiaryNumber,
        beneficiary.cooperativeName,
        beneficiary.memberRoleLabel,
        beneficiary.districtStr,
        beneficiary.sectorStr,
        beneficiary.cellStr,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [initialBeneficiaries, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FF8A00]">
            Cooperative Pig Receivers
          </p>
          <h2 className="text-2xl font-bold text-[#101827]">
            Beneficiaries (Members &amp; Cooperative Leaders)
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Every pig receiver must be an enrolled Cooperative Member or Cooperative Leader in your cooperatives.
          </p>
        </div>

        {canEnroll && (
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/field/beneficiaries/new"
              className="inline-flex items-center gap-2 rounded-xl bg-[#101827] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1f2937] transition"
            >
              <UserPlus className="h-4 w-4 text-[#FF8A00]" />
              <span>Enroll Member / Leader</span>
            </Link>
            <Link
              href="/dashboard/field/distributions/new"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-[#101827] hover:border-[#FF8A00] transition"
            >
              <ArrowRightCircle className="h-4 w-4 text-[#FF8A00]" />
              <span>Payment Queue &amp; Distribution</span>
            </Link>
          </div>
        )}
      </div>

      <div className="bg-white shadow-xs rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 p-4">
          <div className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name, cooperative, role, or cell..."
              className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#FF8A00]/30 focus:border-[#FF8A00] sm:text-sm bg-slate-50 text-[#101827]"
            />
          </div>
        </div>

        {filteredBeneficiaries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-[820px] w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Beneficiary &amp; Role
                  </th>
                  <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Cooperative &amp; Cell
                  </th>
                  <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    2-Fee Payment (18,800 RWF)
                  </th>
                  <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Livestock Status
                  </th>
                  <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Joined Date
                  </th>
                  <th scope="col" className="relative px-5 py-3">
                    <span className="sr-only">View</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredBeneficiaries.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-orange-50 flex items-center justify-center text-[#FF8A00] font-bold">
                          {b.fullName.charAt(0)}
                        </div>
                        <div className="ml-3.5">
                          <div className="text-sm font-semibold text-[#101827] flex items-center gap-1.5">
                            <span>{b.fullName}</span>
                            {b.memberRoleLabel === "Cooperative Leader" && (
                              <Crown className="h-3.5 w-3.5 text-[#FF8A00]" />
                            )}
                          </div>
                          <div className="text-xs text-slate-500">
                            {b.memberRoleLabel} &bull; <span className="font-mono">{b.beneficiaryNumber}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-[#101827]">
                        {b.cooperativeName || "Cooperative"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {[b.districtStr, b.sectorStr, b.cellStr].filter(Boolean).join(", ") || "Rwanda"}
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 inline-flex text-xs font-semibold rounded-full ${
                          b.paymentStatus === "VERIFIED"
                            ? "bg-emerald-50 text-emerald-700"
                            : b.paymentStatus === "PENDING"
                              ? "bg-amber-50 text-amber-800"
                              : b.paymentStatus === "REJECTED"
                                ? "bg-rose-50 text-rose-700"
                                : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {b.paymentStatus === "VERIFIED"
                          ? "Finance Approved"
                          : b.paymentStatus === "PENDING"
                            ? "Pending Finance"
                            : b.paymentStatus === "REJECTED"
                              ? "Rejected"
                              : "Not Submitted"}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 inline-flex text-xs font-semibold rounded-full bg-orange-50 text-[#101827]">
                        {b.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-500">
                      {new Date(b.registrationDate).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right text-xs font-semibold">
                      <Link href={`/dashboard/field/beneficiaries/${b.id}`} className="text-[#FF8A00] hover:underline">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center sm:p-12">
            <Users className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-[#101827] mb-1">
              No cooperative beneficiaries found
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enroll Cooperative Members or Cooperative Leaders inside your cooperative to make them eligible beneficiaries.
            </p>
            {canEnroll && (
              <Link
                href="/dashboard/field/beneficiaries/new"
                className="inline-flex items-center gap-2 rounded-xl bg-[#101827] px-4 py-2 text-xs font-semibold text-white"
              >
                <UserPlus className="h-4 w-4 text-[#FF8A00]" />
                <span>Enroll Cooperative Beneficiary</span>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
