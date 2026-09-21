"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { Download, FileText, Loader2, UploadCloud } from "lucide-react";
import { saveAs } from "file-saver";

type Props = {
  title: string;
  description: string;
  accept: string;
  extensions: string;
};

export default function OfficeToPdfTool({
  title,
  description,
  accept,
  extensions,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [output, setOutput] = useState<Blob | null>(null);

  function selectFile(selected: File | null) {
    if (!selected) return;

    const normalizedExtensions = extensions.replace(/^\\\\/, "\\");
    const matchesExtension = new RegExp(normalizedExtensions, "i").test(selected.name);

    if (!matchesExtension || selected.size === 0) {
      setError(`Please select a valid ${title.replace(" to PDF", "")} file.`);
      return;
    }

    setFile(selected);
    setOutput(null);
    setError("");
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0] ?? null);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    selectFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function convert() {
    if (!file) {
      setError("Please select a file first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", "office-to-pdf");

      const response = await fetch("/api/pdf/convert", {
        method: "POST",
        body: form,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? "Conversion failed.");
      }

      setOutput(await response.blob());
    } catch (conversionError) {
      setError(
        conversionError instanceof Error
          ? conversionError.message
          : "Conversion failed."
      );
    } finally {
      setLoading(false);
    }
  }

  function download() {
    if (!output || !file) return;
    saveAs(output, `${file.name.replace(/\.[^.]+$/, "")}.pdf`);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900 sm:px-6">
      <section className="mx-auto max-w-3xl">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
            DigiDesk PDF Tools
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">{title}</h1>
          <p className="mx-auto mt-4 max-w-xl text-slate-600">{description}</p>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-5 shadow-xl sm:p-8">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 text-center transition ${
              dragging
                ? "border-blue-600 bg-blue-50"
                : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50"
            }`}
          >
            <UploadCloud size={42} className="text-blue-600" />
            <h2 className="mt-5 text-xl font-bold">Drag & drop your file here</h2>
            <p className="mt-2 text-sm text-slate-600">or click to choose from your device</p>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                inputRef.current?.click();
              }}
              className="mt-6 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
            >
              Choose File
            </button>
            <input ref={inputRef} hidden type="file" accept={accept} onChange={handleChange} />
          </div>

          {file && (
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <FileText className="shrink-0 text-blue-600" size={22} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{file.name}</p>
                <p className="text-sm text-slate-600">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
          )}

          {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

          {!output ? (
            <button
              type="button"
              onClick={convert}
              disabled={loading || !file}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <FileText size={20} />}
              {loading ? "Converting..." : title}
            </button>
          ) : (
            <button type="button" onClick={download} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-4 font-bold text-white hover:bg-emerald-700">
              <Download size={20} /> Download PDF
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
