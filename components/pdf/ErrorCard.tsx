"use client";

import {
  AlertTriangle,
  RefreshCcw,
  Bug,
} from "lucide-react";

interface ErrorCardProps {
  title?: string;

  message: string;

  details?: string;

  retryText?: string;

  onRetry?(): void;
}

export default function ErrorCard({
  title = "Something went wrong",

  message,

  details,

  retryText = "Try Again",

  onRetry,
}: ErrorCardProps) {
  return (
    <section className="rounded-3xl border border-red-200 bg-white p-8 shadow-sm">

      <div className="flex flex-col items-center text-center">

        <div className="rounded-full bg-red-100 p-5">

          <AlertTriangle
            size={48}
            className="text-red-600"
          />

        </div>

        <h2 className="mt-6 text-2xl font-bold text-slate-900">

          {title}

        </h2>

        <p className="mt-3 max-w-xl text-slate-600">

          {message}

        </p>

        {details && (
          <div className="mt-6 w-full rounded-2xl border border-red-100 bg-red-50 p-5 text-left">

            <div className="flex items-start gap-3">

              <Bug
                size={20}
                className="mt-0.5 text-red-600"
              />

              <div>

                <h3 className="font-semibold text-red-700">

                  Technical Details

                </h3>

                <p className="mt-2 break-words text-sm text-red-600">

                  {details}

                </p>

              </div>

            </div>

          </div>
        )}

        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-red-600 to-orange-500 px-8 py-4 font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            <RefreshCcw
              size={20}
            />

            {retryText}
          </button>
        )}

      </div>

    </section>
  );
}