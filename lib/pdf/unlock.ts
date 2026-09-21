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
import { unlockPdf as unlockWithAdobe } from "./adobe-services";

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

  try {
    return new Uint8Array(await unlockWithAdobe(file.buffer, password));
  } catch {
    throw new PdfEngineError(
      "Unable to unlock PDF."
    );
  }
}