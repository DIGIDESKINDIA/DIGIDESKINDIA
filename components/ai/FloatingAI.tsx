"use client";

import { Bot, X, Sparkles } from "lucide-react";
import ChatWindow from "./ChatWindow";
import { useManishAI } from "./ManishAIProvider";
import { useTheme } from "@/components/theme/ThemeProvider";

export default function FloatingAI() {
  const {
    enabled,
    open,
    setOpen,
  } = useManishAI();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (!enabled) {
    return null;
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-3 z-[9999] animate-in fade-in slide-in-from-bottom-5 duration-300 sm:right-4 md:right-6 lg:bottom-28">
          <ChatWindow onClose={() => setOpen(false)} />
        </div>
      )}

      <div className="fixed bottom-5 right-3 z-[9999] flex items-end gap-2 sm:right-4 md:bottom-6 md:right-6 lg:bottom-6 lg:right-6">
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={`group inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold shadow-[0_18px_50px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 sm:px-4 sm:py-2.5 sm:text-sm ${
              isDark
                ? "border-white/10 bg-white/6 text-slate-100 hover:border-blue-400/30 hover:bg-white/10"
                : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:text-blue-700"
            }`}
          >
            <Sparkles size={16} className="text-cyan-500" />
            Ask Manish
          </button>
        )}

        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r text-white transition hover:-translate-y-0.5 sm:h-16 sm:w-16 ${
            isDark
              ? "from-blue-700 via-cyan-500 to-violet-600 shadow-[0_22px_65px_rgba(59,130,246,0.42)] hover:shadow-[0_26px_75px_rgba(59,130,246,0.48)]"
              : "from-blue-700 via-blue-600 to-cyan-500 shadow-[0_18px_50px_rgba(37,99,235,0.35)] hover:shadow-[0_22px_60px_rgba(37,99,235,0.42)]"
          }`}
          aria-label={open ? "Close Manish AI" : "Open Manish AI"}
        >
          {!open && (
            <span className="absolute inset-0 rounded-full bg-cyan-300/30 blur-md" />
          )}

          <span className="absolute inset-0 rounded-full border border-white/20" />

          {open ? <X size={24} className="sm:h-7 sm:w-7" /> : <Bot size={26} className="sm:h-[30px] sm:w-[30px]" />}
        </button>
      </div>
    </>
  );
}