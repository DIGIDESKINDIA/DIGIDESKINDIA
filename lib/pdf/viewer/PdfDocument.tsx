"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";

import type { PDFDocumentProxy } from "pdfjs-dist";

import { loadPdf } from "@/lib/pdf/worker";

interface PdfContextValue {
  pdf: PDFDocumentProxy | null;
  loading: boolean;
  error: string | null;
  pageCount: number;
}

const PdfContext =
  createContext<PdfContextValue>({
    pdf: null,
    loading: false,
    error: null,
    pageCount: 0,
  });

interface PdfDocumentProps {
  file: File | null;
  children: ReactNode;
}

export default function PdfDocument({
  file,
  children,
}: PdfDocumentProps) {
  const [pdf, setPdf] =
    useState<PDFDocumentProxy | null>(
      null
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function openPdf() {
      if (!file) {
        setPdf(null);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const document =
          await loadPdf(file);

        if (cancelled) return;

        setPdf(document);
      } catch (err) {
        if (cancelled) return;

        setPdf(null);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load PDF."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    openPdf();

    return () => {
      cancelled = true;
    };
  }, [file]);

  const value = useMemo(
    () => ({
      pdf,
      loading,
      error,
      pageCount:
        pdf?.numPages ?? 0,
    }),
    [pdf, loading, error]
  );

  return (
    <PdfContext.Provider
      value={value}
    >
      {children}
    </PdfContext.Provider>
  );
}

export function usePdfDocument() {
  return useContext(PdfContext);
}