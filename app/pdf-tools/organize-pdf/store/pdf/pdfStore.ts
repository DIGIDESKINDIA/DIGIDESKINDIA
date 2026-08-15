import { create } from "zustand";
import type { PDFDocumentProxy } from "pdfjs-dist";

export interface PdfStore {
  // Document
  file: File | null;
  pdf: PDFDocumentProxy | null;

  // Viewer
  pageCount: number;
  currentPage: number;

  zoom: number;
  rotation: number;

  // UI
  loading: boolean;
  error: string | null;

  // Selection
  selectedPages: number[];

  // Actions

  setFile: (file: File | null) => void;

  setPdf: (pdf: PDFDocumentProxy | null) => void;

  setPageCount: (count: number) => void;

  setCurrentPage: (page: number) => void;

  setZoom: (zoom: number) => void;

  zoomIn: () => void;

  zoomOut: () => void;

  resetZoom: () => void;

  setRotation: (rotation: number) => void;

  rotateLeft: () => void;

  rotateRight: () => void;

  setLoading: (loading: boolean) => void;

  setError: (error: string | null) => void;

  toggleSelection: (page: number) => void;

  clearSelection: () => void;

  reset: () => void;
}

export const usePdfStore = create<PdfStore>((set) => ({
  file: null,

  pdf: null,

  pageCount: 0,

  currentPage: 1,

  zoom: 100,

  rotation: 0,

  loading: false,

  error: null,

  selectedPages: [],

  setFile: (file) =>
    set({
      file,
    }),

  setPdf: (pdf) =>
    set({
      pdf,
    }),

  setPageCount: (pageCount) =>
    set({
      pageCount,
    }),

  setCurrentPage: (currentPage) =>
    set({
      currentPage,
    }),

  setZoom: (zoom) =>
    set({
      zoom,
    }),

  zoomIn: () =>
    set((state) => ({
      zoom: Math.min(
        state.zoom + 10,
        400
      ),
    })),

  zoomOut: () =>
    set((state) => ({
      zoom: Math.max(
        state.zoom - 10,
        25
      ),
    })),

  resetZoom: () =>
    set({
      zoom: 100,
    }),

  setRotation: (rotation) =>
    set({
      rotation,
    }),

  rotateLeft: () =>
    set((state) => ({
      rotation:
        state.rotation - 90,
    })),

  rotateRight: () =>
    set((state) => ({
      rotation:
        state.rotation + 90,
    })),

  setLoading: (loading) =>
    set({
      loading,
    }),

  setError: (error) =>
    set({
      error,
    }),

  toggleSelection: (page) =>
    set((state) => ({
      selectedPages:
        state.selectedPages.includes(page)
          ? state.selectedPages.filter(
              (p) => p !== page
            )
          : [
              ...state.selectedPages,
              page,
            ],
    })),

  clearSelection: () =>
    set({
      selectedPages: [],
    }),

  reset: () =>
    set({
      file: null,

      pdf: null,

      pageCount: 0,

      currentPage: 1,

      zoom: 100,

      rotation: 0,

      loading: false,

      error: null,

      selectedPages: [],
    }),
}));