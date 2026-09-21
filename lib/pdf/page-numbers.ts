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
  position = "bottom-center",
  margins = "default",
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

  if (!Number.isInteger(startFrom) || startFrom < 1) {
    throw new ValidationError("Start number must be a positive integer.");
  }

  if (!Number.isFinite(fontSize) || fontSize < 8 || fontSize > 72) {
    throw new ValidationError("Font size must be between 8 and 72.");
  }

  const validPositions = new Set([
    "top-left",
    "top-center",
    "top-right",
    "bottom-left",
    "bottom-center",
    "bottom-right",
  ]);

  if (!validPositions.has(position)) {
    throw new ValidationError("Invalid page number position.");
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

      const margin =
        margins === "narrow"
          ? 18
          : margins === "wide"
            ? 54
            : 36;
      const isTop = position.startsWith("top-");
      const isRight = position.endsWith("-right");
      const isLeft = position.endsWith("-left");
      const resolvedX =
        position.endsWith("-center")
          ? width / 2 - textWidth / 2
          : isRight
            ? width - margin - textWidth
            : isLeft
              ? margin
              : x;
      const resolvedY = isTop
        ? page.getHeight() - margin - fontSize
        : position.startsWith("bottom-")
          ? margin
          : y;

      page.drawText(text, {
        x: resolvedX,
        y: resolvedY,
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