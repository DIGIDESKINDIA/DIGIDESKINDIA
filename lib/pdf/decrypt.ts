// File: lib/pdf/decrypt.ts

import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { execa } from "execa";

import {
  DecryptOptions,
  PDFOperationResult,
} from "./types";

import {
  TEMP_OUTPUT_DIR,
} from "./constants";

/**
 * ==========================================================
 * Digital Desk India
 * PDF Unlock Engine
 *
 * Backend:
 * qpdf
 *
 * Removes password from encrypted PDFs.
 * ==========================================================
 */

export async function decryptPDF(
  options: DecryptOptions
): Promise<PDFOperationResult> {
  try {
    if (!options.password.trim()) {
      throw new Error("Password is required.");
    }

    await fs.mkdir(TEMP_OUTPUT_DIR, {
      recursive: true,
    });

    const outputName =
      `unlocked-${crypto.randomUUID()}.pdf`;

    const outputPath = path.join(
      TEMP_OUTPUT_DIR,
      outputName
    );

    const inputPath = options.file.path;

    if (!inputPath) {
      throw new Error("Input file path is missing.");
    }

    await execa(
      "qpdf",
      [
        `--password=${options.password}`,
        "--decrypt",
        inputPath,
        outputPath,
      ],
      {
        shell: false,
      }
    );

    const stats = await fs.stat(outputPath);

    return {
      success: true,

      operation: "decrypt",

      outputName,

      outputPath,

      message:
        "PDF unlocked successfully.",

      metadata: {
        algorithmRemoved: "AES-256",

        outputSize: stats.size,
      },
    };
  } catch (error) {
    return {
      success: false,

      operation: "decrypt",

      message:
        error instanceof Error
          ? error.message
          : "Unable to unlock PDF.",
    };
  }
}

/**
 * ==========================================================
 * Validation
 * ==========================================================
 */

export function validateDecrypt(
  options: DecryptOptions
): boolean {
  return (
    options.file !== undefined &&
    options.password.trim().length > 0
  );
}

/**
 * ==========================================================
 * Metadata
 * ==========================================================
 */

export async function decryptMetadata(
  options: DecryptOptions
) {
  const inputPath = options.file.path;

  if (!inputPath) {
    throw new Error("Input file path is missing.");
  }

  const stats = await fs.stat(inputPath);

  return {
    originalName:
      options.file.name,

    originalSize:
      stats.size,

    passwordLength:
      options.password.length,

    operation:
      "decrypt",
  };
}

/**
 * ==========================================================
 * Verify Password
 * ==========================================================
 */

export async function verifyPDFPassword(
  filePath: string,
  password: string
): Promise<boolean> {
  try {
    await execa(
      "qpdf",
      [
        `--password=${password}`,
        "--check",
        filePath,
      ],
      {
        shell: false,
      }
    );

    return true;
  } catch {
    return false;
  }
}