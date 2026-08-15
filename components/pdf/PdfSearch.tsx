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
    <div className="mx-auto mb-8 max-w-2xl">
      <div className="relative">

        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          size={20}
        />

        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search PDF tools..."
          className="h-14 w-full rounded-2xl border border-slate-300 bg-white pl-12 pr-5 text-slate-700 shadow-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
        />

      </div>
    </div>
  );
}