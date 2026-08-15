import { PDFDocument } from "pdf-lib";

import type {
  UnlockOptions,
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
 * ----------------------------------------------------
 * DigiDesk India PDF Engine
 * Unlock PDF
 * ----------------------------------------------------
 *
 * pdf-lib cannot decrypt encrypted PDFs.
 *
 * This engine is intentionally separated so that
 * qpdf / PDFium / MuPDF can later replace the
 * internal implementation without changing
 * API routes or UI.
 *
 * ----------------------------------------------------
 */

export async function unlockPdf({
  file,
  password,
}: UnlockOptions): Promise<Uint8Array> {
  validatePdf(file);

  validatePassword(password);

  if (!file.buffer) {
    throw new ValidationError("File buffer is required.");
  }

  let pdf: PDFDocument;

  try {
    pdf = await PDFDocument.load(
      file.buffer,
      {
        ignoreEncryption: true,
        updateMetadata: false,
      }
    );
  } catch {
    throw new ValidationError(
      "Unable to open PDF."
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
     * Real password removal will be
     * implemented using qpdf in v2.
     */

    return await pdf.save({
      useObjectStreams: true,
      addDefaultPage: false,
      updateFieldAppearances: false,
      objectsPerTick: 100,
    });
  } catch {
    throw new PdfEngineError(
      "Unable to unlock PDF."
    );
  }
}