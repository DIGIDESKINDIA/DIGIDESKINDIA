"use client";

import { Mail, Phone, ShieldCheck } from "lucide-react";

import { useTheme } from "@/components/theme/ThemeProvider";

export default function TopBar() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={
        "w-full overflow-hidden border-b px-3 py-2 text-[10px] text-white sm:px-6 sm:text-sm " +
        (isDark
          ? "border-white/10 bg-[#0A1330]"
          : "border-slate-200 bg-slate-800")
      }
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
        {/* Left Section */}
        <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
          <ShieldCheck size={16} className="text-orange-500" />
          <span className="truncate">INDIA&apos;S TRUSTED DIGITAL SERVICES PLATFORM</span>
          <span className="hidden font-bold text-gray-400 sm:inline">•</span>
          <span className="hidden sm:inline">BUILT FOR EVERY INDIAN</span>
        </div>

        {/* Right Section */}
        <div className="hidden shrink-0 items-center gap-4 sm:flex">
          <div className="flex items-center gap-2">
            <Phone size={16} className="text-blue-400" />
            <span>+91 9696295457</span>
          </div>
          <span className="text-gray-400 font-bold">•</span>
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-blue-400" />
            <span>yoursdigideskindia@gmail.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}