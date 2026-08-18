"use client";

import { useRef, useState } from "react";
import { saveAs } from "file-saver";
import toast from "react-hot-toast";
import {
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  Upload,
} from "lucide-react";

export default function PdfToJpgPage() {
  const inputRef =
    useRef<HTMLInputElement>(null);

  const [file, setFile] =
    useState<File | null>(null);

  const [quality, setQuality] =
    useState(90);

  const [scale, setScale] =
    useState(1.5);

  const [pages, setPages] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  function selectFile(
    selected: File | null
  ) {
    if (!selected) return;

    const isPdf =
      selected.type ===
        "application/pdf" ||
      selected.name
        .toLowerCase()
        .endsWith(".pdf");

    if (!isPdf) {
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

  async function handleConvert() {
    if (!file || loading) {
      return;
    }

    try {
      setLoading(true);

      const formData =
        new FormData();

      formData.append("file", file);
      formData.append("format", "jpg");
      formData.append(
        "quality",
        String(quality)
      );
      formData.append(
        "scale",
        String(scale)
      );

      if (pages.trim()) {
        formData.append(
          "pages",
          pages.trim()
        );
      }

      const response =
        await fetch(
          "/api/pdf/pdf-to-image",
          {
            method: "POST",
            body: formData,
          }
        );

      if (!response.ok) {
        let message =
          "Unable to convert PDF to JPG.";

        try {
          const data =
            await response.json();

          message =
            data.message ?? message;
        } catch {}

        throw new Error(message);
      }

      const blob =
        await response.blob();

      if (
        blob.size <= 0 ||
        blob.type !==
          "application/zip"
      ) {
        throw new Error(
          "The server did not return a valid ZIP file."
        );
      }

      const now = new Date();

      const fileName = `${file.name.replace(
        /\.pdf$/i,
        ""
      )}-JPG-${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, "0")}-${String(
        now.getDate()
      ).padStart(2, "0")}.zip`;

      saveAs(blob, fileName);

      toast.success(
        "PDF converted to JPG successfully."
      );
    } catch (error) {
      console.error(error);

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
      <section className="bg-gradient-to-r from-blue-700 via-cyan-600 to-sky-500 text-white">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-5 py-2 text-sm backdrop-blur">
            <ImageIcon size={18} />
            DigiDesk India PDF Tools
          </div>

          <h1 className="mt-6 text-5xl font-black tracking-tight">
            PDF to JPG
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg text-blue-100">
            Render every PDF page into real JPG images and download them in a ZIP archive.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="rounded-3xl border bg-white p-8 shadow-sm">
          <button
            onClick={() =>
              inputRef.current?.click()
            }
            className="flex w-full cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-blue-300 px-6 py-14 transition hover:border-blue-500 hover:bg-blue-50"
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
              Choose a PDF file to render JPG pages.
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
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">
                    JPG Quality ({quality})
                  </span>

                  <input
                    type="range"
                    min={30}
                    max={100}
                    value={quality}
                    onChange={(e) =>
                      setQuality(
                        Number(
                          e.target.value
                        )
                      )
                    }
                    className="w-full"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Render Scale ({scale.toFixed(1)}x)
                  </span>

                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.1}
                    value={scale}
                    onChange={(e) =>
                      setScale(
                        Number(
                          e.target.value
                        )
                      )
                    }
                    className="w-full"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Pages (optional)
                  </span>

                  <input
                    type="text"
                    value={pages}
                    onChange={(e) =>
                      setPages(
                        e.target.value
                      )
                    }
                    placeholder="e.g. 1,3,5"
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </label>
              </div>
            </div>
          )}

          <button
            onClick={handleConvert}
            disabled={!file || loading}
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-500 px-8 py-5 text-lg font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2
                  size={22}
                  className="animate-spin"
                />
                Rendering JPG pages...
              </>
            ) : (
              <>
                <Download size={22} />
                Convert to JPG & Download ZIP
              </>
            )}
          </button>
        </div>
      </section>
    </main>
  );
}
