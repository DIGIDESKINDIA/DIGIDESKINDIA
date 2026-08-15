"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from "react";

interface PdfViewerContextValue {
  zoom: number;
  rotation: number;
  currentPage: number;
  selectedPages: number[];

  setZoom(value: number): void;
  zoomIn(): void;
  zoomOut(): void;

  setRotation(value: number): void;

  setCurrentPage(page: number): void;

  togglePage(page: number): void;

  clearSelection(): void;
}

const PdfViewerContext =
  createContext<PdfViewerContextValue | null>(
    null
  );

interface Props {
  children: ReactNode;
}

export default function PdfViewerProvider({
  children,
}: Props) {
  const [zoom, setZoom] =
    useState(100);

  const [rotation, setRotation] =
    useState(0);

  const [currentPage, setCurrentPage] =
    useState(1);

  const [selectedPages, setSelectedPages] =
    useState<number[]>([]);

  function zoomIn() {
    setZoom((z) =>
      Math.min(z + 10, 400)
    );
  }

  function zoomOut() {
    setZoom((z) =>
      Math.max(z - 10, 25)
    );
  }

  function togglePage(page: number) {
    setSelectedPages((old) =>
      old.includes(page)
        ? old.filter(
            (p) => p !== page
          )
        : [...old, page].sort(
            (a, b) => a - b
          )
    );
  }

  function clearSelection() {
    setSelectedPages([]);
  }

  const value = useMemo(
    () => ({
      zoom,
      rotation,
      currentPage,
      selectedPages,

      setZoom,
      zoomIn,
      zoomOut,

      setRotation,

      setCurrentPage,

      togglePage,

      clearSelection,
    }),
    [
      zoom,
      rotation,
      currentPage,
      selectedPages,
    ]
  );

  return (
    <PdfViewerContext.Provider
      value={value}
    >
      {children}
    </PdfViewerContext.Provider>
  );
}

export function usePdfViewer() {
  const context =
    useContext(PdfViewerContext);

  if (!context) {
    throw new Error(
      "usePdfViewer must be used inside PdfViewerProvider."
    );
  }

  return context;
}