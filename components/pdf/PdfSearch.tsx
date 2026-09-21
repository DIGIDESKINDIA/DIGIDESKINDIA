"use client";

import { Search } from "lucide-react";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function PdfSearch({
  value,
  onChange,
}: Props) {
  return (
    <div className="mx-auto max-w-[560px]">
      <div className="relative">

        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          size={20}
        />

        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search PDF tools..."
          className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-xs text-slate-700 shadow-[0_4px_14px_rgba(15,23,42,0.08)] outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-white/10 dark:bg-[#101d31] dark:text-slate-200 dark:shadow-[0_8px_22px_rgba(2,6,23,0.24)] dark:focus:border-blue-400 dark:focus:ring-blue-400/10"
        />

      </div>
    </div>
  );
}