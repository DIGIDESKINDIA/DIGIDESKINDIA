// File: lib/pdf/watermark.ts

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

import {
  PDFDocument,
  rgb,
  StandardFonts,
  degrees,
} from "pdf-lib";

import {
  WatermarkOptions,
  PDFOperationResult,
} from "./types";

import {
  TEMP_OUTPUT_DIR,
} from "./constants";

/**
 * ==========================================================
 * Digital Desk India
 * PDF Watermark Engine
 * ==========================================================
 */

export async function watermarkPDF(options: WatermarkOptions): Promise<PDFOperationResult> {
  return addWatermark(options);
}

export async function addWatermark(
  options: WatermarkOptions
): Promise<PDFOperationResult> {
  try {
    await fs.mkdir(TEMP_OUTPUT_DIR, {
      recursive: true,
    });

    if (!options.file.path) {
      throw new Error("File path is required.");
    }

    const pdfBytes = await fs.readFile(
      options.file.path
    );

    const pdf =
      await PDFDocument.load(pdfBytes);

    const font =
      await pdf.embedFont(
        StandardFonts.HelveticaBold
      );

    const pages = pdf.getPages();

    for (const page of pages) {
      const { width, height } =
        page.getSize();

      page.drawText(options.text, {
        x: width / 5,
        y: height / 2,
        size:
          options.fontSize ?? 48,
        font,
        color: rgb(
          0.55,
          0.55,
          0.55
        ),
        opacity:
          options.opacity ?? 0.25,
        rotate: degrees(
          options.rotation ?? 45
        ),
      });
    }

    const output =
      await pdf.save();

    const outputName =
      `watermark-${crypto.randomUUID()}.pdf`;

    const outputPath =
      path.join(
        TEMP_OUTPUT_DIR,
        outputName
      );

    await fs.writeFile(
      outputPath,
      output
    );

    return {
      success: true,
      operation: "watermark",
      outputName,
      outputPath,
      message:
        "Watermark added successfully.",
      metadata: {
        pages: pages.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      operation: "watermark",
      message:
        error instanceof Error
          ? error.message
          : "Watermark failed.",
    };
  }
}

/**
 * ==========================================================
 * Validation
 * ==========================================================
 */

export function validateWatermark(
  options: WatermarkOptions
): boolean {
  return (
    options.file !== undefined &&
    options.text.trim().length > 0
  );
}

/**
 * ==========================================================
 * Metadata
 * ==========================================================
 */

export async function watermarkMetadata(
  options: WatermarkOptions
) {
  if (!options.file.path) {
    throw new Error("File path is required.");
  }

  const bytes =
    await fs.readFile(
      options.file.path
    );

  const pdf =
    await PDFDocument.load(bytes);

  return {
    totalPages:
      pdf.getPageCount(),
    text:
      options.text,
    opacity:
      options.opacity ?? 0.25,
    rotation:
      options.rotation ?? 45,
  };
}