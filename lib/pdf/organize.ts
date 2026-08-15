import { PDFDocument } from "pdf-lib";

import type { PdfFile } from "./types";

import {
  ValidationError,
  PdfEngineError,
} from "./errors";

import {
  validatePdf,
  validatePageNumbers,
} from "./validation";

export interface OrganizePdfOptions {
  file: PdfFile;

  /**
   * New page order
   * Example:
   * [3,1,2]
   */
  order: number[];
}

export async function organizePdf({
  file,
  order,
}: OrganizePdfOptions): Promise<Uint8Array> {
  validatePdf(file);

  if (!file.buffer) {
    throw new ValidationError("PDF buffer is missing.");
  }

  let source: PDFDocument;

  try {
    source = await PDFDocument.load(file.buffer, {
      ignoreEncryption: false,
      updateMetadata: false,
    });
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
    order,
    totalPages
  );

  if (
    new Set(order).size !==
    order.length
  ) {
    throw new ValidationError(
      "Duplicate pages are not allowed."
    );
  }

  try {
    const output =
      await PDFDocument.create();

    const copied =
      await output.copyPages(
        source,
        order.map(
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
      "Unable to organize PDF pages."
    );
  }
}