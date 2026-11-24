import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { normalizeRoleValue } from "@/lib/roles";
import {
  ArrowLeftCircle,
  ArrowRightCircle,
  FileText,
  PiggyBank,
  Tag,
  Users,
  UsersRound,
  Wheat,
} from "lucide-react";

export default async function FieldDashboard() {
  const session = await getServerSession(authOptions);
  const role = normalizeRoleValue(session?.user?.role);

  const quickActions = [
    ...(role === "CELL_MANAGER" || role === "SUPER_ADMIN" || role === "PROJECT_MANAGER"
      ? [
          {
            label: "Animal Food Sales (Cell)",
            href: "/dashboard/field/feed-sales",
            icon: Wheat,
          },
        ]
      : []),
    ...(role === "CELL_MANAGER" ||
    role === "COOPERATIVE_LEADER" ||
    role === "SUPER_ADMIN" ||
    role === "PROJECT_MANAGER"
      ? [
          {
            label: "Report Animal Stock to Sell",
            href: "/dashboard/field/stock-reports",
            icon: Tag,
          },
          {
            label: "Cooperative Team",
            href: "/dashboard/field/cooperative",
            icon: UsersRound,
          },
        ]
      : []),
    { label: "Add Beneficiary", href: "/dashboard/field/beneficiaries/new", icon: Users },
    { label: "Record Distribution", href: "/dashboard/field/distributions", icon: ArrowRightCircle },
    { label: "Record Return", href: "/dashboard/field/returns", icon: ArrowLeftCircle },
    { label: "Submit Daily Report", href: "/dashboard/field/reports/new", icon: FileText },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FF8A00]">
          Field &amp; Cooperative Operations
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#101827]">
          Welcome back, {session?.user?.name}
        </h1>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#FF8A00]">
            <Users className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Field Workspace
          </p>
          <p className="mt-2 text-lg font-bold text-[#101827]">Beneficiaries &amp; Cell Ops</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-[#101827]">
            <PiggyBank className="h-5 w-5 text-[#FF8A00]" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Marketplace Sync
          </p>
          <p className="mt-2 text-lg font-bold text-[#101827]">Stock Reports &amp; Feed Sales</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <h2 className="text-xl font-bold text-[#101827]">Quick actions</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map(({ label, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              prefetch={false}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:border-[#FF8A00] hover:bg-orange-50/40 transition-colors"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white border border-slate-200 text-[#FF8A00]">
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-sm font-semibold text-[#101827]">{label}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
