"use client";

import { useEffect, useState, useTransition } from "react";
import { Sun, Moon, Type, Bell, Save, RotateCcw, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import {
  type UserPreferences,
  DEFAULT_USER_PREFERENCES,
} from "@/lib/constants/settings";
import {
  saveUserPreferences,
  resetUserPreferences,
} from "@/app/actions/settings";

interface SettingsPreferencesProps {
  initialPreferences?: UserPreferences;
}

export function SettingsPreferences({ initialPreferences }: SettingsPreferencesProps) {
  const [savedPrefs, setSavedPrefs] = useState<UserPreferences>(() => {
    return initialPreferences || DEFAULT_USER_PREFERENCES;
  });

  const [theme, setTheme] = useState<"light" | "dark">(savedPrefs.theme);
  const [textSize, setTextSize] = useState<"small" | "default" | "large">(savedPrefs.textSize);
  const [notifications, setNotifications] = useState<boolean>(savedPrefs.notifications);

  const [isPending, startTransition] = useTransition();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync with initialPreferences and apply to documentElement
  useEffect(() => {
    if (initialPreferences) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSavedPrefs(initialPreferences);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTheme(initialPreferences.theme);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTextSize(initialPreferences.textSize);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotifications(initialPreferences.notifications);

      document.documentElement.setAttribute("data-theme", initialPreferences.theme);
      document.documentElement.setAttribute("data-text-size", initialPreferences.textSize);
      try {
        localStorage.setItem("pp_pref_theme", initialPreferences.theme);
        localStorage.setItem("pp_pref_text_size", initialPreferences.textSize);
        localStorage.setItem("pp_pref_notifs", String(initialPreferences.notifications));
      } catch {}
    }
  }, [initialPreferences]);

  const hasUnsavedChanges =
    theme !== savedPrefs.theme ||
    textSize !== savedPrefs.textSize ||
    notifications !== savedPrefs.notifications;

  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setErrorMessage(null);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    setSuccessMessage(null);
    setTimeout(() => setErrorMessage(null), 6000);
  };

  const handleThemeChange = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const handleTextSizeChange = (newSize: "small" | "default" | "large") => {
    setTextSize(newSize);
    document.documentElement.setAttribute("data-text-size", newSize);
  };

  const handleNotifToggle = () => {
    setNotifications((prev) => !prev);
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        const payload: UserPreferences = {
          theme,
          textSize,
          notifications,
        };

        const res = await saveUserPreferences(payload);
        if (res && res.success) {
          setSavedPrefs(payload);
          try {
            localStorage.setItem("pp_pref_theme", theme);
            localStorage.setItem("pp_pref_text_size", textSize);
            localStorage.setItem("pp_pref_notifs", String(notifications));
          } catch {}
          triggerSuccess("Your display preferences have been saved to the database successfully.");
        } else {
          triggerError("Failed to save preferences to the database.");
        }
      } catch (err: unknown) {
        triggerError(err instanceof Error ? err.message : "Failed to save display preferences.");
      }
    });
  };

  const handleCancel = () => {
    setTheme(savedPrefs.theme);
    setTextSize(savedPrefs.textSize);
    setNotifications(savedPrefs.notifications);
    document.documentElement.setAttribute("data-theme", savedPrefs.theme);
    document.documentElement.setAttribute("data-text-size", savedPrefs.textSize);
    setErrorMessage(null);
  };

  const handleReset = () => {
    if (
      !confirm(
        "Are you sure you want to reset your personal display preferences back to system defaults (Light theme, Default text size, In-app reminders on)?"
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await resetUserPreferences();
        if (res && res.success) {
          const def = res.preferences;
          setSavedPrefs(def);
          setTheme(def.theme);
          setTextSize(def.textSize);
          setNotifications(def.notifications);

          document.documentElement.setAttribute("data-theme", def.theme);
          document.documentElement.setAttribute("data-text-size", def.textSize);
          try {
            localStorage.setItem("pp_pref_theme", def.theme);
            localStorage.setItem("pp_pref_text_size", def.textSize);
            localStorage.setItem("pp_pref_notifs", String(def.notifications));
          } catch {}
          triggerSuccess("Display preferences have been reset to defaults and updated in the database.");
        } else {
          triggerError("Failed to reset preferences.");
        }
      } catch (err: unknown) {
        triggerError(err instanceof Error ? err.message : "Failed to reset display preferences.");
      }
    });
  };

  return (
    <div className="mt-6 space-y-6">
      {/* Success Notification */}
      {successMessage && (
        <div className="flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-[#101827] shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-[#FF8A00] shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-[#101827] hover:opacity-75"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="flex items-center justify-between rounded-xl border border-[#f5c6cb] bg-[#f8d7da] p-4 text-sm text-[#721c24] shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-[#c9577a] shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-[#721c24] hover:opacity-75"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Unsaved changes indicator */}
      {hasUnsavedChanges && (
        <div className="flex items-center justify-between rounded-xl border border-[#fef3c7] bg-[#fffbeb] px-4 py-2.5 text-xs text-[#92400e]">
          <span>You have unsaved display preference changes. Click &quot;Save Preferences&quot; to store them in your account.</span>
        </div>
      )}

      {/* Theme Choice */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-[#5d6e64]">
          Personal Color Theme
        </label>
        <p className="mt-0.5 text-xs text-[#7a8a82]">Choose how the workspace displays on your screen.</p>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:max-w-md">
          <button
            type="button"
            onClick={() => handleThemeChange("light")}
            className={`flex items-center justify-center gap-2.5 rounded-xl border p-3 text-sm font-medium transition ${
              theme === "light"
                ? "border-[#FF8A00] bg-orange-50 text-[#101827] font-semibold ring-2 ring-[#FF8A00]/20"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
            }`}
          >
            <Sun className="h-4 w-4 text-[#FF8A00]" />
            <span>Light Theme</span>
          </button>
          <button
            type="button"
            onClick={() => handleThemeChange("dark")}
            className={`flex items-center justify-center gap-2.5 rounded-xl border p-3 text-sm font-medium transition ${
              theme === "dark"
                ? "border-[#101827] bg-[#101827] text-white font-semibold ring-2 ring-[#FF8A00]/30"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
            }`}
          >
            <Moon className="h-4 w-4 text-[#FF8A00]" />
            <span>Dark Theme</span>
          </button>
        </div>
      </div>

      {/* Text Size Choice */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
          Text Size
        </label>
        <p className="mt-0.5 text-xs text-slate-400">Adjust typography readability across tables, forms, and cards.</p>
        <div className="mt-3 grid grid-cols-3 gap-3 sm:max-w-md">
          {(["small", "default", "large"] as const).map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => handleTextSizeChange(size)}
              className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm capitalize transition ${
                textSize === size
                  ? "border-[#FF8A00] bg-orange-50 text-[#101827] font-semibold ring-2 ring-[#FF8A00]/20"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
              }`}
            >
              <Type className="h-4 w-4 text-[#FF8A00]" />
              <span>{size}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Notifications Toggle */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
          Notification Alerts
        </label>
        <p className="mt-0.5 text-xs text-slate-400">Receive alerts for urgent animal health cases and overdue returns.</p>
        <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 sm:max-w-md">
          <div className="flex items-center gap-3">
            <Bell className="h-4 w-4 text-[#FF8A00]" />
            <span className="text-sm font-medium text-[#101827]">In-App System Reminders</span>
          </div>
          <button
            type="button"
            onClick={handleNotifToggle}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              notifications ? "bg-[#FF8A00]" : "bg-gray-200"
            }`}
            role="switch"
            aria-checked={notifications}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                notifications ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Action Buttons: Reset to Defaults, Cancel, Save Display Preferences */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#dfe7df]">
        <button
          type="button"
          onClick={handleReset}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#5d6e64] hover:text-[#c9577a] hover:bg-[#fdeeed] border border-[#d9e1d8] rounded-xl transition disabled:opacity-50"
          title="Reset display preferences to defaults"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset to Defaults</span>
        </button>

        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-[#5d6e64] hover:text-[#1c2b23] hover:bg-[#e4ede6] rounded-xl transition"
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-[#101827] px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#1f2937] transition disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[#FF8A00]" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4 text-[#FF8A00]" />
                <span>Save Preferences</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
