"use client";

import { useState } from "react";
import { MapPin, CheckCircle2, AlertTriangle, Edit3 } from "lucide-react";
import { LocationPicker } from "@/components/LocationPicker";
import { updatePersonalProfile } from "@/app/actions/user";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { UserAddressProfile } from "@/lib/user-profile-address";

export function CellManagerProfileCard({
  userName,
  userPhone,
  userNationalId,
  addressProfile,
  isComplete,
  profileSuccess,
  profileError,
}: {
  userName: string;
  userPhone: string;
  userNationalId?: string | null;
  addressProfile: UserAddressProfile;
  isComplete: boolean;
  profileSuccess: boolean;
  profileError: string | null;
}) {
  const [editing, setEditing] = useState(!isComplete);

  const locationSummary = [
    addressProfile.districtName,
    addressProfile.sectorName,
    addressProfile.cellName,
    addressProfile.villageName,
  ]
    .filter(Boolean)
    .join(" · ");

  if (isComplete && !editing) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-3">
        {profileSuccess && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-medium text-emerald-900">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Your Cell Manager profile and address have been saved to the database.</span>
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#FF8A00] shrink-0">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#FF8A00]">
                Cell Manager Profile (Stored)
              </p>
              <p className="text-sm font-bold text-[#101827] mt-0.5">
                {locationSummary || "Duty address not set (optional)"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {[
                  userPhone ? `Phone: ${userPhone}` : null,
                  userNationalId ? `National ID: ${userNationalId}` : null,
                  addressProfile.address || null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Profile complete"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-[#101827] hover:border-[#FF8A00] hover:bg-orange-50/40 transition self-start sm:self-auto cursor-pointer"
          >
            <Edit3 className="h-3.5 w-3.5 text-[#FF8A00]" />
            <span>Update Profile / Address</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-[#FF8A00]/60 bg-white p-5 sm:p-6 shadow-xs space-y-5">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-[#FF8A00] shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#FF8A00]">
              Profile Completion Required
            </p>
            <h2 className="text-lg font-bold text-[#101827]">
              Complete Cell Manager Profile &amp; Duty Address
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Enter your National ID, and optionally your phone number and District, Sector, Cell, and Village details.
            </p>
          </div>
        </div>
        {isComplete && (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs font-semibold text-slate-500 hover:text-[#101827] cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>

      {profileError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800">
          {profileError}
        </div>
      )}

      <form action={updatePersonalProfile} className="space-y-5">
        <input type="hidden" name="returnTo" value="/dashboard/field" />

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label
              htmlFor="cm-name"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-600"
            >
              Full Name *
            </label>
            <input
              id="cm-name"
              name="name"
              type="text"
              required
              defaultValue={userName}
              className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="cm-phone"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-600"
            >
              Phone Number (Optional)
            </label>
            <input
              id="cm-phone"
              name="phone"
              type="tel"
              defaultValue={userPhone}
              placeholder="+250 78..."
              className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="cm-nid"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-600"
            >
              National ID (Irangamuntu) *
            </label>
            <input
              id="cm-nid"
              name="nationalId"
              type="text"
              required
              readOnly={Boolean(userNationalId)}
              disabled={Boolean(userNationalId)}
              defaultValue={userNationalId ?? ""}
              placeholder="1199..."
              className={`mt-1.5 block w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm ${
                userNationalId ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "text-[#101827]"
              } focus:border-[#FF8A00] focus:outline-none`}
            />
            {userNationalId && (
              <p className="mt-1 text-[11px] text-slate-400">National ID cannot be changed once set.</p>
            )}
          </div>
        </div>

        <LocationPicker
          initialDistrictId={addressProfile.districtId}
          initialDistrictName={addressProfile.districtName}
          initialSectorId={addressProfile.sectorId}
          initialSectorName={addressProfile.sectorName}
          initialCellId={addressProfile.cellId}
          initialCellName={addressProfile.cellName}
          initialVillageId={addressProfile.villageId}
          initialVillageName={addressProfile.villageName}
        />

        <div>
          <label
            htmlFor="cm-address"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-600"
          >
            Specific Office / Street Address (Optional)
          </label>
          <input
            id="cm-address"
            name="address"
            type="text"
            defaultValue={addressProfile.address}
            placeholder="Cell office, landmark, or street details"
            className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
          />
        </div>

        <div className="flex justify-end">
          <SubmitButton
            pendingText="Saving profile & address..."
            className="rounded-xl bg-[#101827] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1f2937] transition cursor-pointer"
          >
            Save Profile &amp; Address
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
