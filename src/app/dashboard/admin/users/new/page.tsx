import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createUser } from "@/app/actions/user";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Role } from "@prisma/client";
import {
  ADMIN_STAFF_ROLE_OPTIONS,
  CELL_MANAGER_COOP_ROLE_OPTIONS,
  normalizeRoleValue,
} from "@/lib/roles";
import { LocationPicker } from "@/components/LocationPicker";

export const dynamic = "force-dynamic";

export default async function NewUserPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }> | { error?: string };
}) {
  const session = await getServerSession(authOptions);
  const actorRole = normalizeRoleValue(session?.user?.role);

  if (
    !session ||
    (actorRole !== Role.SUPER_ADMIN &&
      actorRole !== Role.CELL_MANAGER &&
      actorRole !== Role.COOPERATIVE_LEADER)
  ) {
    redirect("/dashboard");
  }

  const params = await Promise.resolve(searchParams ?? {});
  const errorMessage = params.error ? decodeURIComponent(params.error) : "";

  const availableRoleOptions =
    actorRole === Role.SUPER_ADMIN
      ? ADMIN_STAFF_ROLE_OPTIONS
      : actorRole === Role.CELL_MANAGER
        ? CELL_MANAGER_COOP_ROLE_OPTIONS
        : CELL_MANAGER_COOP_ROLE_OPTIONS.filter(
            (r) => r.value === Role.COOPERATIVE_MEMBER
          );

  const backHref =
    actorRole === Role.SUPER_ADMIN
      ? "/dashboard/admin/users"
      : "/dashboard/field/cooperative";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Link href={backHref} className="text-slate-500 hover:text-[#101827] transition-colors">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#101827]">
            {actorRole === Role.SUPER_ADMIN
              ? "Register Staff Member"
              : "Register Cooperative Account"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {actorRole === Role.SUPER_ADMIN
              ? "Assign an operational staff role matching the sign-in directory. Cooperative Leaders and Members are managed by Cell Managers."
              : "Add a Cooperative Leader or Cooperative Member within your assigned cell."}
          </p>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="bg-white shadow-xs rounded-xl border border-slate-200 p-6">
        <form action={createUser} className="space-y-6">
          <input type="hidden" name="returnTo" value={backHref} />

          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-sm font-bold text-[#101827]">Account Credentials &amp; Role</h3>
              <p className="text-xs text-slate-500">Basic identification, sign-in access, and workspace privileges.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[#101827] mb-1">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full rounded-lg border-slate-200 shadow-xs focus:border-[#FF8A00] focus:ring-2 focus:ring-[#FF8A00]/20 outline-none sm:text-sm p-2.5 border"
                  placeholder="Jane Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#101827] mb-1">Email (Username) *</label>
                <input
                  type="text"
                  name="email"
                  required
                  className="w-full rounded-lg border-slate-200 shadow-xs focus:border-[#FF8A00] focus:ring-2 focus:ring-[#FF8A00]/20 outline-none sm:text-sm p-2.5 border"
                  placeholder="jane@valueprotocols.rw"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#101827] mb-1">Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  className="w-full rounded-lg border-slate-200 shadow-xs focus:border-[#FF8A00] focus:ring-2 focus:ring-[#FF8A00]/20 outline-none sm:text-sm p-2.5 border"
                  placeholder="+250 780 000 000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#101827] mb-1">
                  National ID Number (Irangamuntu)
                </label>
                <input
                  type="text"
                  name="nationalId"
                  maxLength={16}
                  pattern="\d{16}"
                  className="w-full rounded-lg border-slate-200 shadow-xs focus:border-[#FF8A00] focus:ring-2 focus:ring-[#FF8A00]/20 outline-none sm:text-sm p-2.5 border font-mono"
                  placeholder="1 1990 8 0000000 0 00 (16 digits)"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Rwandan 16-digit National Identification Number. Locked once saved.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#101827] mb-1">Initial Password *</label>
                <input
                  type="password"
                  name="password"
                  required
                  className="w-full rounded-lg border-slate-200 shadow-xs focus:border-[#FF8A00] focus:ring-2 focus:ring-[#FF8A00]/20 outline-none sm:text-sm p-2.5 border"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#101827] mb-1">System Role *</label>
                <select
                  name="role"
                  required
                  className="w-full rounded-lg border-slate-200 shadow-xs focus:border-[#FF8A00] focus:ring-2 focus:ring-[#FF8A00]/20 outline-none sm:text-sm p-2.5 border bg-white text-[#101827] cursor-pointer"
                >
                  <option value="">-- Select Staff Role --</option>
                  {availableRoleOptions.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-[#101827]">
                  Duty Station / Residence Location (Rwanda)
                </h3>
                <p className="text-xs text-slate-500">
                  Geographical assignment across District, Sector, Cell, and Village tiers.
                </p>
              </div>

              <div className="space-y-4">
                <LocationPicker villageRequired={false} />

                <div>
                  <label className="block text-sm font-medium text-[#101827] mb-1">
                    Specific Street / Landmark Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    className="w-full rounded-lg border-slate-200 shadow-xs focus:border-[#FF8A00] focus:ring-2 focus:ring-[#FF8A00]/20 outline-none sm:text-sm p-2.5 border"
                    placeholder="e.g. Near Cell Office, House No. 12"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end border-t border-slate-100">
            <Link
              href={backHref}
              className="bg-white py-2 px-4 border border-slate-200 rounded-lg shadow-xs text-sm font-medium text-slate-600 hover:bg-slate-50 mr-3 transition-colors"
            >
              Cancel
            </Link>
            <SubmitButton
              pendingText="Creating user..."
              className="inline-flex justify-center items-center py-2 px-5 border border-transparent shadow-xs text-sm font-semibold rounded-lg text-white bg-[#101827] hover:bg-[#1f2937] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF8A00] cursor-pointer transition-colors"
            >
              <Save className="h-4 w-4 mr-2 text-[#FF8A00]" />
              Save Information
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
