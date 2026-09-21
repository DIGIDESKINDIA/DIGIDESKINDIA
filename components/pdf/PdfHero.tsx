"use client";

import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

interface Props {
  children?: ReactNode;
}

export default function PdfHero({ children }: Props) {
  return (
    <div className="text-center">
      <div className="mx-auto max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-200">

            <Sparkles size={16} />

            Professional PDF Tools

          </div>

          <h1 className="mx-auto mt-3 max-w-[22ch] text-3xl font-black leading-[1.05] tracking-tight text-[#102333] dark:text-white sm:text-4xl lg:text-[2.35rem]">

            All PDF Tools

            <span className="text-blue-600 dark:text-blue-400">

              In One Place

            </span>

          </h1>

          <p className="mx-auto mt-2 max-w-2xl text-xs leading-5 text-slate-600 dark:text-slate-400 sm:text-sm">

            Merge, Split, Compress, Convert,
            Protect, Unlock, Watermark and edit
            PDF files online for free.

          </p>

          <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}