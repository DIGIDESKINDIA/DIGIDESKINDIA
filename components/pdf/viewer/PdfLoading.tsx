"use client";

export default function PdfLoading() {
  return (
    <div className="flex min-h-[420px] w-full items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-500" />

        <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Loading PDF...
        </p>

        <p className="mt-1 text-xs text-slate-500">
          Preparing your document
        </p>
      </div>
    </div>
  );
}