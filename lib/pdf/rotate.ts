// File: lib/pdf/rotate.ts

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { PDFDocument, degrees } from "pdf-lib";

import {
  RotateOptions,
  PDFOperationResult,
} from "./types";

import {
  TEMP_OUTPUT_DIR,
} from "./constants";

export async function rotatePDF(
  options: RotateOptions
): Promise<PDFOperationResult> {
  try {
    if (!options.file.path) {
      throw new Error("PDF path is missing.");
    }

    await fs.mkdir(TEMP_OUTPUT_DIR, {
      recursive: true,
    });

    const sourceBytes = await fs.readFile(
      options.file.path
    );

    const pdf = await PDFDocument.load(
      sourceBytes
    );

    const pages = pdf.getPages();

    const targetPages =
      options.pages && options.pages.length > 0
        ? options.pages
        : pages.map((_, index) => index + 1);

    for (const pageNumber of targetPages) {
      if (
        pageNumber < 1 ||
        pageNumber > pages.length
      ) {
        continue;
      }

      const page = pages[pageNumber - 1];

      page.setRotation(
        degrees(options.angle)
      );
    }

    const outputBytes =
      await pdf.save();

    const outputName =
      `rotated-${crypto.randomUUID()}.pdf`;

    const outputPath = path.join(
      TEMP_OUTPUT_DIR,
      outputName
    );

    await fs.writeFile(
      outputPath,
      outputBytes
    );

    return {
      success: true,
      operation: "rotate",
      outputName,
      outputPath,
      message: "PDF rotated successfully.",
      metadata: {
        angle: options.angle,
        pages: targetPages,
      },
    };
  } catch (error) {
    return {
      success: false,
      operation: "rotate",
      message:
        error instanceof Error
          ? error.message
          : "PDF rotation failed.",
    };
  }
}

export async function rotateAllPages(
  options: RotateOptions
) {
  return rotatePDF({
    ...options,
    pages: [],
  });
}

export async function rotateSinglePage(
  options: RotateOptions,
  page: number
) {
  return rotatePDF({
    ...options,
    pages: [page],
  });
}

export async function rotateMetadata(
  options: RotateOptions
) {
  if (!options.file.path) {
    throw new Error("PDF path is missing.");
  }

  const bytes = await fs.readFile(
    options.file.path
  );

  const pdf =
    await PDFDocument.load(bytes);

  return {
    totalPages: pdf.getPageCount(),
    rotatedPages:
      options.pages ??
      Array.from(
        {
          length: pdf.getPageCount(),
        },
        (_, i) => i + 1
      ),
    angle: options.angle,
  };
}

export function validateRotation(
  options: RotateOptions
): boolean {
  return (
    options.file != null &&
    [90, 180, 270].includes(
      options.angle
    )
  );
}