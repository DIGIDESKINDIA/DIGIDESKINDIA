"use client";

import {
  Upload,
  FileText,
} from "lucide-react";

import PdfViewer from "@/components/pdf/viewer/PdfViewer";

interface WorkspaceViewerProps {
  file?: File | null;

  zoom?: number;

  rotation?: number;

  className?: string;

  onPageCountChange?: (
    pageCount: number
  ) => void;
}

export default function WorkspaceViewer({
  file,
  zoom = 100,
  rotation = 0,
  className,
  onPageCountChange,
}: WorkspaceViewerProps) {
  if (!file) {
    return (
      <div
        className={`flex h-full min-h-[500px] items-center justify-center bg-slate-200 p-6 dark:bg-slate-950 ${
          className ?? ""
        }`}
      >
        <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            <FileText size={38} />
          </div>

          <h2 className="mt-6 text-2xl font-black text-slate-900 dark:text-white">
            Open a PDF document
          </h2>

          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
            Upload a PDF to preview and
            organize its pages inside
            DigiDesk PDF Studio.
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <Upload size={14} />
            Waiting for PDF
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`h-full overflow-auto bg-slate-300 dark:bg-slate-950 ${
        className ?? ""
      }`}
    >
      <div className="min-h-full p-6 md:p-8 lg:p-10">
        <PdfViewer
          file={file}
          zoom={zoom}
          rotation={rotation}
          onPageCountChange={
            onPageCountChange
          }
        />
      </div>
    </div>
  );
} 