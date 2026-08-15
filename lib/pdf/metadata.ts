import { PDFDocument } from "pdf-lib";

import type {
  PdfFile,
  PdfMetadata,
} from "./types";

import {
  ValidationError,
  PdfEngineError,
} from "./errors";

import { validatePdf } from "./validation";

export async function updatePdfMetadata(
  file: PdfFile,
  metadata: PdfMetadata
): Promise<Uint8Array> {
  validatePdf(file);

  if (!file.buffer) {
    throw new ValidationError("PDF buffer is missing.");
  }

  let pdf: PDFDocument;

  try {
    pdf = await PDFDocument.load(file.buffer, {
      ignoreEncryption: false,
      updateMetadata: false,
    });
  } catch {
    throw new ValidationError(
      "Unable to read PDF."
    );
  }

  try {
    if (metadata.title) {
      pdf.setTitle(metadata.title);
    }

    if (metadata.author) {
      pdf.setAuthor(metadata.author);
    }

    if (metadata.subject) {
      pdf.setSubject(metadata.subject);
    }

    if (metadata.creator) {
      pdf.setCreator(metadata.creator);
    }

    if (metadata.producer) {
      pdf.setProducer(metadata.producer);
    }

    if (metadata.keywords?.length) {
      pdf.setKeywords(metadata.keywords);
    }

    pdf.setCreationDate(
      metadata.createdAt ?? new Date()
    );

    pdf.setModificationDate(
      metadata.modifiedAt ?? new Date()
    );

    return await pdf.save({
      useObjectStreams: true,
      addDefaultPage: false,
      updateFieldAppearances: false,
      objectsPerTick: 100,
    });
  } catch {
    throw new PdfEngineError(
      "Unable to update PDF metadata."
    );
  }
}