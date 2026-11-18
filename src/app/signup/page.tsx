"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
} from "lucide-react";

type BootstrapResponse = {
  success?: boolean;
  isFirstSuperAdminAvailable?: boolean;
  totalUsers?: number;
};

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFirstAdmin, setIsFirstAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/signup", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: BootstrapResponse) => {
        if (active && typeof data.isFirstSuperAdminAvailable === "boolean") {
          setIsFirstAdmin(data.isFirstSuperAdminAvailable);
        }
      })
      .catch(() => {
        if (active) setIsFirstAdmin(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || successMessage) return;

    setError("");
    setSuccessMessage("");

    if (name.trim().length < 2) {
      setError("Please enter your full names.");
      return;
    }

    if (!contact.trim()) {
      setError("Please enter your email address or telephone number.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      const cleanContact = contact.trim();
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          contact: cleanContact,
          password,
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        success?: boolean;
        loginIdentifier?: string;
        user?: { role?: string };
      };

      if (!res.ok || !data.success) {
        setError(data.error || "Unable to create account.");
        setLoading(false);
        return;
      }

      const assignedRole = data.user?.role ? ` as ${data.user.role}` : "";
      setLoading(false);
      setSuccessMessage(`Account created successfully${assignedRole}! Redirecting to Sign In...`);

      const loginIdentifier = encodeURIComponent(data.loginIdentifier || cleanContact);
      setTimeout(() => {
        router.push(`/login?registered=1&identifier=${loginIdentifier}`);
        router.refresh();
      }, 900);
    } catch {
      setError("Unable to reach the registration service. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-50 px-4 py-10 sm:py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors mb-6"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to public website</span>
          </Link>
          <div className="flex justify-center">
            <img src="/pig-project-rwanda-logo.svg" alt="Pig Project Rwanda" className="h-12 w-auto" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            Create Account
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Instant registration &mdash; no email confirmation required
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8 shadow-xs">
          {loading && (
            <div className="mb-5 flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-700">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#064e3b]" />
              <span>Creating your account in the database...</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700 mt-0.5" />
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
                Full Names
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  disabled={loading || Boolean(successMessage)}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all disabled:opacity-60"
                  placeholder="Jean Bosco Nshimyimana"
                />
              </div>
            </div>

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
                  disabled={loading || Boolean(successMessage)}
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all disabled:opacity-60"
                  placeholder="name@example.com or +250 788 000 000"
                />
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
                  minLength={6}
                  disabled={loading || Boolean(successMessage)}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all disabled:opacity-60"
                  placeholder="At least 6 characters"
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
              disabled={loading || Boolean(successMessage)}
              className="w-full flex justify-center items-center py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-[#064e3b] hover:bg-[#053d2e] shadow-xs disabled:opacity-60 disabled:cursor-not-allowed transition-all cursor-pointer mt-2"
            >
              {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
              {loading
                ? "Creating account..."
                : successMessage
                  ? "Redirecting to Sign In..."
                  : isFirstAdmin
                    ? "Sign Up as Super Admin"
                    : "Sign Up"}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-4 text-center space-y-2">
            <p className="text-xs text-slate-600">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-[#064e3b] hover:underline">
                Sign in here
              </Link>
            </p>
            <p className="text-[11px] text-slate-400">
              Value Protocols Rwanda &bull; Revolving Livestock Platform
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
