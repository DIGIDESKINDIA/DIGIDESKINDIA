"use client";

import {
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface ProgressBarProps {
  progress: number;

  status?:
    | "idle"
    | "processing"
    | "completed";

  title?: string;

  description?: string;
}

export default function ProgressBar({
  progress,
  status = "idle",
  title = "Processing PDF",
  description = "Please wait while DigiDesk India processes your file.",
}: ProgressBarProps) {
  const value = Math.max(
    0,
    Math.min(100, progress)
  );

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

      <div className="flex items-center justify-between">

        <div>

          <h2 className="text-lg font-bold text-slate-900">

            {title}

          </h2>

          <p className="mt-1 text-sm text-slate-500">

            {description}

          </p>

        </div>

        {status ===
        "processing" ? (
          <Loader2
            className="animate-spin text-blue-600"
            size={24}
          />
        ) : status ===
          "completed" ? (
          <CheckCircle2
            className="text-green-600"
            size={24}
          />
        ) : null}

      </div>

      <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-200">

        <div
          className={`h-full rounded-full transition-all duration-500

          ${
            status ===
            "completed"
              ? "bg-green-500"
              : "bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-500"
          }`}
          style={{
            width: `${value}%`,
          }}
        />

      </div>

      <div className="mt-4 flex items-center justify-between text-sm">

        <span className="font-medium text-slate-600">

          {status ===
          "completed"
            ? "Completed"
            : status ===
              "processing"
            ? "Processing..."
            : "Waiting"}

        </span>

        <span className="font-bold text-blue-600">

          {value.toFixed(0)}%

        </span>

      </div>

    </section>
  );
}