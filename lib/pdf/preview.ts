import { PDFDocument } from "pdf-lib";

import type { PdfFile } from "./types";

import {
  ValidationError,
  PdfEngineError,
} from "./errors";

import { validatePdf } from "./validation";

export interface PdfPreviewPage {
  page: number;

  width: number;

  height: number;

  rotation: number;

  aspectRatio: number;

  /**
   * Reserved for future image renderer.
   */
  thumbnail?: string;
}

export interface PdfPreviewResult {
  pages: PdfPreviewPage[];

  totalPages: number;

  title?: string;

  author?: string;

  subject?: string;

  creator?: string;

  producer?: string;
}

export async function getPdfPreview(
  file: PdfFile
): Promise<PdfPreviewResult> {

  validatePdf(file);

  if (!file.buffer) {
    throw new ValidationError(
      "PDF buffer is missing."
    );
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

  try {
    const pages = pdf
      .getPages()
      .map((page, index) => {
        const size = page.getSize();

        return {
          page: index + 1,

          width: Math.round(
            size.width
          ),

          height: Math.round(
            size.height
          ),

          rotation:
            page
              .getRotation()
              .angle,

          aspectRatio: Number(
            (
              size.width /
              size.height
            ).toFixed(4)
          ),
        };
      });

    return {
      pages,

      totalPages:
        pages.length,

      title:
        pdf.getTitle() ??
        undefined,

      author:
        pdf.getAuthor() ??
        undefined,

      subject:
        pdf.getSubject() ??
        undefined,

      creator:
        pdf.getCreator() ??
        undefined,

      producer:
        pdf.getProducer() ??
        undefined,
    };
  } catch {
    throw new PdfEngineError(
      "Unable to generate PDF preview."
    );
  }
}