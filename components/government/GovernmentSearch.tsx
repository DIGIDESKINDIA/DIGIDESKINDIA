"use client";

import { Search, X } from "lucide-react";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function GovernmentSearch({
  value,
  onChange,
}: Props) {
  return (
    <div className="mx-auto mb-10 max-w-3xl">

      <div className="relative">

        <Search
          size={20}
          className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search Government Services..."
          className="h-16 w-full rounded-2xl border border-slate-300 bg-white pl-14 pr-14 text-lg outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
        />

        {value && (
          <button
            onClick={() => onChange("")}
            className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-600"
          >
            <X size={20} />
          </button>
        )}

      </div>

    </div>
  );
}