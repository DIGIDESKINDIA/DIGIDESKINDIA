// File: lib/pdf/thumbnails.ts

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { execa } from "execa";

import {
  ThumbnailOptions,
  PDFOperationResult,
} from "./types";

import {
  TEMP_OUTPUT_DIR,
} from "./constants";

/**
 * ==========================================================
 * Digital Desk India
 * PDF Thumbnail Engine
 *
 * Backend:
 * Poppler (pdftoppm)
 * ==========================================================
 */

const DEFAULT_DPI = 180;

export async function generateThumbnail(
  options: ThumbnailOptions
): Promise<PDFOperationResult> {

  try {

    await fs.mkdir(
      TEMP_OUTPUT_DIR,
      {
        recursive: true,
      }
    );

    const folder =
      path.join(
        TEMP_OUTPUT_DIR,
        crypto.randomUUID()
      );

    await fs.mkdir(folder);

    if (!options.file.path) {
      throw new Error("File path is required.");
    }

    const outputPrefix =
      path.join(
        folder,
        "thumb"
      );

    await execa(
      "pdftoppm",
      [
        "-png",

        "-f",
        "1",

        "-singlefile",

        "-r",
        String(
          options.dpi ??
          DEFAULT_DPI
        ),

        options.file.path,

        outputPrefix,
      ]
    );

    const thumbnail =
      `${outputPrefix}.png`;

    await fs.access(thumbnail);

    return {

      success: true,

      operation: "thumbnail",

      outputName: "thumb.png",

      outputPath: thumbnail,

      message:
        "Thumbnail generated successfully.",

      metadata: {

        dpi:
          options.dpi ??
          DEFAULT_DPI,

      },

    };

  } catch (error) {

    return {

      success: false,

      operation: "thumbnail",

      message:
        error instanceof Error
          ? error.message
          : "Thumbnail generation failed.",

    };

  }

}

/**
 * ==========================================================
 * Multi-page Thumbnails
 * ==========================================================
 */

export async function generateAllThumbnails(
  options: ThumbnailOptions
): Promise<PDFOperationResult> {

  try {

    await fs.mkdir(
      TEMP_OUTPUT_DIR,
      {
        recursive: true,
      }
    );

    const folder =
      path.join(
        TEMP_OUTPUT_DIR,
        crypto.randomUUID()
      );

    await fs.mkdir(folder);

    if (!options.file.path) {
      throw new Error("File path is required.");
    }

    const outputPrefix =
      path.join(
        folder,
        "page"
      );

    await execa(
      "pdftoppm",
      [
        "-png",

        "-r",
        String(
          options.dpi ??
          DEFAULT_DPI
        ),

        options.file.path,

        outputPrefix,
      ]
    );

    const files =
      await fs.readdir(folder);

    return {

      success: true,

      operation: "thumbnail",

      outputName:
        "multiple",

      outputPath:
        folder,

      message:
        "All thumbnails generated successfully.",

      metadata: {

        pages:
          files.length,

        files,

      },

    };

  } catch (error) {

    return {

      success: false,

      operation: "thumbnail",

      message:
        error instanceof Error
          ? error.message
          : "Thumbnail generation failed.",

    };

  }

}

/**
 * ==========================================================
 * Validation
 * ==========================================================
 */

export function validateThumbnail(
  options: ThumbnailOptions
): boolean {

  return (
    options.file !== undefined
  );

}

/**
 * ==========================================================
 * Metadata
 * ==========================================================
 */

export async function thumbnailMetadata(
  options: ThumbnailOptions
) {

  if (!options.file.path) {
    throw new Error("File path is required.");
  }

  const stat =
    await fs.stat(
      options.file.path
    );

  return {

    originalName:
      options.file.name,

    originalSize:
      stat.size,

    dpi:
      options.dpi ??
      DEFAULT_DPI,

  };

}