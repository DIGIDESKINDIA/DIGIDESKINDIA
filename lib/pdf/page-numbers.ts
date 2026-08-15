import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "pdf-lib";

import type {
  AddPageNumberOptions,
} from "./types";

import {
  ValidationError,
  PdfEngineError,
} from "./errors";

import {
  validatePdf,
  validatePageNumbers,
} from "./validation";

export async function addPageNumbers({
  file,
  pages,
  startFrom = 1,
  fontSize = 12,
  x = 0,
  y = 25,
}: AddPageNumberOptions): Promise<Uint8Array> {

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

  const font =
    await pdf.embedFont(
      StandardFonts.Helvetica
    );

  const targets =
    pages?.length
      ? pages
      : Array.from(
          {
            length: totalPages,
          },
          (_, i) => i + 1
        );

  validatePageNumbers(
    targets,
    totalPages
  );

  try {
    let number = startFrom;

    for (const pageNo of targets) {
      const page =
        pdf.getPage(
          pageNo - 1
        );

      const { width } =
        page.getSize();

      const text =
        String(number);

      const textWidth =
        font.widthOfTextAtSize(
          text,
          fontSize
        );

      page.drawText(text, {
        x:
          x === 0
            ? width / 2 -
              textWidth / 2
            : x,
        y,
        size: fontSize,
        font,
        color: rgb(
          0,
          0,
          0
        ),
      });

      number++;
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
      "Unable to add page numbers."
    );
  }
}