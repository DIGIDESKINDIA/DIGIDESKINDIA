"use client";

import {
  FileSearch,
  UploadCloud,
  Sparkles,
} from "lucide-react";

interface EmptyStateProps {
  title?: string;

  description?: string;

  actionText?: string;

  onAction?(): void;
}

export default function EmptyState({
  title = "No File Selected",

  description = "Upload a PDF to begin using DigiDesk India's powerful PDF tools.",

  actionText = "Choose PDF",

  onAction,
}: EmptyStateProps) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

      <div className="bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-500 p-10 text-white">

        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white/20 backdrop-blur">

          <FileSearch size={52} />

        </div>

        <h2 className="mt-8 text-center text-4xl font-black">

          {title}

        </h2>

        <p className="mx-auto mt-4 max-w-2xl text-center text-blue-100">

          {description}

        </p>

      </div>

      <div className="p-10">

        <div className="grid gap-5 md:grid-cols-3">

          <div className="rounded-2xl bg-slate-50 p-6">

            <UploadCloud
              className="text-blue-600"
              size={34}
            />

            <h3 className="mt-5 text-lg font-bold">

              Upload

            </h3>

            <p className="mt-2 text-sm text-slate-600">

              Select your PDF securely from your computer.

            </p>

          </div>

          <div className="rounded-2xl bg-slate-50 p-6">

            <Sparkles
              className="text-cyan-600"
              size={34}
            />

            <h3 className="mt-5 text-lg font-bold">

              Process

            </h3>

            <p className="mt-2 text-sm text-slate-600">

              DigiDesk India processes your PDF using our optimized engine.

            </p>

          </div>

          <div className="rounded-2xl bg-slate-50 p-6">

            <FileSearch
              className="text-green-600"
              size={34}
            />

            <h3 className="mt-5 text-lg font-bold">

              Download

            </h3>

            <p className="mt-2 text-sm text-slate-600">

              Download your processed PDF instantly.

            </p>

          </div>

        </div>

        {onAction && (

          <div className="mt-10 flex justify-center">

            <button
              onClick={onAction}
              className="rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-500 px-10 py-4 text-lg font-bold text-white shadow-lg transition hover:-translate-y-1 hover:shadow-xl"
            >
              {actionText}
            </button>

          </div>

        )}

      </div>

    </section>
  );
}