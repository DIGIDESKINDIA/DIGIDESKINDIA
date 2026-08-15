"use client";

import { Mail, Phone, ShieldCheck } from "lucide-react";

import { useTheme } from "@/components/theme/ThemeProvider";

export default function TopBar() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={
        "w-full border-b px-6 py-2 text-sm text-white " +
        (isDark
          ? "border-white/10 bg-[#0A1330]"
          : "border-slate-200 bg-slate-800")
      }
    >
      <div className="mx-auto flex w-full max-w-7xl justify-between items-center">
        {/* Left Section */}
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-orange-500" />
          <span>INDIA'S TRUSTED DIGITAL SERVICES PLATFORM</span>
          <span className="text-gray-400 font-bold">•</span>
          <span>BUILT FOR EVERY INDIAN</span>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
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