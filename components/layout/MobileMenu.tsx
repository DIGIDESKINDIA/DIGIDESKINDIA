"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Search, User, X } from "lucide-react";

import ThemeToggle from "@/components/theme/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";

type MobileNavItem = {
  label: string;
  href: string;
  isNew?: boolean;
};

const mobileNavItems: MobileNavItem[] = [
  { label: "Home", href: "/" },
  { label: "Government Services", href: "/service" },
  { label: "PDF Tools", href: "/pdf-tools" },
  { label: "Image Tools", href: "/image-tools" },
  { label: "AI Assistant", href: "/ai", isNew: true },
  { label: "CSC Services", href: "/service" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact Us", href: "/contact" },
  { label: "Search", href: "/search" },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function MobileMenu({ open, onClose }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 xl:hidden">
      <div
        className={
          "absolute right-0 top-0 h-full w-[92%] max-w-sm overflow-y-auto shadow-2xl" +
          (isDark
            ? " border-l border-white/10 bg-[#0A1330] text-white"
            : " border-l border-slate-200 bg-white text-slate-900")
        }
      >
        {/* Header */}
        <div
          className={
            "flex items-center justify-between p-5" +
            (isDark ? " border-b border-white/10" : " border-b border-slate-200")
          }
        >
          <Image
            src="/images/logo.png"
            alt="DigiDesk India"
            width={120}
            height={48}
            className="h-12 w-auto"
          />
          <button
            onClick={onClose}
            className={
              "rounded-xl border p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50" +
              (isDark ? " border-white/10 bg-white/5 text-white" : " border-slate-200 text-slate-800")
            }
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>

        {/* Nav Links */}
        <div className="space-y-2 p-4">
          {mobileNavItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={onClose}
              className={
                "flex items-center justify-between rounded-xl border px-4 py-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500/50" +
                (isDark
                  ? " border-white/10 bg-white/5 text-slate-100 hover:border-blue-400/30 hover:bg-blue-500/10 hover:text-white"
                  : " border-slate-200 text-slate-800 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700")
              }
            >
              <span className="flex items-center gap-3">
                {item.label}
                {item.isNew && (
                  <span className="inline-flex items-center rounded-full bg-gradient-to-r from-[#6D28D9] to-[#2563EB] px-1.5 py-0.5 text-[9px] font-extrabold text-white">
                    New
                  </span>
                )}
              </span>
              {item.label === "Search" ? (
                <Search size={18} />
              ) : (
                <ChevronRight
                  size={16}
                  className={isDark ? "text-slate-400" : "text-slate-500"}
                />
              )}
            </Link>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="border-t border-white/10 p-5">
          <div className="mb-4 rounded-2xl border border-blue-400/20 bg-[linear-gradient(135deg,rgba(37,99,255,0.16),rgba(124,58,237,0.12))] p-4">
            <p className="text-sm font-bold text-white">
              Government services, PDF tools, image tools, and AI assistance
              all in one place.
            </p>
          </div>

          <div className="mb-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3 text-sm font-semibold">
            <span className={isDark ? "text-slate-200" : "text-slate-700"}>
              Theme
            </span>
            <ThemeToggle compact />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/login"
              onClick={onClose}
              className={
                "flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/50" +
                (isDark
                  ? " border-white/10 text-slate-100 hover:bg-white/8"
                  : " border-slate-200 text-slate-700 hover:bg-slate-50")
              }
            >
              <User size={16} />
              Login
            </Link>
            <Link
              href="/login"
              onClick={onClose}
              className="flex items-center justify-center rounded-full bg-gradient-to-r from-[#6D28D9] to-[#2563EB] px-4 py-3 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
