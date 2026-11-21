"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";

import { SIGN_IN_ROLE_OPTIONS, normalizeRoleValue } from "@/lib/roles";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registeredParam = searchParams.get("registered") === "1";
  const identifierParam = searchParams.get("identifier") || "";
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState(identifierParam);
  const [selectedRole, setSelectedRole] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(
    urlError === "CredentialsSignin"
      ? "Invalid email/telephone or password. Please verify your credentials."
      : urlError
        ? "Authentication could not be completed. Please try again."
        : ""
  );
  const [successMessage, setSuccessMessage] = useState(
    registeredParam
      ? "Account created successfully! Please sign in with your credentials."
      : ""
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");
    setSuccessMessage("");

    const trimmedIdentifier = email.trim();
    const cleanIdentifier = trimmedIdentifier.includes("@")
      ? trimmedIdentifier.toLowerCase()
      : trimmedIdentifier;

    try {
      const res = await signIn("credentials", {
        email: cleanIdentifier,
        password,
        selectedRole: selectedRole.trim(),
        redirect: false,
      });

      if (res?.error) {
        if (res.error === "ROLE_REQUIRED") {
          setError("Please select your staff role to sign in.");
        } else if (res.error.startsWith("ROLE_MISMATCH")) {
          const parts = res.error.split(":");
          const actualRole = parts[1] ? parts[1].replace(/_/g, " ") : "another role";
          setError(`Invalid role selected. Your account credentials belong to ${actualRole}. Please select your correct account/role.`);
        } else if (res.error === "CredentialsSignin") {
          setError("Invalid email/telephone or password. Please verify your credentials.");
        } else {
          setError(res.error || "Unable to sign in right now. Please try again.");
        }
        setLoading(false);
        return;
      }

      if (res?.ok) {
        setLoading(false);
        setSuccessMessage("Credentials verified! Loading your authorized workspace...");

        try {
          const sessionRes = await fetch("/api/auth/session");
          const sessionData = await sessionRes.json();
          const userRole = normalizeRoleValue(sessionData?.user?.role);

          let target = "/dashboard";
          if (userRole === "SUPER_ADMIN" || userRole === "PROJECT_MANAGER") {
            target = "/dashboard/admin";
          } else if (
            userRole === "CELL_MANAGER" ||
            userRole === "COOPERATIVE_LEADER" ||
            userRole === "COOPERATIVE_MEMBER" ||
            userRole === "TRAINER"
          ) {
            target = "/dashboard/field";
          } else if (userRole === "VETERINARIAN") {
            target = "/dashboard/vet";
          } else if (userRole === "ACCOUNTANT" || userRole === "FINANCE_OFFICER") {
            target = "/dashboard/finance";
          } else if (userRole === "FUNDER") {
            target = "/dashboard/admin/reports";
          }

          router.push(target);
          router.refresh();
        } catch {
          router.push("/dashboard");
          router.refresh();
        }
      } else {
        setError("Unable to sign in right now. Please try again.");
        setLoading(false);
      }
    } catch {
      setError("Unable to connect to the sign-in service. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F5F5] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-[#101827] transition-colors mb-6"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to public website</span>
          </Link>
          <div className="flex justify-center">
            <div className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2.5 shadow-xs border border-slate-200/80">
              <img src="/pplog-.png" alt="Pig Project Rwanda" className="h-14 w-auto object-contain" />
            </div>
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#101827]">
            Operations Workspace
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Sign in with your authorized credentials
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
          {loading && (
            <div className="mb-5 flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-700">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#FF8A00]" />
              <span>Verifying credentials and loading workspace...</span>
            </div>
          )}

          {successMessage && !loading && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-orange-200 bg-orange-50 p-3 text-xs font-medium text-[#101827]">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#FF8A00] mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Email or Telephone
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  disabled={loading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50/50 text-[#101827] placeholder:text-slate-400 focus:bg-white focus:border-[#FF8A00] focus:ring-2 focus:ring-[#FF8A00]/20 outline-none transition-all disabled:opacity-60"
                  placeholder="name@example.com or +250 788 000 000"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Staff Role
                </label>
                <span className="text-[11px] text-slate-400">
                  Select your assigned role
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Briefcase className="h-4 w-4" />
                </div>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  disabled={loading}
                  className="block w-full pl-9 pr-8 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50/50 text-[#101827] focus:bg-white focus:border-[#FF8A00] focus:ring-2 focus:ring-[#FF8A00]/20 outline-none transition-all disabled:opacity-60 cursor-pointer"
                >
                  <option value="">-- Select Staff Role --</option>
                  {SIGN_IN_ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50/50 text-[#101827] placeholder:text-slate-400 focus:bg-white focus:border-[#FF8A00] focus:ring-2 focus:ring-[#FF8A00]/20 outline-none transition-all disabled:opacity-60"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-[#101827] hover:bg-[#1f2937] shadow-xs disabled:opacity-60 disabled:cursor-not-allowed transition-all cursor-pointer mt-2"
            >
              {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2 text-[#FF8A00]" /> : null}
              {loading ? "Signing in..." : "Sign In to Workspace"}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-4 text-center">
            <p className="text-[11px] text-slate-400">
              Value Protocols Rwanda &bull; Revolving Livestock Platform
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] text-sm text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin mr-2 text-[#FF8A00]" />
          Loading sign in...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
