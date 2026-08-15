import {
  PDFDocument,
} from "pdf-lib";

import type {
  PdfFile,
} from "./types";

import {
  ValidationError,
} from "./errors";

import { validatePdf } from "./validation";

export interface PdfThumbnail {
  page: number;

  width: number;

  height: number;

  /**
   * Reserved for future renderer.
   */
  image?: Uint8Array;
}

export async function getPdfThumbnailInfo(
  file: PdfFile
): Promise<PdfThumbnail[]> {
  validatePdf(file);

  if (!file.buffer) {
    throw new ValidationError("File buffer is required.");
  }

  let pdf: PDFDocument;

  try {
    pdf = await PDFDocument.load(
      file.buffer,
      {
        ignoreEncryption: false,
        updateMetadata: false,
      }
    );
  } catch {
    throw new ValidationError(
      "Unable to read PDF."
    );
  }

  const pages =
    pdf.getPages();

  return pages.map(
    (
      page,
      index
    ) => {
      const size =
        page.getSize();

      return {
        page: index + 1,

        width:
          Math.round(
            size.width
          ),

        height:
          Math.round(
            size.height
          ),
      };
    }
  );
}