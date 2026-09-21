"use client";

import Link from "next/link";
import {
  ArrowRight,
  FileText,
} from "lucide-react";

import type {
  LucideIcon,
} from "lucide-react";

interface PdfTool {
  id: number;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  category: string;
  popular?: boolean;
}

interface Props {
  tool: PdfTool;
}

export default function PdfCard({
  tool,
}: Props) {
  const Icon =
    tool.icon ?? FileText;

  const iconStyle = {
    Convert: "from-orange-500 to-amber-400 ring-orange-500/15 dark:from-orange-500 dark:to-amber-400",
    Edit: "from-rose-500 to-red-400 ring-rose-500/15 dark:from-rose-500 dark:to-red-400",
    Security: "from-blue-600 to-indigo-500 ring-blue-500/15 dark:from-blue-500 dark:to-indigo-400",
    Optimize: "from-emerald-500 to-green-400 ring-emerald-500/15 dark:from-emerald-500 dark:to-green-400",
  }[tool.category] ?? "from-cyan-600 to-sky-400 ring-cyan-500/15";

  return (
    <Link
      href={tool.href}
      className="group relative flex min-h-[150px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-[0_10px_24px_rgba(37,99,235,0.12)] dark:border-white/10 dark:bg-[#101d31] dark:shadow-[0_8px_22px_rgba(2,6,23,0.24)] dark:hover:border-cyan-400/40 dark:hover:bg-[#14243b] dark:hover:shadow-[0_12px_28px_rgba(37,99,235,0.16)]"
    >
      {tool.popular && (
        <span className="absolute right-3 top-3 rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-blue-700 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-200">
          Popular
        </span>
      )}

      <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${iconStyle} text-white shadow-[0_5px_12px_rgba(14,165,233,0.2)] ring-2 transition-transform duration-300 group-hover:scale-105`}>
        <Icon
          size={19}
          strokeWidth={2.2}
        />
      </div>

      <h3 className="mt-3 pr-12 text-base font-bold leading-5 text-slate-900 dark:text-white">
        {tool.title}
      </h3>

      <p className="mt-1.5 flex-1 text-sm leading-5 text-slate-600 dark:text-slate-400">
        {tool.description}
      </p>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className={`max-w-[72%] truncate rounded-md px-2 py-0.5 text-xs font-semibold ${tool.category === "Edit" ? "bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300" : tool.category === "Convert" ? "bg-orange-50 text-orange-600 dark:bg-orange-400/10 dark:text-orange-300" : tool.category === "Security" ? "bg-blue-50 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300"}`}>
          {tool.category}
        </span>

        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 shadow-sm transition-all duration-300 group-hover:translate-x-0.5 dark:bg-white/10 dark:text-slate-200">
          <ArrowRight size={12} />
        </span>
      </div>
    </Link>
  );
}