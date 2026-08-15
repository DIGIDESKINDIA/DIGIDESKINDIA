"use client";

import {
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  Document,
  Page,
  pdfjs,
} from "react-pdf";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import PdfError from "./PdfError";
import PdfLoading from "./PdfLoading";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface PdfViewerProps {
  file: File;
  zoom?: number;
  rotation?: number;

  onPageCountChange?: (
    pageCount: number
  ) => void;

  onDocumentReady?: (
    pageCount: number
  ) => void;
}

export default function PdfViewer({
  file,
  zoom = 100,
  rotation = 0,
  onPageCountChange,
  onDocumentReady,
}: PdfViewerProps) {
  const [pageCount, setPageCount] =
    useState(0);

  const [error, setError] =
    useState<string | null>(null);

  const [prevFile, setPrevFile] = useState(file);
  if (file !== prevFile) {
    setPrevFile(file);
    setError(null);
    setPageCount(0);
  }


  const documentFile = useMemo(
    () => file,
    [file]
  );

  const normalizedRotation =
    ((rotation % 360) + 360) % 360;

  const scale = Math.max(
    0.25,
    Math.min(4, zoom / 100)
  );

  /*
   * Keep the same File reference while the
   * document is mounted. Zoom/rotation changes
   * should not reload the PDF document.
   */
  const handleLoadSuccess =
    useCallback(
      (pdf: { numPages: number }) => {
        const count = pdf.numPages;

        setPageCount(count);
        setError(null);

        onPageCountChange?.(count);
        onDocumentReady?.(count);
      },
      [
        onDocumentReady,
        onPageCountChange,
      ]
    );

  const handleLoadError = useCallback(
    (loadError: Error) => {
      console.error(
        "PDF load error:",
        loadError
      );

      setError(
        loadError.message ||
          "Unable to load this PDF."
      );

      setPageCount(0);
      onPageCountChange?.(0);
    },
    [onPageCountChange]
  );

  if (error) {
    return (
      <PdfError
        message={error}
      />
    );
  }

  return (
    <div className="min-h-full w-full">
      <Document
        file={documentFile}
        onLoadSuccess={handleLoadSuccess}
        onLoadError={handleLoadError}
        loading={<PdfLoading />}
        error={
          <PdfError message="The PDF could not be loaded." />
        }
        className="mx-auto flex w-full flex-col items-center"
      >
        {pageCount > 0 &&
          Array.from(
            {
              length: pageCount,
            },
            (_, index) => {
              const pageNumber =
                index + 1;

              return (
                <div
                  key={pageNumber}
                  data-page-number={
                    pageNumber
                  }
                  className="mb-8 flex w-full justify-center last:mb-0"
                >
                  <div className="relative overflow-hidden rounded-md bg-white shadow-[0_10px_35px_rgba(15,23,42,0.22)] ring-1 ring-black/5">
                    <Page
                      pageNumber={
                        pageNumber
                      }
                      scale={scale}
                      rotate={
                        normalizedRotation
                      }
                      renderTextLayer
                      renderAnnotationLayer
                      loading={
                        <div className="flex h-[500px] w-[350px] items-center justify-center bg-white">
                          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
                        </div>
                      }
                    />

                    <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-950/75 px-3 py-1 text-[11px] font-semibold text-white opacity-0 shadow-sm transition-opacity hover:opacity-100">
                      Page {pageNumber}
                    </div>
                  </div>
                </div>
              );
            }
          )}
      </Document>
    </div>
  );
}