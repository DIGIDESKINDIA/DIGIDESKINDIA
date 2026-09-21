"use client";

import { useRef, useState } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import { saveAs } from "file-saver";
import toast from "react-hot-toast";
import {
  RotateCw,
  Download,
  Upload,
  Loader2,
  ShieldCheck,
  FileText,
} from "lucide-react";
import PdfFilePreview from "@/components/pdf/PdfFilePreview";

export default function RotatePDFPage() {
  const inputRef =
    useRef<HTMLInputElement>(null);

  const [file, setFile] =
    useState<File | null>(null);

  const [rotation, setRotation] =
    useState(0);

  const [loading, setLoading] =
    useState(false);

  function chooseFile(
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

    setFile(selected);
    setRotation(0);

    toast.success(
      "PDF uploaded successfully."
    );
  }

  function rotatePreview() {
    if (!file) {
      toast.error(
        "Please select a PDF."
      );
      return;
    }

    setRotation((current) =>
      (current + 90) % 360
    );
  }

  async function downloadRotatedPdf() {
    if (!file) {
      toast.error(
        "Please select a PDF."
      );
      return;
    }

    try {
      setLoading(true);

      const pdf = await PDFDocument.load(
        await file.arrayBuffer(),
        { updateMetadata: false }
      );

      pdf.getPages().forEach((page) => {
        page.setRotation(
          degrees(
            (page.getRotation().angle +
              rotation) %
              360
          )
        );
      });

      const output = await pdf.save({
        useObjectStreams: true,
        addDefaultPage: false,
        updateFieldAppearances: false,
      });
      const blob = new Blob([new Uint8Array(output)], {
        type: "application/pdf",
      });

      saveAs(
        blob,
        "rotated.pdf"
      );

      toast.success(
        "PDF rotated successfully."
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">

      <section className="bg-gradient-to-r from-blue-700 via-cyan-600 to-sky-500 py-20 text-white">

        <div className="mx-auto max-w-6xl px-6 text-center">

          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-5 py-2 backdrop-blur">

            <RotateCw size={18} />

            DigiDesk India PDF Tools

          </div>

          <h1 className="mt-6 text-5xl font-black">

            Rotate PDF

          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg text-blue-100">

            Rotate every page of your PDF,
            preview the result, and download
            it when ready.

          </p>

        </div>

      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">

        <div className="rounded-3xl border bg-white p-8 shadow-sm">

          <button
            onClick={() =>
              inputRef.current?.click()
            }
            className="flex w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-blue-300 px-6 py-16 transition hover:border-blue-500 hover:bg-blue-50"
          >

            <div className="rounded-full bg-blue-100 p-5">

              <Upload
                size={36}
                className="text-blue-600"
              />

            </div>

            <h2 className="mt-5 text-3xl font-bold">

              Upload PDF

            </h2>

            <p className="mt-2 text-slate-500">

              Click to choose your PDF file.

            </p>

            <input
              hidden
              ref={inputRef}
              type="file"
              accept=".pdf"
              onChange={(e) =>
                chooseFile(
                  e.target.files?.[0] ??
                    null
                )
              }
            />

          </button>

          {file && (
            <div className="mt-8 rounded-2xl border bg-slate-50 p-5">

              <div className="flex items-center gap-4">

                <div className="rounded-xl bg-red-100 p-3">

                  <FileText
                    size={28}
                    className="text-red-600"
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

            </div>
          )}

          <PdfFilePreview
            file={file}
            rotation={rotation}
          />

          <button
            onClick={rotatePreview}
            disabled={
              !file ||
              loading
            }
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-500 py-5 text-lg font-bold text-white transition hover:shadow-xl disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" />

                Preparing preview...
              </>
            ) : (
              <>
                <RotateCw />

                Rotate Preview
              </>
            )}
          </button>

          <button
            onClick={downloadRotatedPdf}
            disabled={
              !file ||
              loading
            }
            className="mt-4 flex w-full items-center justify-center gap-3 rounded-2xl border border-blue-600 py-5 text-lg font-bold text-blue-700 transition hover:bg-blue-50 disabled:opacity-60"
          >
            <Download />

            Download Rotated PDF
          </button>

        </div>

      </section>

      <section className="mx-auto mb-20 grid max-w-6xl gap-6 px-6 md:grid-cols-3">

        <div className="rounded-3xl border bg-white p-7 shadow-sm">

          <RotateCw
            className="text-blue-600"
            size={32}
          />

          <h3 className="mt-5 text-xl font-bold">
            One-click Rotation
          </h3>

          <p className="mt-3 text-slate-600">
            Rotate and review your PDF before
            downloading it.
          </p>

        </div>

        <div className="rounded-3xl border bg-white p-7 shadow-sm">

          <ShieldCheck
            className="text-green-600"
            size={32}
          />

          <h3 className="mt-5 text-xl font-bold">
            Secure Processing
          </h3>

          <p className="mt-3 text-slate-600">
            Files are securely processed
            and never stored.
          </p>

        </div>

        <div className="rounded-3xl border bg-white p-7 shadow-sm">

          <FileText
            className="text-cyan-600"
            size={32}
          />

          <h3 className="mt-5 text-xl font-bold">
            High Quality
          </h3>

          <p className="mt-3 text-slate-600">
            Original PDF quality is
            preserved after rotation.
          </p>

        </div>

      </section>

    </main>
  );
}