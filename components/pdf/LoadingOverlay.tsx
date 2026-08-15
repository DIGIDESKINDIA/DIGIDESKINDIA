"use client";

import {
  Loader2,
  ShieldCheck,
  FileText,
} from "lucide-react";

interface LoadingOverlayProps {
  open: boolean;

  title?: string;

  description?: string;

  progress?: number;
}

export default function LoadingOverlay({
  open,

  title = "Processing PDF",

  description = "Please wait while DigiDesk India securely processes your document.",

  progress = 0,
}: LoadingOverlayProps) {
  if (!open) return null;

  const value = Math.min(
    100,
    Math.max(0, progress)
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 p-6 backdrop-blur-sm">

      <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl">

        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">

          <Loader2
            size={42}
            className="animate-spin text-blue-600"
          />

        </div>

        <h2 className="mt-6 text-center text-2xl font-bold text-slate-900">

          {title}

        </h2>

        <p className="mx-auto mt-3 max-w-sm text-center text-slate-500">

          {description}

        </p>

        <div className="mt-8 h-3 overflow-hidden rounded-full bg-slate-200">

          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-500 transition-all duration-500"
            style={{
              width: `${value}%`,
            }}
          />

        </div>

        <div className="mt-3 flex items-center justify-between">

          <span className="text-sm text-slate-500">

            Processing...

          </span>

          <span className="font-bold text-blue-600">

            {value.toFixed(0)}%

          </span>

        </div>

        <div className="mt-8 rounded-2xl border bg-slate-50 p-5">

          <div className="flex items-center gap-4">

            <div className="rounded-xl bg-green-100 p-3">

              <ShieldCheck
                className="text-green-600"
                size={24}
              />

            </div>

            <div>

              <h3 className="font-semibold">

                Secure Processing

              </h3>

              <p className="text-sm text-slate-500">

                Your files are processed securely and are never permanently stored.

              </p>

            </div>

          </div>

        </div>

        <div className="mt-5 flex items-center justify-center gap-2 text-sm text-slate-500">

          <FileText
            size={16}
          />

          DigiDesk India PDF Engine

        </div>

      </div>

    </div>
  );
}