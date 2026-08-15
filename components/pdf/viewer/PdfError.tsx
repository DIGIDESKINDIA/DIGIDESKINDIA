"use client";

import { AlertTriangle } from "lucide-react";

interface PdfErrorProps {
  message?: string;
}

export default function PdfError({
  message = "The PDF could not be opened. Please try another file.",
}: PdfErrorProps) {
  return (
    <div className="flex min-h-[420px] w-full items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-red-200 bg-red-50 p-7 text-center shadow-sm dark:border-red-900/60 dark:bg-red-950/30">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300">
          <AlertTriangle size={24} />
        </div>

        <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
          Unable to open PDF
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {message}
        </p>
      </div>
    </div>
  );
}