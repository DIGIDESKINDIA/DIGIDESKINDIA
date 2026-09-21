"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  Upload,
  ShieldCheck,
  Scissors,
  FileArchive,
  FileText,
} from "lucide-react";

import SplitButton from "./SplitButton";
import PdfFilePreview from "@/components/pdf/PdfFilePreview";

export default function SplitPDFPage() {
  const inputRef =
    useRef<HTMLInputElement>(null);

  const [file, setFile] =
    useState<File | null>(null);

  function selectFile(
    selected: File | null
  ) {
    if (!selected) return;

    if (
      selected.type !==
      "application/pdf"
    ) {
      toast.error(
        "Please select a PDF file."
      );
      return;
    }

    if (selected.size === 0) {
      toast.error(
        "Selected PDF is empty."
      );
      return;
    }

    setFile(selected);

    toast.success(
      "PDF uploaded successfully."
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">

      {/* Hero */}

      <section className="bg-gradient-to-r from-blue-700 via-cyan-600 to-sky-500 text-white">

        <div className="mx-auto max-w-6xl px-6 py-20 text-center">

          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-5 py-2 text-sm backdrop-blur">

            <Scissors size={18} />

            DigiDesk India PDF Tools

          </div>

          <h1 className="mt-6 text-5xl font-black tracking-tight">

            Split PDF

          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg text-blue-100">

            Split large PDF documents into
            individual pages instantly.
            Every page will be packed into
            a ZIP archive for download.

          </p>

        </div>

      </section>

      {/* Upload */}

      <section className="mx-auto max-w-6xl px-6 py-14">

        <div className="rounded-3xl border bg-white p-8 shadow-sm">

          <button
            onClick={() =>
              inputRef.current?.click()
            }
            className="flex w-full cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-blue-300 px-6 py-16 transition hover:border-blue-500 hover:bg-blue-50"
          >

            <div className="rounded-full bg-blue-100 p-5">

              <Upload
                size={38}
                className="text-blue-600"
              />

            </div>

            <h2 className="mt-6 text-3xl font-bold">

              Upload PDF

            </h2>

            <p className="mt-3 text-slate-500">

              Click here to choose your PDF.

            </p>

            <input
              ref={inputRef}
              hidden
              type="file"
              accept=".pdf"
              onChange={(e) =>
                selectFile(
                  e.target.files?.[0] ??
                    null
                )
              }
            />

          </button>

          {file && (

            <div className="mt-8 rounded-2xl border bg-slate-50 p-5">

              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                <div className="flex items-center gap-4">

                  <div className="rounded-xl bg-red-100 p-3">

                    <FileText
                      className="text-red-600"
                      size={30}
                    />

                  </div>

                  <div>

                    <h3 className="font-bold">

                      {file.name}

                    </h3>

                    <p className="text-sm text-slate-500">

                      {(
                        file.size /
                        1024 /
                        1024
                      ).toFixed(2)}{" "}
                      MB

                    </p>

                  </div>

                </div>

                <div className="rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-700">

                  Ready

                </div>

              </div>

            </div>

          )}

          <PdfFilePreview file={file} title="PDF Preview" />

          <SplitButton
            file={file}
          />

        </div>

      </section>

      {/* Features */}

      <section className="mx-auto mb-20 grid max-w-6xl gap-6 px-6 md:grid-cols-3">

        <div className="rounded-3xl border bg-white p-7 shadow-sm">

          <Scissors
            className="text-blue-600"
            size={32}
          />

          <h3 className="mt-5 text-xl font-bold">

            Every Page

          </h3>

          <p className="mt-3 text-slate-600">

            Split every page into a separate
            PDF automatically.

          </p>

        </div>

        <div className="rounded-3xl border bg-white p-7 shadow-sm">

          <FileArchive
            className="text-green-600"
            size={32}
          />

          <h3 className="mt-5 text-xl font-bold">

            ZIP Download

          </h3>

          <p className="mt-3 text-slate-600">

            Download all generated PDF pages
            inside a ZIP archive.

          </p>

        </div>

        <div className="rounded-3xl border bg-white p-7 shadow-sm">

          <ShieldCheck
            className="text-cyan-600"
            size={32}
          />

          <h3 className="mt-5 text-xl font-bold">

            Secure Processing

          </h3>

          <p className="mt-3 text-slate-600">

            Files are processed securely and
            never stored permanently.

          </p>

        </div>

      </section>

    </main>
  );
}