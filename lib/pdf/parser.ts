import {
  PDFDocument,
} from "pdf-lib";

import type {
  PdfFile,
} from "./types";

import {
  ValidationError,
  PdfEngineError,
} from "./errors";

import {
  validatePdf,
} from "./validation";

export interface ParsedPdf {
  pageCount: number;

  title?: string;

  author?: string;

  subject?: string;

  creator?: string;

  producer?: string;

  creationDate?: Date;

  modificationDate?: Date;

  isEncrypted: boolean;

  pages: {
    page: number;
    width: number;
    height: number;
    rotation: number;
  }[];
}

export async function parsePdf(
  file: PdfFile
): Promise<ParsedPdf> {

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
      "Unable to parse PDF."
    );
  }

  try {
    const pages = pdf
      .getPages()
      .map((page, index) => {
        const size =
          page.getSize();

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
        };
      });

    return {
      pageCount:
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

      creationDate:
        pdf.getCreationDate() ??
        undefined,

      modificationDate:
        pdf.getModificationDate() ??
        undefined,

      isEncrypted: false,

      pages,
    };
  } catch {
    throw new PdfEngineError(
      "Unable to read PDF information."
    );
  }
}