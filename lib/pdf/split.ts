// File: lib/pdf/split.ts

import { PDFDocument } from "pdf-lib";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

import {
  SplitOptions,
  PDFOperationResult,
} from "./types";

import {
  TEMP_OUTPUT_DIR,
} from "./constants";

/**
 * ==========================================================
 * Digital Desk India
 * PDF Split Engine
 * ==========================================================
 */

export async function splitPDF(
  options: SplitOptions
): Promise<PDFOperationResult> {

  try {

    await fs.mkdir(
      TEMP_OUTPUT_DIR,
      {
        recursive: true,
      }
    );

    if (!options.file.path) {
      throw new Error("File path is required.");
    }

    const sourceBytes =
      await fs.readFile(options.file.path);

    const sourcePdf =
      await PDFDocument.load(sourceBytes);

    const pageCount =
      sourcePdf.getPageCount();

    const pages = parseRanges(
      options.ranges,
      pageCount
    );

    if (!pages.length) {
      throw new Error(
        "No valid pages selected."
      );
    }

    const outputFiles: string[] = [];

    for (const pageNumber of pages) {

      const newPdf =
        await PDFDocument.create();

      const [page] =
        await newPdf.copyPages(
          sourcePdf,
          [pageNumber - 1]
        );

      newPdf.addPage(page);

      const pdfBytes =
        await newPdf.save();

      const outputName =
        `${crypto.randomUUID()}-page-${pageNumber}.pdf`;

      const outputPath =
        path.join(
          TEMP_OUTPUT_DIR,
          outputName
        );

      await fs.writeFile(
        outputPath,
        pdfBytes
      );

      outputFiles.push(outputPath);

    }

    return {

      success: true,

      operation: "split",

      outputName:
        options.file.name,

      outputPath:
        TEMP_OUTPUT_DIR,

      message:
        "PDF split successfully.",

      metadata: {

        pages,

        generatedFiles:
          outputFiles,

      },

    };

  } catch (error) {

    return {

      success: false,

      operation: "split",

      message:
        error instanceof Error
          ? error.message
          : "Unknown split error.",

    };

  }

}

/**
 * ==========================================================
 * Parse Page Ranges
 *
 * Supports:
 *
 * 1
 * 1,3,5
 * 1-5
 * 1-5,8,10-12
 *
 * ==========================================================
 */

export function parseRanges(
  input: string,
  maxPages: number
): number[] {

  const pages = new Set<number>();

  const chunks =
    input
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

  for (const chunk of chunks) {

    if (chunk.includes("-")) {

      const [start, end] =
        chunk.split("-");

      const from =
        Number(start);

      const to =
        Number(end);

      if (
        Number.isNaN(from) ||
        Number.isNaN(to)
      ) {
        continue;
      }

      for (
        let i = from;
        i <= to;
        i++
      ) {

        if (
          i >= 1 &&
          i <= maxPages
        ) {
          pages.add(i);
        }

      }

    } else {

      const page =
        Number(chunk);

      if (
        !Number.isNaN(page) &&
        page >= 1 &&
        page <= maxPages
      ) {
        pages.add(page);
      }

    }

  }

  return [...pages].sort(
    (a, b) => a - b
  );

}

/**
 * ==========================================================
 * Split Metadata
 * ==========================================================
 */

export async function splitMetadata(
  options: SplitOptions
) {

  if (!options.file.path) {
    throw new Error("File path is required.");
  }

  const bytes =
    await fs.readFile(
      options.file.path
    );

  const pdf =
    await PDFDocument.load(
      bytes
    );

  return {

    totalPages:
      pdf.getPageCount(),

    selectedPages:
      parseRanges(
        options.ranges,
        pdf.getPageCount()
      ),

  };

}

/**
 * ==========================================================
 * Validation
 * ==========================================================
 */

export function validateSplit(
  options: SplitOptions
): boolean {

  return (
    options.file != null &&
    options.ranges.trim().length > 0
  );

}