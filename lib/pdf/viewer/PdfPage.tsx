"use client";

import { useState } from "react";

import type { PDFPageProxy } from "pdfjs-dist";

import PdfCanvas from "./PdfCanvas";

import { usePdfViewer } from "./PdfViewerProvider";

interface PdfPageProps {
  page: PDFPageProxy;

  pageNumber: number;

  className?: string;
}

export default function PdfPage({
  page,
  pageNumber,
  className,
}: PdfPageProps) {
  const {
    zoom,
    rotation,
    selectedPages,
    togglePage,
    setCurrentPage,
  } = usePdfViewer();

  const [rendered, setRendered] =
    useState(false);

  const [prevDeps, setPrevDeps] = useState({ zoom, rotation, page });
  if (prevDeps.zoom !== zoom || prevDeps.rotation !== rotation || prevDeps.page !== page) {
    setPrevDeps({ zoom, rotation, page });
    setRendered(false);
  }

  const selected =
    selectedPages.includes(pageNumber);

  return (
    <section
      id={`pdf-page-${pageNumber}`}
      className={`relative mx-auto mb-10 w-fit transition ${className ?? ""}`}
      onMouseEnter={() =>
        setCurrentPage(pageNumber)
      }
    >
      {/* Page Toolbar */}

      <div className="mb-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">

        <div className="flex items-center gap-3">

          <button
            onClick={() =>
              togglePage(pageNumber)
            }
            className={`h-5 w-5 rounded border transition ${
              selected
                ? "border-blue-600 bg-blue-600"
                : "border-slate-400"
            }`}
            aria-label={`Select page ${pageNumber}`}
          />

          <span className="text-sm font-semibold">

            Page {pageNumber}

          </span>

        </div>

        <span className="text-xs text-slate-500">

          {zoom}%

        </span>

      </div>

      {/* Loading Overlay */}

      {!rendered && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/70 backdrop-blur-sm dark:bg-slate-900/70">

          <div className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow">

            Rendering...

          </div>

        </div>
      )}

      {/* Canvas */}

      <PdfCanvas
        page={page}
        scale={zoom / 100}
        rotation={rotation}
        onRendered={() =>
          setRendered(true)
        }
      />

      {/* Future Overlay Layer */}

      <div className="pointer-events-none absolute inset-0">

        {/* OCR Layer */}

        {/* Annotation Layer */}

        {/* AI Layer */}

        {/* Watermark Preview */}

        {/* Selection Box */}

      </div>
    </section>
  );
}