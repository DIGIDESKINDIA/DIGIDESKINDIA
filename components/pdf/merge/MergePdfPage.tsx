"use client";

import { useState } from "react";

import MergeDropzone from "./MergeDropzone";
import MergeToolbar from "./MergeToolbar";
import MergeFileList from "./MergeFileList";

export default function MergePdfPage() {
  const [files, setFiles] = useState<File[]>([]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">

      <section className="mx-auto max-w-6xl px-5 py-20">

        {/* Header */}

        <div className="mb-12 text-center">

          <span className="inline-flex items-center rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
            Professional PDF Tool
          </span>

          <h1 className="mt-5 text-5xl font-black text-slate-900 lg:text-6xl">
            Merge PDF
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Combine multiple PDF files into a single document quickly,
            securely and completely inside your browser.
          </p>

        </div>

        {/* Upload Area */}

        <MergeDropzone
          files={files}
          setFiles={setFiles}
        />

        {/* Toolbar */}

        <MergeToolbar
          files={files}
          clear={() => setFiles([])}
        />

        {/* File List */}

        <MergeFileList
          files={files}
          setFiles={setFiles}
        />

      </section>

    </main>
  );
}