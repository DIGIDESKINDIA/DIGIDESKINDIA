"use client";

import dynamic from "next/dynamic";

const RedactDocumentTool = dynamic(() => import("@/components/pdf/RedactDocumentTool"), {
  ssr: false,
  loading: () => (
    <div className="min-h-[420px] rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
      Loading PDF editor…
    </div>
  ),
});

export default function RedactDocumentToolClient() {
  return <RedactDocumentTool />;
}
