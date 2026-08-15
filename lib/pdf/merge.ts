// File: lib/pdf/merge.ts

import { PDFDocument } from "pdf-lib";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

import {
  MergeOptions,
  PDFOperationResult,
} from "./types";

import {
  TEMP_OUTPUT_DIR,
} from "./constants";

/**
 * ==========================================================
 * Digital Desk India
 * PDF Merge Engine
 * ==========================================================
 */

export async function mergePdfBuffers(
  buffers: Array<Uint8Array | Buffer>
): Promise<Buffer> {
  const mergedPdf = await PDFDocument.create();

  for (const buffer of buffers) {
    const pdf = await PDFDocument.load(buffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());

    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const mergedBytes = await mergedPdf.save();
  return Buffer.from(mergedBytes);
}

export async function mergePDF(
  options: MergeOptions
): Promise<PDFOperationResult> {

  try {

    if (!options.files.length) {
      throw new Error("No PDF files supplied.");
    }

    if (options.files.length < 2) {
      throw new Error(
        "At least two PDF files are required."
      );
    }

    await fs.mkdir(
      TEMP_OUTPUT_DIR,
      {
        recursive: true,
      }
    );

    const mergedPdf =
      await PDFDocument.create();

    let totalPages = 0;

    for (const file of options.files) {
      if (!file.path) {
        throw new Error("Missing PDF file path.");
      }

      const bytes =
        await fs.readFile(file.path);

      const pdf =
        await PDFDocument.load(bytes);

      const copiedPages =
        await mergedPdf.copyPages(
          pdf,
          pdf.getPageIndices()
        );

      copiedPages.forEach((page) => {
        mergedPdf.addPage(page);
      });

      totalPages += pdf.getPageCount();
    }

    const mergedBytes =
      await mergedPdf.save();

    const fileName =
      options.outputName ||
      `merged-${crypto.randomUUID()}.pdf`;

    const outputPath =
      path.join(
        TEMP_OUTPUT_DIR,
        fileName
      );

    await fs.writeFile(
      outputPath,
      mergedBytes
    );

    return {

      success: true,

      operation: "merge",

      outputName: fileName,

      outputPath,

      message:
        "PDF files merged successfully.",

      metadata: {

        filesMerged:
          options.files.length,

        totalPages,

      },

    };

  } catch (error) {

    return {

      success: false,

      operation: "merge",

      message:
        error instanceof Error
          ? error.message
          : "Unknown merge error.",

    };

  }

}

/**
 * ==========================================================
 * Validation
 * ==========================================================
 */

export function validateMergeFiles(
  options: MergeOptions
): boolean {

  return (
    options.files.length >= 2
  );

}

/**
 * ==========================================================
 * Merge Metadata
 * ==========================================================
 */

export async function mergeMetadata(
  options: MergeOptions
) {

  let pages = 0;

  let size = 0;

  for (const file of options.files) {
    if (!file.path) {
      throw new Error("Missing PDF file path.");
    }

    const buffer =
      await fs.readFile(file.path);

    const pdf =
      await PDFDocument.load(buffer);

    pages += pdf.getPageCount();

    size += file.size;

  }

  return {

    files:
      options.files.length,

    totalPages: pages,

    totalSize: size,

  };

}