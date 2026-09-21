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
import { protectPdf as protectWithAdobe } from "./adobe-services";

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

  try {
    return new Uint8Array(await protectWithAdobe(file.buffer, password));
  } catch {
    throw new PdfEngineError(
      "Unable to protect PDF."
    );
  }
}