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

    const font = await pdf.embedFont(StandardFonts.HelveticaBold);

    let image;
    if (options.imagePath) {
      const imageBytes = await fs.readFile(options.imagePath);
      image = options.imagePath.toLowerCase().endsWith(".png")
        ? await pdf.embedPng(imageBytes)
        : await pdf.embedJpg(imageBytes);
    }

    const selectedPages = parsePageSelection(options.pages, pdf.getPageCount());

    const pages = pdf.getPages();

    for (const [pageIndex, page] of pages.entries()) {
      if (!selectedPages.has(pageIndex + 1)) continue;
      const { width, height } =
        page.getSize();

      const coordinates = getWatermarkPosition(options.position, width, height);

      if (image) {
        const scale = Math.min(160 / image.width, 100 / image.height);
        page.drawImage(image, { x: coordinates.x, y: coordinates.y, width: image.width * scale, height: image.height * scale, opacity: options.opacity ?? 0.25, rotate: degrees(options.rotation ?? 45) });
      } else {
        page.drawText(options.text, { x: coordinates.x, y: coordinates.y, size: options.fontSize ?? 48, font, color: parseColor(options.color), opacity: options.opacity ?? 0.25, rotate: degrees(options.rotation ?? 45) });
      }
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

function parsePageSelection(value: string | undefined, totalPages: number) {
  if (!value || value.trim().toLowerCase() === "all") return new Set(Array.from({ length: totalPages }, (_, index) => index + 1));
  const selected = new Set<number>();
  for (const part of value.split(",")) {
    const [start, end] = part.trim().split("-").map(Number);
    if (!Number.isFinite(start)) continue;
    const last = Number.isFinite(end) ? end : start;
    for (let page = Math.max(1, start); page <= Math.min(totalPages, last); page += 1) selected.add(page);
  }
  return selected;
}

function getWatermarkPosition(position: string | undefined, width: number, height: number) {
  const margin = 42;
  if (position === "top-left") return { x: margin, y: height - margin - 40 };
  if (position === "top-right") return { x: width / 2, y: height - margin - 40 };
  if (position === "bottom-left") return { x: margin, y: margin };
  if (position === "bottom-right") return { x: width / 2, y: margin };
  return { x: width / 5, y: height / 2 };
}

function parseColor(value: string | undefined) {
  const hex = /^#?([a-f\d]{6})$/i.exec(value ?? "#64748b")?.[1] ?? "64748b";
  return rgb(parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255);
}