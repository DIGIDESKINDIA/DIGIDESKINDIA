// File: lib/pdf/extract.ts

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { PDFDocument } from "pdf-lib";

import {
  ExtractOptions,
  PDFOperationResult,
} from "./types";

import {
  TEMP_OUTPUT_DIR,
} from "./constants";

/**
 * ==========================================================
 * Digital Desk India
 * PDF Extract Engine
 * ==========================================================
 */

export async function extractPDF(
  options: ExtractOptions
): Promise<PDFOperationResult> {
  try {
    await fs.mkdir(TEMP_OUTPUT_DIR, {
      recursive: true,
    });

    const inputPath = options.file.path;

    if (!inputPath) {
      throw new Error("Input file path is missing.");
    }

    const sourceBytes = await fs.readFile(inputPath);

    const sourcePdf =
      await PDFDocument.load(sourceBytes);

    const totalPages =
      sourcePdf.getPageCount();

    const pages = [...new Set(options.pages)]
      .filter(
        (page) =>
          page >= 1 &&
          page <= totalPages
      )
      .sort((a, b) => a - b);

    if (!pages.length) {
      throw new Error(
        "No valid pages selected."
      );
    }

    const newPdf =
      await PDFDocument.create();

    const copiedPages =
      await newPdf.copyPages(
        sourcePdf,
        pages.map((page) => page - 1)
      );

    copiedPages.forEach((page) =>
      newPdf.addPage(page)
    );

    const outputBytes =
      await newPdf.save();

    const outputName =
      `extract-${crypto.randomUUID()}.pdf`;

    const outputPath =
      path.join(
        TEMP_OUTPUT_DIR,
        outputName
      );

    await fs.writeFile(
      outputPath,
      outputBytes
    );

    return {
      success: true,
      operation: "extract",
      outputName,
      outputPath,
      message:
        "Pages extracted successfully.",
      metadata: {
        pages,
        totalExtracted:
          pages.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      operation: "extract",
      message:
        error instanceof Error
          ? error.message
          : "Extraction failed.",
    };
  }
}

/**
 * ==========================================================
 * Extract Every Page
 * ==========================================================
 */

export async function extractAllPages(
  options: ExtractOptions
): Promise<PDFOperationResult> {
  try {
    await fs.mkdir(TEMP_OUTPUT_DIR, {
      recursive: true,
    });

    const inputPath = options.file.path;

    if (!inputPath) {
      throw new Error("Input file path is missing.");
    }

    const bytes = await fs.readFile(inputPath);

    const pdf =
      await PDFDocument.load(bytes);

    const pageCount =
      pdf.getPageCount();

    const outputs: string[] = [];

    for (
      let index = 0;
      index < pageCount;
      index++
    ) {
      const document =
        await PDFDocument.create();

      const [page] =
        await document.copyPages(
          pdf,
          [index]
        );

      document.addPage(page);

      const pdfBytes =
        await document.save();

      const name =
        `page-${index + 1}-${crypto.randomUUID()}.pdf`;

      const file =
        path.join(
          TEMP_OUTPUT_DIR,
          name
        );

      await fs.writeFile(
        file,
        pdfBytes
      );

      outputs.push(file);
    }

    return {
      success: true,
      operation: "extract",
      outputName: "multiple",
      outputPath:
        TEMP_OUTPUT_DIR,
      message:
        "All pages extracted successfully.",
      metadata: {
        generatedFiles:
          outputs,
        totalPages:
          pageCount,
      },
    };
  } catch (error) {
    return {
      success: false,
      operation: "extract",
      message:
        error instanceof Error
          ? error.message
          : "Extraction failed.",
    };
  }
}

/**
 * ==========================================================
 * Metadata
 * ==========================================================
 */

export async function extractMetadata(
  options: ExtractOptions
) {
  const inputPath = options.file.path;

  if (!inputPath) {
    throw new Error("Input file path is missing.");
  }

  const bytes = await fs.readFile(inputPath);

  const pdf = await PDFDocument.load(bytes);

  return {
    totalPages:
      pdf.getPageCount(),
    selectedPages:
      options.pages,
    outputPages:
      options.pages.length,
  };
}

/**
 * ==========================================================
 * Validation
 * ==========================================================
 */

export function validateExtract(
  options: ExtractOptions
): boolean {
  return (
    options.file !== undefined &&
    Array.isArray(options.pages) &&
    options.pages.length > 0
  );
}