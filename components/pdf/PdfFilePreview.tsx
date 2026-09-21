"use client";

import { useEffect, useMemo } from "react";

interface Props {
  file: File | null;
  title?: string;
  rotation?: number;
}

export default function PdfFilePreview({
  file,
  title = "PDF Preview",
  rotation = 0,
}: Props) {
  const url = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file]
  );

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  if (!file || !url) return null;

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        <span className="text-xs font-medium text-slate-500">First page</span>
      </div>
      <div className="flex min-h-[260px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-3">
        <iframe
          src={`${url}#page=1&view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
          title={`Preview of ${file.name}`}
          className="h-[520px] w-full max-w-[390px] transition-transform duration-300 ease-out"
          style={{ transform: `rotate(${rotation}deg)` }}
        />
      </div>
    </section>
  );
}
