import { getCachedSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  Stethoscope,
  Clock,
  HeartPulse,
  AlertTriangle,
  PlusCircle,
  CheckCircle2,
  FileText,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function VetDashboard() {
  const session = await getCachedSession();
  if (!session || (session.user.role !== "VETERINARIAN" && session.user.role !== "SUPER_ADMIN")) {
    redirect("/dashboard");
  }

  const [
    pigsAwaitingInspection,
    healthyPigs,
    badStatusCount,
    deceasedPigs,
  ] = await Promise.all([
    prisma.pig.count({
      where: { status: "REGISTERED", deletedAt: null },
    }),
    prisma.pig.count({
      where: { healthStatus: { in: ["HEALTHY", "RECOVERED"] }, deletedAt: null },
    }),
    prisma.pig.count({
      where: { healthStatus: { in: ["SICK", "UNDER_TREATMENT", "CRITICAL"] }, deletedAt: null },
    }),
    prisma.pig.count({
      where: { status: "DECEASED", deletedAt: null },
    }),
  ]);

  const quickActions = [
    { label: "Log Health Exam", href: "/dashboard/vet/veterinary/new", icon: PlusCircle },
    { label: "Bad Status List", href: "/dashboard/vet/returned", icon: HeartPulse, count: badStatusCount },
    { label: "All Vet Records", href: "/dashboard/vet/veterinary", icon: Stethoscope },
    { label: "Veterinary Reports", href: "/dashboard/vet/reports", icon: FileText },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#FF8A00]">
          Veterinary Health Workspace
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#101827]">
          Welcome back, Dr. {session.user.name}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Examine registered pigs, prescribe medication for Bad Status animals, and publish cleared stock to Finance and Cell Managers.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4.5 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Awaiting Inspection
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-amber-700">{pigsAwaitingInspection}</p>
          <p className="mt-0.5 text-xs text-slate-500">Incoming pigs not yet examined</p>
        </div>

        <Link
          href="/dashboard/vet/returned"
          className="rounded-xl border border-slate-200/80 bg-white p-4.5 shadow-xs hover:border-rose-300 transition-colors block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Bad Status
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-700">
              <HeartPulse className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-rose-700">{badStatusCount}</p>
          <p className="mt-0.5 text-xs text-slate-500">Sick / on medication</p>
        </Link>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4.5 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Healthy Animals
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-[#FF8A00]">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[#FF8A00]">{healthyPigs}</p>
          <p className="mt-0.5 text-xs text-slate-500">Cleared &amp; distribution-ready</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4.5 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Deceased Cases
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-700">{deceasedPigs}</p>
          <p className="mt-0.5 text-xs text-slate-500">Reported mortalities</p>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <h2 className="text-sm font-bold text-[#101827]">Veterinary Operational Workflows</h2>
        <div className="mt-3.5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map(({ label, href, icon: Icon, count }) => (
            <Link
              key={label}
              href={href}
              className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50/50 p-3.5 hover:border-[#FF8A00]/60 hover:bg-white hover:shadow-xs transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-orange-50 text-[#FF8A00]">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold text-[#101827] group-hover:text-[#FF8A00]">
                  {label}
                </span>
              </div>
              {typeof count === "number" && count > 0 && (
                <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  {count}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
