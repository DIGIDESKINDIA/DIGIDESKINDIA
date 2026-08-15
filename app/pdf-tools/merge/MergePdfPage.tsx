"use client";

import { useState } from "react";

import MergeButton from "./MergeButton";
import MergeDropzone from "./MergeDropzone";
import MergeFileList from "./MergeFileList";

export default function MergePdfPage() {
  const [files, setFiles] = useState<File[]>([]);

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-5 py-4 text-sm text-slate-500">
          Home / PDF Tools / <span className="font-medium text-slate-800">Merge PDF</span>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex rounded-full bg-blue-100 px-4 py-1 text-sm font-medium text-blue-700">
            Free PDF Tool
          </span>

          <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
            Merge PDF Files
          </h1>

          <p className="mt-5 text-lg text-slate-600">
            Combine multiple PDF files into a single document quickly and securely.
            Your files stay private and are processed efficiently.
          </p>
        </div>

        <div className="mt-12 rounded-2xl border bg-white p-6 shadow-sm">
          <MergeDropzone files={files} setFiles={setFiles} />

          <div className="mt-8">
            <MergeFileList files={files} setFiles={setFiles} />
          </div>

          <div className="mt-8">
            <MergeButton files={files} />
          </div>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border bg-white p-6">
            <h3 className="font-semibold">Fast Processing</h3>
            <p className="mt-2 text-sm text-slate-600">
              Merge PDFs in seconds with an optimized processing engine.
            </p>
          </div>

          <div className="rounded-xl border bg-white p-6">
            <h3 className="font-semibold">Secure</h3>
            <p className="mt-2 text-sm text-slate-600">
              Your uploaded files are processed securely and are not stored permanently.
            </p>
          </div>

          <div className="rounded-xl border bg-white p-6">
            <h3 className="font-semibold">Unlimited Usage</h3>
            <p className="mt-2 text-sm text-slate-600">
              Merge as many PDF files as you need without unnecessary complexity.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}