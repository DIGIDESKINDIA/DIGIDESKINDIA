import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";

let initialized = false;

/**
 * Initializes the PDF.js worker.
 * Safe to call multiple times.
 */
export function initializePdfWorker() {
  if (initialized) return;

  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  initialized = true;
}

export async function loadPdf(file: File): Promise<PDFDocumentProxy> {
  initializePdfWorker();
  const buffer = await file.arrayBuffer();
  return pdfjs.getDocument({ data: buffer }).promise;
}

export { pdfjs };