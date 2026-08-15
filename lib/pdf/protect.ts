import { PDFDocument } from "pdf-lib";

import type {
  ProtectOptions,
} from "./types";

import {
  ValidationError,
  PdfEngineError,
} from "./errors";

import {
  validatePdf,
  validatePassword,
} from "./validation";

/**
 * NOTE
 *
 * pdf-lib currently does NOT support
 * password-protecting PDFs.
 *
 * This file is only an abstraction layer.
 * Later a backend like qpdf/pdfcpu can
 * be integrated without changing the API.
 */

export async function protectPdf({
  file,
  password,
}: ProtectOptions): Promise<Uint8Array> {

  validatePdf(file);

  validatePassword(password);

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
    pdf.setProducer(
      "DigiDesk India"
    );

    pdf.setCreator(
      "DigiDesk India PDF Engine"
    );

    pdf.setModificationDate(
      new Date()
    );

    /**
     * Password encryption
     * will be implemented
     * when a dedicated PDF
     * encryption engine is added.
     */

    return await pdf.save({
      useObjectStreams: true,
      addDefaultPage: false,
      updateFieldAppearances: false,
      objectsPerTick: 100,
    });
  } catch {
    throw new PdfEngineError(
      "Unable to protect PDF."
    );
  }
}