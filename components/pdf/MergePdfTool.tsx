"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";

export default function MergePdfTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

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

      <input
        type="file"
        accept=".pdf"
        multiple
        onChange={(e) => {
          if (!e.target.files) return;
          setFiles(Array.from(e.target.files));
        }}
      />

      <div className="mt-6 space-y-3">

        {files.length === 0 ? (
          <p className="text-slate-500">
            No PDF selected
          </p>
        ) : (
          files.map((file) => (
            <div
              key={file.name}
              className="rounded-xl border p-3"
            >
              {file.name}
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