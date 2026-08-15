import { PDFDocument } from "pdf-lib";

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

export interface PdfInfo {
  fileName: string;

  fileSize: number;

  pageCount: number;

  title?: string;

  author?: string;

  subject?: string;

  creator?: string;

  producer?: string;

  keywords?: string[];

  creationDate?: Date;

  modificationDate?: Date;

  isEncrypted: boolean;

  pageSizes: {
    page: number;
    width: number;
    height: number;
  }[];
}

export async function getPdfInfo(
  file: PdfFile
): Promise<PdfInfo> {
  validatePdf(file);

  let pdf: PDFDocument;

  if (!file.buffer) {
    throw new ValidationError(
      "Unable to open PDF."
    );
  }

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
      "Unable to open PDF."
    );
  }

  try {
    const pageSizes = pdf
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
        };
      });

    return {
      fileName: file.name,

      fileSize: file.size,

      pageCount:
        pageSizes.length,

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

      keywords: (() => {
        const keywords = pdf.getKeywords();

        if (!keywords) {
          return undefined;
        }

        return typeof keywords === "string"
          ? [keywords]
          : keywords;
      })(),

      creationDate:
        pdf.getCreationDate() ??
        undefined,

      modificationDate:
        pdf.getModificationDate() ??
        undefined,

      isEncrypted: false,

      pageSizes,
    };
  } catch {
    throw new PdfEngineError(
      "Unable to read PDF information."
    );
  }
}