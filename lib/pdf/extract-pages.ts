import { PDFDocument } from "pdf-lib";

import type {
  ExtractPagesOptions,
} from "./types";

import {
  ValidationError,
  PdfEngineError,
} from "./errors";

import {
  validatePdf,
  validatePageNumbers,
} from "./validation";

export async function extractPages({
  file,
  pages,
}: ExtractPagesOptions): Promise<Uint8Array> {
  validatePdf(file);

  let source: PDFDocument;

  try {
    const pdfBuffer = file.buffer;

    if (!pdfBuffer) {
      throw new ValidationError(
        "PDF buffer is required."
      );
    }

    source = await PDFDocument.load(
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
    source.getPageCount();

  if (totalPages === 0) {
    throw new ValidationError(
      "PDF contains no pages."
    );
  }

  validatePageNumbers(
    pages,
    totalPages
  );

  try {
    const output =
      await PDFDocument.create();

    const copied =
      await output.copyPages(
        source,
        pages.map(
          (page) => page - 1
        )
      );

    copied.forEach((page) =>
      output.addPage(page)
    );

    output.setProducer(
      "DigiDesk India"
    );

    output.setCreator(
      "DigiDesk India PDF Engine"
    );

    output.setModificationDate(
      new Date()
    );

    return await output.save({
      useObjectStreams: true,
      addDefaultPage: false,
      updateFieldAppearances: false,
      objectsPerTick: 100,
    });
  } catch {
    throw new PdfEngineError(
      "Unable to extract PDF pages."
    );
  }
}