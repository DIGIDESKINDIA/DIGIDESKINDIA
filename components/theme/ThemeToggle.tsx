"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "./ThemeProvider";

export default function ThemeToggle({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      className={
        compact
          ? `inline-flex h-10 w-10 items-center justify-center rounded-xl border transition ${
              isDark
                ? "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`
          : `inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              isDark
                ? "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`
      }
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
      {!compact && <span className="lg:inline font-medium text-gray-800">{isDark ? "Light" : "Dark"}</span>}
    </button>
  );
}