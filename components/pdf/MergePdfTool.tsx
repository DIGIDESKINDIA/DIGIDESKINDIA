"use client";

import { DragEvent, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { UploadCloud, X } from "lucide-react";
import { FileThumbnail } from "@/components/pdf/UploadZone";

export default function MergePdfTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;

    const selected = Array.from(fileList).filter(
      (file) =>
        (file.type === "application/pdf" ||
          file.name.toLowerCase().endsWith(".pdf")) &&
        file.size > 0
    );

    if (!selected.length) {
      alert("Please select valid PDF files.");
      return;
    }

    const uniqueFiles = selected.filter(
      (file) =>
        !files.some(
          (existing) =>
            existing.name === file.name &&
            existing.size === file.size &&
            existing.lastModified === file.lastModified
        )
    );

    setFiles([...files, ...uniqueFiles]);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  }

  async function mergePDFs() {
    if (files.length < 2) {
      alert("Please select at least 2 PDF files.");
      return;
    }

    try {
      setLoading(true);

      const mergedPdf = await PDFDocument.create();

      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const pdf = await PDFDocument.load(bytes);

        const pages = await mergedPdf.copyPages(
          pdf,
          pdf.getPageIndices()
        );

        pages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedBytes = await mergedPdf.save();
      const pdfBuffer = new Uint8Array(mergedBytes).buffer as ArrayBuffer;

      const blob = new Blob([pdfBuffer], {
        type: "application/pdf",
      });

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "DigiDesk-Merged.pdf";
      a.click();

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Unable to merge PDF files.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl bg-white p-8 shadow-xl">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
          dragging
            ? "border-blue-600 bg-blue-50"
            : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50"
        }`}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
          <UploadCloud size={32} />
        </div>

        <h2 className="mt-5 text-xl font-bold text-slate-900">
          {dragging ? "Drop PDF files here" : "Drag & drop PDF files"}
        </h2>

        <p className="mt-2 text-sm text-slate-600">
          or click below to browse your device
        </p>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            inputRef.current?.click();
          }}
          className="mt-5 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-blue-700"
        >
          Choose PDF files
        </button>

        <p className="mt-3 text-xs font-medium text-slate-500">
          Select two or more PDF files
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          hidden
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      <div className="mt-6 space-y-3">

        {files.length === 0 ? (
          <p className="text-slate-500">
            No PDF selected
          </p>
        ) : (
          files.map((file) => (
            <div
              key={file.name}
              className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"
            >
              <FileThumbnail file={file} />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
                {file.name}
              </span>
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={() =>
                  setFiles(files.filter((item) => item !== file))
                }
                className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                <X size={17} />
              </button>
            </div>
          ))
        )}

      </div>

      <button
        onClick={mergePDFs}
        disabled={loading}
        className="mt-8 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white disabled:opacity-50"
      >
        {loading ? "Merging..." : "Merge PDF"}
      </button>

    </div>
  );
}