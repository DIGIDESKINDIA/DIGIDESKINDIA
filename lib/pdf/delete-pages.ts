import { PDFDocument } from "pdf-lib";

import type {
  DeletePagesOptions,
} from "./types";

import {
  ValidationError,
  PdfEngineError,
} from "./errors";

import {
  validatePdf,
  validatePageNumbers,
} from "./validation";

export async function deletePages({
  file,
  pages,
}: DeletePagesOptions): Promise<Uint8Array> {
  validatePdf(file);

  let pdf: PDFDocument;

  try {
    const pdfBuffer = file.buffer;

    if (!pdfBuffer) {
      throw new ValidationError(
        "PDF buffer is required."
      );
    }

    pdf = await PDFDocument.load(
      pdfBuffer,
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

  const totalPages =
    pdf.getPageCount();

  if (totalPages === 0) {
    throw new ValidationError(
      "PDF contains no pages."
    );
  }

  validatePageNumbers(
    pages,
    totalPages
  );

  if (
    pages.length >= totalPages
  ) {
    throw new ValidationError(
      "At least one page must remain."
    );
  }

  try {
    const indexes = [...pages]
      .map((page) => page - 1)
      .sort((a, b) => b - a);

    for (const index of indexes) {
      pdf.removePage(index);
    }

    pdf.setProducer(
      "DigiDesk India"
    );

    pdf.setCreator(
      "DigiDesk India PDF Engine"
    );

    pdf.setModificationDate(
      new Date()
    );

    return await pdf.save({
      useObjectStreams: true,
      addDefaultPage: false,
      updateFieldAppearances: false,
      objectsPerTick: 100,
    });
  } catch {
    throw new PdfEngineError(
      "Unable to delete PDF pages."
    );
  }
}