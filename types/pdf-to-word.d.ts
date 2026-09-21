// Ambient declarations for modules that ship without first-class TS types
// in the exact subpath form used by the PDF-to-Word engine.

declare module "pdfjs-dist/legacy/build/pdf.mjs" {
  export * from "pdfjs-dist";
}

declare module "pdfjs-dist/legacy/build/pdf.js" {
  export * from "pdfjs-dist";
}

declare module "tesseract.js" {
  export interface TesseractWorker {
    recognize(
      image: string | Buffer | Uint8Array,
      options?: Record<string, unknown>
    ): Promise<{
      data: { text: string; confidence: number; lines?: unknown[] };
    }>;
    terminate(): Promise<void>;
  }

  export function createWorker(
    langs?: string,
    oem?: number,
    options?: {
      langPath?: string;
      cachePath?: string;
      cacheMethod?: string;
      gzip?: boolean;
      errorHandler?: (error: unknown) => void;
      logger?: (message: { status: string; progress: number }) => void;
    }
  ): Promise<TesseractWorker>;

  export const OEM: {
    LSTM_ONLY: number;
  };

  export const PSM: Record<string, number>;
}