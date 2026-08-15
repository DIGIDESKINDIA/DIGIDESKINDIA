"use client";

import {
  CheckCircle2,
  Download,
  Sparkles,
  ArrowRight,
} from "lucide-react";

interface SuccessCardProps {
  title?: string;

  message?: string;

  fileName?: string;

  fileSize?: number;

  buttonText?: string;

  onDownload?(): void;

  onContinue?(): void;
}

export default function SuccessCard({
  title = "PDF Processed Successfully",

  message = "Your PDF has been processed successfully and is ready for download.",

  fileName,

  fileSize,

  buttonText = "Download File",

  onDownload,

  onContinue,
}: SuccessCardProps) {
  return (
    <section className="overflow-hidden rounded-3xl border border-green-200 bg-white shadow-sm">

      <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 p-8 text-white">

        <div className="flex items-center gap-5">

          <div className="rounded-full bg-white/20 p-4 backdrop-blur">

            <CheckCircle2
              size={42}
            />

          </div>

          <div>

            <h2 className="text-3xl font-black">

              {title}

            </h2>

            <p className="mt-2 text-green-50">

              {message}

            </p>

          </div>

        </div>

      </div>

      <div className="space-y-6 p-8">

        {fileName && (
          <div className="rounded-2xl border bg-slate-50 p-5">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-500">

                  Output File

                </p>

                <h3 className="mt-1 break-all text-lg font-bold text-slate-900">

                  {fileName}

                </h3>

              </div>

              {fileSize !== undefined && (
                <div className="text-right">

                  <p className="text-sm text-slate-500">

                    Size

                  </p>

                  <h3 className="text-lg font-bold text-blue-700">

                    {(fileSize / 1024 / 1024).toFixed(2)} MB

                  </h3>

                </div>
              )}

            </div>

          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">

          <div className="rounded-2xl bg-blue-50 p-5">

            <Sparkles
              className="text-blue-600"
              size={28}
            />

            <h4 className="mt-4 font-bold">

              High Quality

            </h4>

            <p className="mt-2 text-sm text-slate-600">

              Output generated without reducing document quality.

            </p>

          </div>

          <div className="rounded-2xl bg-green-50 p-5">

            <CheckCircle2
              className="text-green-600"
              size={28}
            />

            <h4 className="mt-4 font-bold">

              Secure

            </h4>

            <p className="mt-2 text-sm text-slate-600">

              Files are processed securely and never permanently stored.

            </p>

          </div>

          <div className="rounded-2xl bg-cyan-50 p-5">

            <Download
              className="text-cyan-600"
              size={28}
            />

            <h4 className="mt-4 font-bold">

              Ready

            </h4>

            <p className="mt-2 text-sm text-slate-600">

              Your document is ready to download immediately.

            </p>

          </div>

        </div>

        <div className="flex flex-col gap-4 md:flex-row">

          {onDownload && (
            <button
              onClick={onDownload}
              className="flex flex-1 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-500 px-8 py-4 text-lg font-bold text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <Download size={22} />

              {buttonText}
            </button>
          )}

          {onContinue && (
            <button
              onClick={onContinue}
              className="flex items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-white px-8 py-4 text-lg font-bold text-slate-700 transition hover:border-blue-500 hover:bg-blue-50"
            >
              Continue

              <ArrowRight
                size={20}
              />
            </button>
          )}

        </div>

      </div>

    </section>
  );
}