"use client";

import {
  Download,
  Settings2,
  Trash2,
  Play,
  Loader2,
} from "lucide-react";

interface ToolbarProps {
  title: string;

  processing?: boolean;

  canProcess?: boolean;

  onProcess(): void;

  onReset(): void;

  onDownload?(): void;

  onSettings?(): void;
}

export default function Toolbar({
  title,

  processing = false,

  canProcess = true,

  onProcess,

  onReset,

  onDownload,

  onSettings,
}: ToolbarProps) {
  return (
    <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

        <div>

          <h2 className="text-2xl font-bold text-slate-900">

            {title}

          </h2>

          <p className="mt-2 text-sm text-slate-500">

            Configure your image and execute the selected operation.

          </p>

        </div>

        <div className="flex flex-wrap gap-3">

          {onSettings && (
            <button
              onClick={onSettings}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold transition hover:border-blue-500 hover:bg-blue-50"
            >
              <Settings2 size={18} />

              Settings
            </button>
          )}

          {onDownload && (
            <button
              onClick={onDownload}
              className="inline-flex items-center gap-2 rounded-xl border border-green-300 bg-green-50 px-5 py-3 font-semibold text-green-700 transition hover:bg-green-100"
            >
              <Download size={18} />

              Download
            </button>
          )}

          <button
            onClick={onReset}
            className="inline-flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-5 py-3 font-semibold text-red-700 transition hover:bg-red-100"
          >
            <Trash2 size={18} />

            Reset
          </button>

          <button
            onClick={onProcess}
            disabled={processing || !canProcess}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-500 px-7 py-3 font-bold text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
          >
            {processing ? (
              <>
                <Loader2 size={18} className="animate-spin" />

                Processing...
              </>
            ) : (
              <>
                <Play size={18} />

                Process Image
              </>
            )}
          </button>

        </div>

      </div>

    </section>
  );
}
