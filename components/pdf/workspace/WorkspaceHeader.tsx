"use client";

import { ReactNode } from "react";

import {
  ChevronRight,
  Download,
  Save,
  MoreVertical,
} from "lucide-react";

interface WorkspaceHeaderProps {
  title: string;

  fileName?: string;

  breadcrumbs?: string[];

  actions?: ReactNode;

  onSave?(): void;

  onDownload?(): void;
}

export default function WorkspaceHeader({
  title,
  fileName,
  breadcrumbs = ["PDF Studio"],
  actions,
  onSave,
  onDownload,
}: WorkspaceHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">

      {/* Left */}

      <div className="min-w-0">

        <nav className="mb-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">

          {breadcrumbs.map((item, index) => (
            <div
              key={item}
              className="flex items-center gap-2"
            >
              <span>{item}</span>

              {index !==
                breadcrumbs.length - 1 && (
                <ChevronRight
                  size={14}
                />
              )}
            </div>
          ))}

        </nav>

        <h1 className="truncate text-2xl font-black text-slate-900 dark:text-white">

          {title}

        </h1>

        {fileName && (
          <p className="mt-1 truncate text-sm text-slate-500">

            {fileName}

          </p>
        )}

      </div>

      {/* Right */}

      <div className="flex flex-wrap items-center gap-3">

        {actions}

        {onSave && (
          <button
            onClick={onSave}
            className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold transition hover:border-blue-500 hover:bg-blue-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <Save size={18} />

            Save
          </button>
        )}

        {onDownload && (
          <button
            onClick={onDownload}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Download size={18} />

            Download
          </button>
        )}

        <button
          className="rounded-xl border border-slate-300 p-2 transition hover:border-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          aria-label="More options"
        >
          <MoreVertical size={18} />
        </button>

      </div>

    </header>
  );
}